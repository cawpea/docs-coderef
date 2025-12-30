/**
 * コード比較ユーティリティ
 */

import * as fs from 'fs';

import { expandMatchToScope } from '@/utils/ast-scope-expansion';
import { normalizeCode } from '@/utils/markdown';
import type { ExpandedMatch } from '@/utils/types';

/**
 * コードから共通の先頭インデントを除去する
 *
 * @param code コード文字列
 * @returns インデントを除去したコード
 */
export function dedentCode(code: string): string {
  const lines = code.split('\n');

  // 空行を除いた最小インデントを見つける
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim().length === 0) continue; // 空行はスキップ

    const indent = /^(\s*)/.exec(line)?.[1].length ?? 0;
    minIndent = Math.min(minIndent, indent);
  }

  // 全行から最小インデントを除去
  if (minIndent === Infinity || minIndent === 0) {
    return code;
  }

  return lines.map((line) => (line.trim().length === 0 ? line : line.slice(minIndent))).join('\n');
}

/**
 * ファイルから指定行範囲のコードを抽出する
 *
 * @param filePath ファイルパス
 * @param startLine 開始行（1-indexed）
 * @param endLine 終了行（1-indexed）
 * @returns 抽出されたコード（先頭インデントを除去）
 */
export function extractLinesFromFile(filePath: string, startLine: number, endLine: number): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // 1-indexedから0-indexedに変換し、指定範囲を抽出
  const extractedLines = lines.slice(startLine - 1, endLine);
  const extractedCode = extractedLines.join('\n');

  // 共通の先頭インデントを除去
  return dedentCode(extractedCode);
}

/**
 * 2つのコード文字列を比較する（正規化して比較）
 *
 * @param actual 実際のコード
 * @param expected 期待されるコード
 * @returns 一致する場合true
 */
export function compareCodeContent(actual: string, expected: string): boolean {
  const normalizedActual = normalizeCode(actual);
  const normalizedExpected = normalizeCode(expected);

  return normalizedActual === normalizedExpected;
}

/**
 * ファイル全体から指定されたコードを検索する（スライディングウィンドウ）
 *
 * @param filePath ファイルパス
 * @param codeToFind 検索するコード
 * @returns 見つかった位置の配列（start/end行番号、1-indexed）
 */
export function searchCodeInFile(
  filePath: string,
  codeToFind: string
): { start: number; end: number }[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const fileLines = fileContent.split('\n');

  // ターゲットコードの行数を取得（正規化前の元のコードから）
  const targetLineCount = codeToFind.split('\n').length;

  // 正規化後のターゲットコード
  const normalizedTarget = normalizeCode(codeToFind);

  const matches: { start: number; end: number }[] = [];

  // ファイル全体をスライディングウィンドウで走査
  for (let i = 0; i <= fileLines.length - targetLineCount; i++) {
    // 現在のウィンドウを抽出
    const windowLines = fileLines.slice(i, i + targetLineCount);
    const windowCode = windowLines.join('\n');
    const normalizedWindow = normalizeCode(windowCode);

    // 正規化して比較
    if (normalizedWindow === normalizedTarget) {
      matches.push({
        start: i + 1, // 1-indexedに変換
        end: i + targetLineCount, // 1-indexed
      });
    }
  }

  return matches;
}

/**
 * ファイル全体から指定されたコードを検索し、スコープ拡張を適用する
 *
 * @param filePath ファイルパス
 * @param codeToFind 検索するコード
 * @returns 見つかった位置の配列（スコープ拡張済み、信頼度情報付き）
 */
export function searchCodeInFileWithScopeExpansion(
  filePath: string,
  codeToFind: string
): ExpandedMatch[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // 既存のsearchCodeInFile()を使用してマッチを取得
  const rawMatches = searchCodeInFile(filePath, codeToFind);

  // 各マッチに対してスコープ拡張を実行
  const expandedMatches = rawMatches.map((match) => {
    const expanded = expandMatchToScope({
      filePath,
      originalMatch: match,
      fileContent,
    });

    // expandMatchToScopeは配列を返すが、ここでは最初の要素のみを使用
    return expanded[0] || { ...match, confidence: 'low' as const, expansionType: 'none' as const };
  });

  return expandedMatches;
}
