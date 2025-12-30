/**
 * コード省略表示ユーティリティ
 */

import * as fs from 'fs';

import { parse as parseTypeScript } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

import { isTypeScriptOrJavaScript } from '@/utils/ast-symbol-search';

const ELLIPSIS = '  // ... (省略) ...';

/**
 * クラスメンバー情報
 */
interface ClassMember {
  name: string;
  startLine: number;
  endLine: number;
  type: 'method' | 'property' | 'constructor';
}

/**
 * ASTからクラスノードを検索
 */
function findClassNode(fileContent: string, className: string): TSESTree.ClassDeclaration | null {
  const ast = parseTypeScript(fileContent, {
    loc: true,
    range: true,
    jsx: fileContent.includes('tsx') || fileContent.includes('jsx'),
  });

  function visit(node: TSESTree.Node): TSESTree.ClassDeclaration | null {
    if (node.type === 'ClassDeclaration' && node.id?.name === className) {
      return node;
    }

    // 子ノードを再帰的に探索
    const keys = Object.keys(node) as (keyof TSESTree.Node)[];
    for (const key of keys) {
      const value = node[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const child of value) {
            if (child && typeof child === 'object' && 'type' in child) {
              const found = visit(child as TSESTree.Node);
              if (found) return found;
            }
          }
        } else if ('type' in value) {
          const found = visit(value as TSESTree.Node);
          if (found) return found;
        }
      }
    }

    return null;
  }

  return visit(ast);
}

/**
 * クラス内のメンバーを取得
 */
function getClassMembers(classNode: TSESTree.ClassDeclaration): ClassMember[] {
  const members: ClassMember[] = [];

  if (!classNode.body?.body) {
    return members;
  }

  for (const member of classNode.body.body) {
    if (!member.loc) continue;

    if (member.type === 'MethodDefinition') {
      const name =
        member.key.type === 'Identifier'
          ? member.key.name
          : member.kind === 'constructor'
            ? 'constructor'
            : 'unknown';

      members.push({
        name,
        startLine: member.loc.start.line,
        endLine: member.loc.end.line,
        type: member.kind === 'constructor' ? 'constructor' : 'method',
      });
    } else if (member.type === 'PropertyDefinition') {
      const name = member.key.type === 'Identifier' ? member.key.name : 'unknown';

      members.push({
        name,
        startLine: member.loc.start.line,
        endLine: member.loc.end.line,
        type: 'property',
      });
    }
  }

  return members;
}

/**
 * JSDocコメントを含む開始行を取得
 */
function getStartLineWithJSDoc(startLine: number, lines: string[]): number {
  // 開始行の直前から上に向かってJSDocを探す
  for (let i = startLine - 2; i >= 0; i--) {
    const line = lines[i].trim();

    // JSDocの終わり（*/）を見つけた場合
    if (line.endsWith('*/')) {
      // さらに上に向かってJSDocの始まり（/**）を探す
      for (let j = i; j >= 0; j--) {
        const docLine = lines[j].trim();
        if (docLine.startsWith('/**')) {
          return j + 1; // 1-indexed
        }
      }
      break;
    }

    // 空行やコメントでない行が見つかったら終了
    if (line.length > 0 && !line.startsWith('//')) {
      break;
    }
  }

  return startLine;
}

/**
 * コードに省略記号を挿入
 */
export function insertEllipsis(
  filePath: string,
  options: {
    className?: string;
    memberName: string;
  }
): string {
  // TypeScript/JavaScriptファイルのみ
  if (!isTypeScriptOrJavaScript(filePath)) {
    throw new Error('TypeScript/JavaScript files only');
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  if (options.className) {
    // クラス内のメソッドのみ表示
    const classNode = findClassNode(fileContent, options.className);
    if (!classNode?.loc) {
      // クラスが見つからない場合は元のファイル内容を返す
      return fileContent;
    }

    const result: string[] = [];
    const members = getClassMembers(classNode);

    // クラス宣言行を取得（export class ClassName { の行）
    const classStartLine = classNode.loc.start.line;
    const classEndLine = classNode.loc.end.line;

    // クラス宣言の開始行を追加
    result.push(lines[classStartLine - 1]);

    let lastEndLine = classStartLine;
    let hasAddedEllipsis = false;

    for (const member of members) {
      if (member.name === options.memberName) {
        // ターゲットメソッド: JSDocコメントを含めて完全に表示
        const memberStartWithJSDoc = getStartLineWithJSDoc(member.startLine, lines);

        // 前のメンバーとの間に省略記号を挿入（まだ追加していない場合）
        if (lastEndLine < memberStartWithJSDoc && !hasAddedEllipsis) {
          result.push('');
          result.push(ELLIPSIS);
          result.push('');
          hasAddedEllipsis = true;
        }

        // ターゲットメソッドを追加
        for (let i = memberStartWithJSDoc - 1; i < member.endLine; i++) {
          result.push(lines[i]);
        }

        lastEndLine = member.endLine;
        hasAddedEllipsis = false;
      } else {
        // 他のメンバー: 省略（省略記号は一度だけ追加）
        if (!hasAddedEllipsis && lastEndLine < member.endLine) {
          hasAddedEllipsis = true;
        }
        lastEndLine = member.endLine;
      }
    }

    // 最後のメンバーの後に省略記号を追加（必要な場合）
    if (hasAddedEllipsis && lastEndLine < classEndLine - 1) {
      result.push('');
      result.push(ELLIPSIS);
      result.push('');
    }

    // クラスの閉じ括弧を追加
    result.push(lines[classEndLine - 1]);

    return result.join('\n');
  } else {
    // 関数のみ表示（前後のコンテキストは省略）
    // この場合は、シンボル検索で見つかった範囲のみを返す
    // 実装が必要な場合は追加
    return fileContent;
  }
}

/**
 * 省略表示されたコードから省略記号を除去
 */
export function removeEllipsis(code: string): string {
  return code
    .split('\n')
    .filter((line) => !line.trim().includes('// ... (省略) ...'))
    .join('\n');
}
