/**
 * AST解析によるスコープ拡張ユーティリティ
 */

import * as path from 'path';

import { parse as parseTypeScript } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

import type { ExpandedMatch } from '@/utils/types';

/**
 * マッチ拡張のオプション
 */
export interface MatchExpansionOptions {
  filePath: string;
  originalMatch: { start: number; end: number };
  fileContent: string;
}

/**
 * AST拡張の結果
 */
interface ASTExpansionResult {
  success: boolean;
  expandedMatches?: ExpandedMatch[];
  error?: string;
}

/**
 * ファイルがTypeScript/JavaScriptかどうかを判定
 */
function isTypeScriptOrJavaScript(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext);
}

/**
 * マッチ位置を含むASTノードを見つける
 */
function findNodeAtLine(ast: TSESTree.Program, targetLine: number): TSESTree.Node | null {
  let foundNode: TSESTree.Node | null = null;

  function visit(node: TSESTree.Node) {
    if (!node.loc) return;

    const nodeStart = node.loc.start.line;
    const nodeEnd = node.loc.end.line;

    // ターゲット行がノードの範囲内にある場合
    if (nodeStart <= targetLine && targetLine <= nodeEnd) {
      foundNode = node;

      // 子ノードを探索（より具体的なノードを見つけるため）
      const keys = Object.keys(node) as (keyof TSESTree.Node)[];
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
  }

  visit(ast);
  return foundNode;
}

/**
 * ノードのスコープタイプを判定
 */
function getScopeType(node: TSESTree.Node): ExpandedMatch['scopeType'] {
  switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
    case 'MethodDefinition':
      return 'function';
    case 'ClassDeclaration':
    case 'ClassExpression':
      return 'class';
    case 'TSInterfaceDeclaration':
      return 'interface';
    case 'TSTypeAliasDeclaration':
      return 'type';
    case 'VariableDeclaration':
      return 'const';
    default:
      return 'unknown';
  }
}

/**
 * ノードの親スコープを探索
 */
function findParentScope(ast: TSESTree.Program, targetNode: TSESTree.Node): TSESTree.Node | null {
  let parentScope: TSESTree.Node | null = null;
  let currentDepth = 0;
  let targetDepth = -1;

  function visit(node: TSESTree.Node, depth: number) {
    const isScope =
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression' ||
      node.type === 'MethodDefinition' ||
      node.type === 'ClassDeclaration' ||
      node.type === 'ClassExpression' ||
      node.type === 'TSInterfaceDeclaration' ||
      node.type === 'TSTypeAliasDeclaration' ||
      (node.type === 'VariableDeclaration' && node.parent?.type === 'ExportNamedDeclaration');

    if (node === targetNode) {
      targetDepth = depth;
      return;
    }

    if (targetDepth === -1 && node.loc && targetNode.loc) {
      const nodeStart = node.loc.start.line;
      const nodeEnd = node.loc.end.line;
      const targetStart = targetNode.loc.start.line;
      const targetEnd = targetNode.loc.end.line;

      // ターゲットノードがこのノードの範囲内にある場合
      if (nodeStart <= targetStart && targetEnd <= nodeEnd && isScope && depth > currentDepth) {
        parentScope = node;
        currentDepth = depth;
      }
    }

    // 子ノードを探索
    const keys = Object.keys(node) as (keyof TSESTree.Node)[];
    for (const key of keys) {
      const value = node[key];
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach((child) => {
            if (child && typeof child === 'object' && 'type' in child) {
              visit(child as TSESTree.Node, depth + 1);
            }
          });
        } else if ('type' in value) {
          visit(value as TSESTree.Node, depth + 1);
        }
      }
    }
  }

  visit(ast, 0);
  return parentScope;
}

/**
 * JSDocコメントを含めた開始位置を取得
 */
function getStartLineWithJSDoc(node: TSESTree.Node, fileContent: string): number {
  if (!node.loc) return 1; // locがない場合は1行目を返す

  const nodeStartLine = node.loc.start.line;
  const lines = fileContent.split('\n');

  // ノードの直前の行から逆順に探索
  for (let i = nodeStartLine - 2; i >= 0; i--) {
    const line = lines[i].trim();

    // JSDocコメントの終了を見つけた
    if (line.endsWith('*/')) {
      // JSDocコメントの開始を探す
      for (let j = i; j >= 0; j--) {
        if (lines[j].trim().startsWith('/**')) {
          return j + 1; // 1-indexed
        }
      }
    }

    // 空行またはコメント以外があったら終了
    if (line && !line.startsWith('//') && !line.startsWith('*')) {
      break;
    }
  }

  return nodeStartLine;
}

/**
 * AST解析によるスコープ拡張を試みる
 */
function tryASTExpansion(
  filePath: string,
  originalMatch: { start: number; end: number },
  fileContent: string
): ASTExpansionResult {
  try {
    // TypeScript/JavaScriptファイルのみ処理
    if (!isTypeScriptOrJavaScript(filePath)) {
      return { success: false, error: 'Not a TypeScript/JavaScript file' };
    }

    // ASTをパース
    const ast = parseTypeScript(fileContent, {
      loc: true,
      range: true,
      comment: true,
      tokens: true,
    });

    // マッチ位置のノードを見つける
    const matchStartNode = findNodeAtLine(ast, originalMatch.start);
    const matchEndNode = findNodeAtLine(ast, originalMatch.end);

    if (!matchStartNode || !matchEndNode) {
      return { success: false, error: 'Node not found at match position' };
    }

    // より具体的なノード（小さい方）を選択
    const targetNode =
      matchStartNode.loc && matchEndNode.loc
        ? matchStartNode.loc.end.line - matchStartNode.loc.start.line <
          matchEndNode.loc.end.line - matchEndNode.loc.start.line
          ? matchStartNode
          : matchEndNode
        : matchStartNode;

    // 親スコープを探索
    const parentScope = findParentScope(ast, targetNode);

    if (!parentScope?.loc) {
      // 親スコープが見つからない場合、元のマッチを返す
      return {
        success: true,
        expandedMatches: [
          {
            start: originalMatch.start,
            end: originalMatch.end,
            confidence: 'low',
            expansionType: 'none',
            scopeType: 'unknown',
          },
        ],
      };
    }

    // JSDocを含めた開始位置を取得
    const startLine = getStartLineWithJSDoc(parentScope, fileContent);
    const endLine = parentScope.loc.end.line;
    const scopeType = getScopeType(parentScope);

    return {
      success: true,
      expandedMatches: [
        {
          start: startLine,
          end: endLine,
          confidence: 'high',
          expansionType: 'ast',
          scopeType,
        },
      ],
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'SyntaxError' || error.message.includes('Unexpected token')) {
        return { success: false, error: `Syntax error: ${error.message}` };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: String(error) };
  }
}

/**
 * マッチ位置をスコープ拡張する
 *
 * @param options 拡張オプション
 * @returns 拡張されたマッチ
 */
export function expandMatchToScope(options: MatchExpansionOptions): ExpandedMatch[] {
  const { filePath, originalMatch, fileContent } = options;

  // AST解析を試みる
  const astResult = tryASTExpansion(filePath, originalMatch, fileContent);

  if (astResult.success && astResult.expandedMatches) {
    return astResult.expandedMatches;
  }

  // AST解析が失敗した場合、元のマッチを返す（フォールバック）
  console.warn(`⚠️  AST parsing failed: ${astResult.error}`);
  return [
    {
      start: originalMatch.start,
      end: originalMatch.end,
      confidence: 'low',
      expansionType: 'none',
      scopeType: 'unknown',
    },
  ];
}
