/**
 * 修正ロジックユーティリティ
 */

import * as fs from 'fs';
import * as path from 'path';
import type * as readline from 'readline';

import { expandMatchToScope } from './ast-scope-expansion';
import { findSymbolInAST } from './ast-symbol-search';
import { extractLinesFromFile, searchCodeInFileWithScopeExpansion } from './code-comparison';
import {
  findCodeBlockPosition,
  insertCodeBlockAfterComment,
  moveCodeRefCommentBeforeCodeBlock,
  replaceCodeBlock,
  replaceCodeRefComment,
} from './markdown-edit';
import { askSelectOption } from './prompt';
import type { CodeRefError, ExpandedMatch, FixAction } from './types';

/**
 * エラーが修正可能かチェック
 */
export function isFixableError(error: CodeRefError): boolean {
  return [
    'CODE_LOCATION_MISMATCH',
    'CODE_BLOCK_MISSING',
    'CODE_CONTENT_MISMATCH',
    'LINE_OUT_OF_RANGE',
    'SYMBOL_RANGE_MISMATCH',
    'MULTIPLE_SYMBOLS_FOUND',
  ].includes(error.type);
}

/**
 * CODE_LOCATION_MISMATCHの修正アクションを作成
 */
export function createLocationMismatchFix(error: CodeRefError): FixAction {
  if (!error.suggestedLines) {
    throw new Error('CODE_LOCATION_MISMATCHにはsuggestedLinesが必要です');
  }

  const { ref } = error;
  const oldComment = ref.fullMatch;
  const newComment = `<!-- CODE_REF: ${ref.refPath}:${error.suggestedLines.start}-${error.suggestedLines.end} -->`;

  // 実際のコードを取得してプレビュー
  const projectRoot = path.resolve(__dirname, '../../..');
  const absolutePath = path.resolve(projectRoot, ref.refPath);
  const actualCode = extractLinesFromFile(
    absolutePath,
    error.suggestedLines.start,
    error.suggestedLines.end
  );

  return {
    type: 'UPDATE_LINE_NUMBERS',
    error,
    description: `行番号を ${ref.startLine}-${ref.endLine} から ${error.suggestedLines.start}-${error.suggestedLines.end} に更新`,
    preview: `${oldComment}\n→ ${newComment}`,
    newStartLine: error.suggestedLines.start,
    newEndLine: error.suggestedLines.end,
    newCodeBlock: actualCode,
  };
}

/**
 * CODE_REFコメント近くのコードブロックを検索
 *
 * @param content ドキュメントの内容
 * @param commentMatch CODE_REFコメントのテキスト
 * @returns コードブロックの情報、見つからない場合はnull
 */
function findCodeBlockNearComment(
  content: string,
  commentMatch: string
): { start: number; end: number; language: string; content: string } | null {
  const commentIndex = content.indexOf(commentMatch);
  if (commentIndex === -1) return null;

  const commentEnd = content.indexOf('-->', commentIndex);
  if (commentEnd === -1) return null;

  const searchStart = commentEnd + 3;
  const searchWindow = content.substring(searchStart, searchStart + 5000);

  // 次のCODE_REFコメントを検索
  const nextCommentMatch = /<!--\s*CODE_REF:/.exec(searchWindow);
  const searchLimit = nextCommentMatch ? nextCommentMatch.index : searchWindow.length;

  // コードブロックを検索（次のCODE_REFコメントまで）
  const limitedWindow = searchWindow.substring(0, searchLimit);
  const codeBlockPattern = /```([\w]*)\s*\n([\s\S]*?)```/;
  const match = codeBlockPattern.exec(limitedWindow);

  if (!match) return null;

  const absoluteStart = searchStart + match.index;
  const absoluteEnd = absoluteStart + match[0].length;

  return {
    start: absoluteStart,
    end: absoluteEnd,
    language: match[1] || 'typescript',
    content: match[2],
  };
}

/**
 * CODE_REFコメント移動の修正アクションを作成
 *
 * @param error エラー情報
 * @param codeBlock コードブロックの情報
 * @returns 修正アクション
 */
function createMoveCommentFix(
  error: CodeRefError,
  codeBlock: { start: number; end: number; language: string; content: string }
): FixAction {
  return {
    type: 'MOVE_CODE_REF_COMMENT',
    error,
    description: `CODE_REFコメントをコードブロックの直前に移動`,
    preview: '',
    codeBlockPosition: codeBlock,
  };
}

/**
 * CODE_BLOCK_MISSINGの修正アクションを作成
 */
export function createBlockMissingFix(error: CodeRefError): FixAction {
  const { ref } = error;

  // 0. ファイル全体参照の場合は早期リターン（コードブロック不要）
  if (ref.startLine === null && !ref.symbolPath) {
    // ファイル全体参照はCODE_BLOCK_MISSINGエラーにならないはずだが、
    // 念のためエラーをスローする
    throw new Error('ファイル全体参照にはコードブロックは不要です');
  }

  // 1. 既存のコードブロックを検索（行番号指定またはシンボル指定がある場合のみ）
  const docContent = fs.readFileSync(ref.docFile, 'utf-8');
  const existingBlock = findCodeBlockNearComment(docContent, ref.fullMatch);

  if (existingBlock) {
    // コードブロックが存在 → コメントを移動
    return createMoveCommentFix(error, existingBlock);
  }

  // 2. コードブロックが見つからない → 既存のロジック（挿入）
  const projectRoot = path.resolve(__dirname, '../../..');
  const absolutePath = path.resolve(projectRoot, ref.refPath);

  // シンボル指定のみで行番号がない場合
  if (ref.symbolPath && (ref.startLine === null || ref.endLine === null)) {
    // AST解析でシンボル全体を抽出
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    const matches = findSymbolInAST(fileContent, absolutePath, {
      className: ref.className,
      memberName: ref.memberName!,
    });

    if (matches.length === 0) {
      throw new Error(`シンボル "${ref.symbolPath}" が見つかりません`);
    }

    // 複数マッチの場合は最初のものを使用
    const symbolMatch = matches[0];
    const codeBlock = extractLinesFromFile(
      absolutePath,
      symbolMatch.startLine,
      symbolMatch.endLine
    );

    const preview =
      codeBlock.length > 200
        ? `\`\`\`typescript\n${codeBlock.substring(0, 200)}...\n\`\`\``
        : `\`\`\`typescript\n${codeBlock}\n\`\`\``;

    return {
      type: 'INSERT_CODE_BLOCK',
      error,
      description: `${ref.refPath}#${ref.symbolPath} (${symbolMatch.startLine}-${symbolMatch.endLine}行目) からコードブロックを挿入`,
      preview,
      newCodeBlock: codeBlock,
    };
  }

  // 行番号指定がある場合
  if (ref.startLine === null || ref.endLine === null) {
    throw new Error('CODE_BLOCK_MISSINGには行番号指定またはシンボル指定が必要です');
  }

  const codeBlock = extractLinesFromFile(absolutePath, ref.startLine, ref.endLine);

  const preview =
    codeBlock.length > 200
      ? `\`\`\`typescript\n${codeBlock.substring(0, 200)}...\n\`\`\``
      : `\`\`\`typescript\n${codeBlock}\n\`\`\``;

  return {
    type: 'INSERT_CODE_BLOCK',
    error,
    description: `${ref.refPath}:${ref.startLine}-${ref.endLine} からコードブロックを挿入`,
    preview,
    newCodeBlock: codeBlock,
  };
}

/**
 * CODE_CONTENT_MISMATCHの修正アクションを作成
 */
export function createContentMismatchFix(error: CodeRefError): FixAction | FixAction[] {
  const { ref } = error;
  const projectRoot = path.resolve(__dirname, '../../..');
  const absolutePath = path.resolve(projectRoot, ref.refPath);

  // シンボル指定のみの場合（行番号なし）: 複数のオプションを返す
  if (ref.symbolPath && (ref.startLine === null || ref.endLine === null)) {
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    const matches = findSymbolInAST(fileContent, absolutePath, {
      className: ref.className,
      memberName: ref.memberName!,
    });

    if (matches.length > 0) {
      const symbolMatch = matches[0];
      const symbolCode = extractLinesFromFile(
        absolutePath,
        symbolMatch.startLine,
        symbolMatch.endLine
      );

      // オプション1: コードブロックを完全なコードに置き換え
      const option1: FixAction = {
        type: 'REPLACE_CODE_BLOCK',
        error,
        description: `コードブロックをシンボル全体（${symbolMatch.startLine}-${symbolMatch.endLine}行目、${symbolMatch.endLine - symbolMatch.startLine + 1}行）に置き換え`,
        preview:
          symbolCode.length > 300
            ? `\`\`\`typescript\n${symbolCode.substring(0, 300)}...\n\`\`\` (${symbolMatch.endLine - symbolMatch.startLine + 1}行)`
            : `\`\`\`typescript\n${symbolCode}\n\`\`\``,
        newCodeBlock: symbolCode,
      };

      // オプション2: シンボル指定を削除して行番号指定に変更
      const oldComment = ref.fullMatch;
      const newComment = `<!-- CODE_REF: ${ref.refPath}:${symbolMatch.startLine}-${symbolMatch.endLine} -->`;

      const option2: FixAction = {
        type: 'UPDATE_LINE_NUMBERS',
        error,
        description: `シンボル指定を削除して行番号指定に変更（コードブロックは維持、手動調整が必要）`,
        preview: `${oldComment}\n→ ${newComment}`,
        newStartLine: symbolMatch.startLine,
        newEndLine: symbolMatch.endLine,
        newCodeBlock: ref.codeBlock, // 既存のコードブロックを維持
      };

      return [option1, option2];
    }
  }

  // 行番号指定がある場合の既存ロジック
  if (ref.startLine === null || ref.endLine === null) {
    throw new Error('CODE_CONTENT_MISMATCHには行番号指定またはシンボル指定が必要です');
  }

  const actualCode = extractLinesFromFile(absolutePath, ref.startLine, ref.endLine);

  // AST解析を使って、指定された行範囲が不完全なスコープ（関数の途中など）でないかチェック
  // 開始行のみを使用してスコープを検出（範囲全体を使うと誤検出の可能性があるため）
  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  const expandedMatches = expandMatchToScope({
    filePath: absolutePath,
    originalMatch: { start: ref.startLine, end: ref.startLine },
    fileContent,
  });

  // 拡張結果が元の範囲と異なり、かつ高信頼度の場合は行番号も更新
  const expanded = expandedMatches[0];
  if (
    expanded?.confidence === 'high' &&
    (expanded.start !== ref.startLine || expanded.end !== ref.endLine)
  ) {
    // スコープ拡張が成功した場合は行番号も更新
    const expandedCode = extractLinesFromFile(absolutePath, expanded.start, expanded.end);
    const scopeInfo = expanded.scopeType ? ` (${expanded.scopeType})` : '';
    console.log(
      `   ℹ️  AST解析により ${ref.startLine}-${ref.endLine} を ${expanded.start}-${expanded.end} に拡張${scopeInfo}`
    );

    const oldComment = ref.fullMatch;
    const newComment = `<!-- CODE_REF: ${ref.refPath}:${expanded.start}-${expanded.end} -->`;

    return {
      type: 'UPDATE_LINE_NUMBERS',
      error,
      description: `AST解析により行番号を ${ref.startLine}-${ref.endLine} から ${expanded.start}-${expanded.end} に更新し、コードブロックを置換`,
      preview: `${oldComment}\n→ ${newComment}`,
      newStartLine: expanded.start,
      newEndLine: expanded.end,
      newCodeBlock: expandedCode,
    };
  }

  // AST拡張が不要または失敗した場合は、従来通りコードブロックのみ置換
  const expectedPreview = error.expectedCode?.substring(0, 100) || '';
  const actualPreview = actualCode.substring(0, 100);

  return {
    type: 'REPLACE_CODE_BLOCK',
    error,
    description: 'コードブロックを実際のコード内容で置換',
    preview: `期待: ${expectedPreview}${expectedPreview.length >= 100 ? '...' : ''}\n実際: ${actualPreview}${actualPreview.length >= 100 ? '...' : ''}`,
    newCodeBlock: actualCode,
  };
}

/**
 * LINE_OUT_OF_RANGEの修正アクションを作成
 */
export function createLineOutOfRangeFix(error: CodeRefError): FixAction {
  const { ref } = error;

  // エラーメッセージから行数を抽出
  const match = /(\d+)\s*>\s*(\d+)/.exec(error.message);
  if (!match) {
    throw new Error('LINE_OUT_OF_RANGEエラーメッセージから行数を取得できません');
  }

  const totalLines = parseInt(match[2], 10);
  const oldComment = ref.fullMatch;
  const newComment = `<!-- CODE_REF: ${ref.refPath}:${ref.startLine}-${totalLines} -->`;

  return {
    type: 'UPDATE_END_LINE',
    error,
    description: `終了行を ${ref.endLine} から ${totalLines} (ファイル末尾) に修正`,
    preview: `${oldComment}\n→ ${newComment}`,
    newStartLine: ref.startLine!,
    newEndLine: totalLines,
  };
}

/**
 * SYMBOL_RANGE_MISMATCHの修正アクションを作成
 */
export function createSymbolRangeMismatchFix(error: CodeRefError): FixAction {
  if (!error.suggestedSymbol) {
    throw new Error('SYMBOL_RANGE_MISMATCHにはsuggestedSymbolが必要です');
  }

  const { ref } = error;
  const suggested = error.suggestedSymbol;

  const oldComment = ref.fullMatch;
  const newComment = `<!-- CODE_REF: ${ref.refPath}#${ref.symbolPath}:${suggested.startLine}-${suggested.endLine} -->`;

  return {
    type: 'UPDATE_SYMBOL_RANGE',
    error,
    description: `シンボル "${ref.symbolPath}" の行番号を ${ref.startLine}-${ref.endLine} から ${suggested.startLine}-${suggested.endLine} に更新`,
    preview: `${oldComment}\n→ ${newComment}`,
    newStartLine: suggested.startLine,
    newEndLine: suggested.endLine,
  };
}

/**
 * MULTIPLE_SYMBOLS_FOUNDの修正アクションを作成（対話的に選択）
 */
export async function createMultipleSymbolsFoundFix(
  error: CodeRefError,
  rl: readline.Interface
): Promise<FixAction | null> {
  if (!error.foundSymbols || error.foundSymbols.length === 0) {
    throw new Error('MULTIPLE_SYMBOLS_FOUNDにはfoundSymbolsが必要です');
  }

  const { ref } = error;

  const options = error.foundSymbols.map((symbol) => {
    const classInfo = symbol.className ? `${symbol.className}#` : '';
    return `行 ${symbol.startLine}-${symbol.endLine} (${classInfo}${symbol.memberName})`;
  });

  const selectedIndex = await askSelectOption(
    rl,
    options,
    `⚠️  シンボル "${ref.symbolPath}" が${error.foundSymbols.length}箇所で見つかりました。どの位置を使用しますか？`
  );

  const selected = error.foundSymbols[selectedIndex];

  const oldComment = ref.fullMatch;
  const newComment = `<!-- CODE_REF: ${ref.refPath}#${ref.symbolPath}:${selected.startLine}-${selected.endLine} -->`;

  return {
    type: 'UPDATE_SYMBOL_RANGE',
    error,
    description: `シンボル "${ref.symbolPath}" の行番号を追加: ${selected.startLine}-${selected.endLine}`,
    preview: `${oldComment}\n→ ${newComment}`,
    newStartLine: selected.startLine,
    newEndLine: selected.endLine,
  };
}

/**
 * エラータイプに基づいて修正アクションを作成
 */
export async function createFixAction(
  error: CodeRefError,
  rl?: readline.Interface
): Promise<FixAction | FixAction[] | null> {
  if (!isFixableError(error)) {
    return null;
  }

  switch (error.type) {
    case 'CODE_LOCATION_MISMATCH':
      return createLocationMismatchFix(error);
    case 'CODE_BLOCK_MISSING':
      return createBlockMissingFix(error);
    case 'CODE_CONTENT_MISMATCH':
      return createContentMismatchFix(error);
    case 'LINE_OUT_OF_RANGE':
      return createLineOutOfRangeFix(error);
    case 'SYMBOL_RANGE_MISMATCH':
      return createSymbolRangeMismatchFix(error);
    case 'MULTIPLE_SYMBOLS_FOUND':
      if (!rl) {
        throw new Error('MULTIPLE_SYMBOLS_FOUNDにはreadline.Interfaceが必要です');
      }
      return await createMultipleSymbolsFoundFix(error, rl);
    default:
      return null;
  }
}

/**
 * マークダウンファイルに修正を適用
 * @returns ライン delta（正の数は行追加、負の数は行削除、0は行数変化なし）
 */
export function applyFix(action: FixAction): number {
  const filePath = action.error.ref.docFile;
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalLines = content.split('\n').length;

  switch (action.type) {
    case 'UPDATE_LINE_NUMBERS':
    case 'UPDATE_END_LINE': {
      // CODE_REFコメントを更新
      const oldComment = action.error.ref.fullMatch;
      const newComment = `<!-- CODE_REF: ${action.error.ref.refPath}:${action.newStartLine}-${action.newEndLine} -->`;
      content = replaceCodeRefComment(content, oldComment, newComment);

      // コードブロックも更新（存在する場合）
      if (action.newCodeBlock) {
        const blockPos = findCodeBlockPosition(content, newComment);
        if (blockPos) {
          const newBlock = `\`\`\`${blockPos.language}\n${action.newCodeBlock}\n\`\`\``;
          content =
            content.substring(0, blockPos.start) + newBlock + content.substring(blockPos.end);
        }
      }
      break;
    }

    case 'INSERT_CODE_BLOCK': {
      content = insertCodeBlockAfterComment(
        content,
        action.error.ref.fullMatch,
        action.newCodeBlock!
      );
      break;
    }

    case 'REPLACE_CODE_BLOCK': {
      if (!action.error.ref.codeBlock) {
        throw new Error('コードブロックが見つかりません');
      }
      content = replaceCodeBlock(content, action.error.ref.codeBlock, action.newCodeBlock!);
      break;
    }

    case 'MOVE_CODE_REF_COMMENT': {
      if (!action.codeBlockPosition) {
        throw new Error('MOVE_CODE_REF_COMMENTにはcodeBlockPositionが必要です');
      }

      content = moveCodeRefCommentBeforeCodeBlock(
        content,
        action.error.ref.fullMatch,
        action.codeBlockPosition.start
      );
      break;
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');

  // ライン deltaを返す
  const newLines = content.split('\n').length;
  return newLines - originalLines;
}

/**
 * 優先順位付けのコンテキスト
 */
interface PrioritizationContext {
  originalStart: number;
  originalEnd: number;
}

/**
 * 信頼度とスコープタイプを考慮した優先順位付け
 *
 * @param matches 拡張されたマッチの配列
 * @param context 優先順位付けのコンテキスト（元の行番号）
 * @returns 優先順位付けされたマッチ（信頼度・スコープタイプ考慮）
 */
function prioritizeMatchesWithConfidence(
  matches: ExpandedMatch[],
  context: PrioritizationContext
): ExpandedMatch[] {
  return matches.sort((a, b) => {
    // 1. 信頼度で優先（最優先）
    const confidenceScore = { high: 3, medium: 2, low: 1 };
    const confDiff = confidenceScore[b.confidence] - confidenceScore[a.confidence];
    if (confDiff !== 0) return confDiff;

    // 2. 元の行番号との近接度で優先
    const distanceA = Math.abs(a.start - context.originalStart);
    const distanceB = Math.abs(b.start - context.originalStart);
    const distDiff = distanceA - distanceB;
    if (distDiff !== 0) return distDiff;

    // 3. スコープタイプの優先順位
    const scopePriority = {
      interface: 5,
      type: 4,
      class: 3,
      function: 2,
      const: 1,
      unknown: 0,
    };
    const scopeDiff =
      scopePriority[b.scopeType || 'unknown'] - scopePriority[a.scopeType || 'unknown'];
    if (scopeDiff !== 0) return scopeDiff;

    // 4. 短い範囲を優先（より具体的なマッチ）
    return a.end - a.start - (b.end - b.start);
  });
}

/**
 * 複数マッチの処理
 */
export async function handleMultipleMatches(
  error: CodeRefError,
  rl: readline.Interface
): Promise<FixAction | null> {
  const { ref } = error;

  if (!ref.codeBlock) {
    return null;
  }

  const projectRoot = path.resolve(__dirname, '../../..');
  const absolutePath = path.resolve(projectRoot, ref.refPath);

  // AST解析によるスコープ拡張版を使用
  const matches = searchCodeInFileWithScopeExpansion(absolutePath, ref.codeBlock);

  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    // 単一マッチ - 修正アクションを作成
    const match = matches[0];
    const confidenceInfo =
      match.confidence === 'high' && match.scopeType
        ? ` (${match.scopeType})`
        : match.confidence === 'low'
          ? ' (低信頼度)'
          : '';
    console.log(
      `\n✓ ${ref.refPath} で単一マッチを検出: 行 ${match.start}-${match.end}${confidenceInfo}`
    );
    return {
      type: 'UPDATE_LINE_NUMBERS',
      error,
      description: `行番号を ${ref.startLine}-${ref.endLine} から ${match.start}-${match.end} に更新`,
      preview: `<!-- CODE_REF: ${ref.refPath}:${match.start}-${match.end} -->`,
      newStartLine: match.start,
      newEndLine: match.end,
      matchOptions: matches.map((m) => ({ start: m.start, end: m.end })),
    };
  }

  // 複数マッチ - 優先順位付けして自動選択を試みる
  const sortedMatches = prioritizeMatchesWithConfidence(matches, {
    originalStart: ref.startLine!,
    originalEnd: ref.endLine!,
  });

  // 信頼度が高いマッチが1つだけなら自動選択
  const highConfidenceMatches = sortedMatches.filter((m) => m.confidence === 'high');
  if (highConfidenceMatches.length === 1) {
    const bestMatch = highConfidenceMatches[0];
    const scopeInfo = bestMatch.scopeType ? ` (${bestMatch.scopeType})` : '';
    console.log(
      `\n✓ ${ref.refPath} で最も適切なマッチを自動選択: 行 ${bestMatch.start}-${bestMatch.end}${scopeInfo}`
    );
    return {
      type: 'UPDATE_LINE_NUMBERS',
      error,
      description: `行番号を ${ref.startLine}-${ref.endLine} から ${bestMatch.start}-${bestMatch.end} に更新`,
      preview: `<!-- CODE_REF: ${ref.refPath}:${bestMatch.start}-${bestMatch.end} -->`,
      newStartLine: bestMatch.start,
      newEndLine: bestMatch.end,
      matchOptions: matches.map((m) => ({ start: m.start, end: m.end })),
    };
  }

  // それ以外はユーザーに選択させる
  console.log(`\n⚠️  ${ref.refPath} でコードが ${matches.length} 箇所見つかりました:`);
  const options = sortedMatches.map((m) => {
    const confidenceLabel =
      m.confidence === 'high' ? '高' : m.confidence === 'medium' ? '中' : '低';
    const scopeInfo = m.scopeType && m.scopeType !== 'unknown' ? `, ${m.scopeType}` : '';
    return `行 ${m.start}-${m.end} (信頼度: ${confidenceLabel}${scopeInfo})`;
  });

  const selection = await askSelectOption(rl, options, 'どの位置を使用しますか？');
  const selectedMatch = sortedMatches[selection];

  // 選択されたマッチの信頼度が低い場合は警告
  if (selectedMatch.confidence === 'low') {
    console.warn('⚠️  スコープ検出の信頼度が低いため、結果を確認してください。');
  }
  if (selectedMatch.expansionType === 'none') {
    console.warn('⚠️  構造的な解析ができなかったため、単純な文字列マッチングを使用しています。');
  }

  return {
    type: 'UPDATE_LINE_NUMBERS',
    error,
    description: `行番号を ${ref.startLine}-${ref.endLine} から ${selectedMatch.start}-${selectedMatch.end} に更新`,
    preview: `<!-- CODE_REF: ${ref.refPath}:${selectedMatch.start}-${selectedMatch.end} -->`,
    newStartLine: selectedMatch.start,
    newEndLine: selectedMatch.end,
    matchOptions: matches.map((m) => ({ start: m.start, end: m.end })),
  };
}
