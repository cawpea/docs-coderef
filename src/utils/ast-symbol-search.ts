/**
 * AST解析によるシンボル検索ユーティリティ
 */

import * as path from 'path';

import { parse as parseTypeScript } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

import type { SymbolMatch } from './types';

/**
 * ASTキャッシュ（同じファイルを複数回パースしない）
 */
const astCache = new Map<string, TSESTree.Program>();

/**
 * ファイルがTypeScript/JavaScriptかどうかを判定
 */
export function isTypeScriptOrJavaScript(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext);
}

/**
 * ASTをパースまたはキャッシュから取得
 */
function getOrParseAST(filePath: string, fileContent: string): TSESTree.Program {
  if (astCache.has(filePath)) {
    return astCache.get(filePath)!;
  }

  const ast = parseTypeScript(fileContent, {
    loc: true,
    range: true,
    comment: true,
    jsx: filePath.endsWith('.tsx') || filePath.endsWith('.jsx'),
  });

  astCache.set(filePath, ast);
  return ast;
}

/**
 * JSDocコメントを含む開始行を取得
 */
function getStartLineWithJSDoc(node: TSESTree.Node, fileContent: string): number {
  if (!node.loc) return 1;

  const lines = fileContent.split('\n');
  let startLine = node.loc.start.line;

  // ノードの直前の行から上に向かってJSDocを探す
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
 * クラス名でクラスを検索
 */
function findClassByName(ast: TSESTree.Program, className: string): TSESTree.ClassDeclaration[] {
  const classes: TSESTree.ClassDeclaration[] = [];

  function visit(node: TSESTree.Node) {
    if (node.type === 'ClassDeclaration' && node.id && node.id.name === className) {
      classes.push(node);
    }

    // 子ノードを再帰的に探索
    const keys = Object.keys(node) as Array<keyof TSESTree.Node>;
    for (const key of keys) {
      const value = node[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach((child) => {
            if (child && typeof child === 'object' && 'type' in child) {
              visit(child as TSESTree.Node);
            }
          });
        } else if ('type' in value) {
          visit(value as TSESTree.Node);
        }
      }
    }
  }

  visit(ast);
  return classes;
}

/**
 * クラス内のメソッドを検索
 */
function findMethodInClass(
  classNode: TSESTree.ClassDeclaration,
  methodName: string
): TSESTree.MethodDefinition | null {
  if (!classNode.body || !classNode.body.body) return null;

  for (const member of classNode.body.body) {
    if (member.type === 'MethodDefinition' && member.key.type === 'Identifier') {
      if (member.key.name === methodName) {
        return member;
      }
    }
  }

  return null;
}

/**
 * トップレベル関数を検索
 */
function findFunctionByName(
  ast: TSESTree.Program,
  functionName: string
): TSESTree.FunctionDeclaration[] {
  const functions: TSESTree.FunctionDeclaration[] = [];

  // トップレベルの関数のみ検索
  for (const statement of ast.body) {
    if (
      statement.type === 'FunctionDeclaration' &&
      statement.id &&
      statement.id.name === functionName
    ) {
      functions.push(statement);
    } else if (statement.type === 'ExportNamedDeclaration' && statement.declaration) {
      const decl = statement.declaration;
      if (decl.type === 'FunctionDeclaration' && decl.id && decl.id.name === functionName) {
        functions.push(decl);
      }
    }
  }

  return functions;
}

/**
 * シンボルパスをパースしてクラス名とメンバー名に分割
 */
export function parseSymbolPath(symbolPath: string): {
  className?: string;
  memberName: string;
} {
  const parts = symbolPath.split('#');
  if (parts.length === 1) {
    // 関数のみ: "functionName"
    return { memberName: parts[0].trim() };
  } else if (parts.length === 2) {
    // クラス+メソッド: "ClassName#methodName"
    return {
      className: parts[0].trim(),
      memberName: parts[1].trim(),
    };
  }
  throw new Error(`Invalid symbol path: ${symbolPath}`);
}

/**
 * ASTを使ってシンボルを検索
 */
export function findSymbolInAST(
  fileContent: string,
  filePath: string,
  options: {
    className?: string;
    memberName: string;
  }
): SymbolMatch[] {
  // TypeScript/JavaScriptファイルのみ
  if (!isTypeScriptOrJavaScript(filePath)) {
    throw new Error('TypeScript/JavaScript files only');
  }

  const ast = getOrParseAST(filePath, fileContent);
  const matches: SymbolMatch[] = [];

  if (options.className) {
    // クラス+メソッドを検索
    const classes = findClassByName(ast, options.className);

    for (const classNode of classes) {
      const method = findMethodInClass(classNode, options.memberName);
      if (method && method.loc) {
        matches.push({
          className: options.className,
          memberName: options.memberName,
          startLine: getStartLineWithJSDoc(method, fileContent),
          endLine: method.loc.end.line,
          scopeType: 'method',
          confidence: 'high',
        });
      }
    }
  } else {
    // 関数を検索（トップレベル）
    const functions = findFunctionByName(ast, options.memberName);

    for (const funcNode of functions) {
      if (funcNode.loc) {
        matches.push({
          memberName: options.memberName,
          startLine: getStartLineWithJSDoc(funcNode, fileContent),
          endLine: funcNode.loc.end.line,
          scopeType: 'function',
          confidence: 'high',
        });
      }
    }
  }

  return matches;
}

/**
 * 複数マッチ時の最適な選択
 */
export function selectBestSymbolMatch(
  matches: SymbolMatch[],
  hintLines?: { start: number; end: number }
): SymbolMatch | null {
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  // 行番号ヒントがある場合、最も近いものを選択
  if (hintLines) {
    return matches.reduce((best, current) => {
      const bestDistance = Math.abs(best.startLine - hintLines.start);
      const currentDistance = Math.abs(current.startLine - hintLines.start);
      return currentDistance < bestDistance ? current : best;
    });
  }

  // 信頼度が最も高いものを選択
  const confidenceScore = { high: 3, medium: 2, low: 1 };
  return matches.sort((a, b) => confidenceScore[b.confidence] - confidenceScore[a.confidence])[0];
}

/**
 * ASTキャッシュをクリア
 */
export function clearASTCache(): void {
  astCache.clear();
}
