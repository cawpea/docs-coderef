/**
 * マークダウンドキュメント処理ユーティリティ
 */

import type { CodeRef } from '@/utils/types';

/**
 * CODE_REFコメントの後にあるコードブロックを抽出する
 *
 * @param content マークダウンファイルの内容
 * @param commentIndex CODE_REFコメントの開始位置
 * @returns コードブロックの内容、見つからない場合はnull
 *
 * **厳格なルール**: CODE_REFコメントとコードブロックの間に、空行以外のテキスト
 * （見出し、段落、リストなど）がある場合は、コードブロックを関連付けません。
 */
export function extractCodeBlockAfterComment(content: string, commentIndex: number): string | null {
  // コメント終了位置（-->）を見つける
  const commentEndMarker = '-->';
  const commentEnd = content.indexOf(commentEndMarker, commentIndex);

  if (commentEnd === -1) {
    return null;
  }

  // コメント終了後から5000文字以内でコードブロックを検索
  const searchStart = commentEnd + commentEndMarker.length;
  const searchWindow = content.substring(searchStart, searchStart + 5000);

  // コードブロックのパターン: ```language\ncode\n```
  // 言語識別子はオプション（typescript, javascript, など）
  // 言語識別子の後に空白があってもマッチする
  const codeBlockPattern = /```[\w]*\s*\n([\s\S]*?)```/;
  const match = codeBlockPattern.exec(searchWindow);

  if (!match) {
    return null;
  }

  // コードブロックの開始位置を取得
  const codeBlockStart = match.index;

  // コメント終了後からコードブロック開始までの間のテキストを取得
  const textBetween = searchWindow.substring(0, codeBlockStart);

  // 空行以外のテキストがあるかチェック
  // 空行、空白のみの行は許容する
  const hasNonEmptyContent = textBetween.split('\n').some((line) => line.trim() !== '');

  if (hasNonEmptyContent) {
    // コメントとコードブロックの間に他のテキストがある場合はnullを返す
    return null;
  }

  return match[1];
}

/**
 * CODE_REFの配列にコードブロックを関連付ける
 *
 * @param content マークダウンファイルの内容
 * @param refs CODE_REFの配列
 * @returns コードブロックが関連付けられたCODE_REFの配列
 */
export function associateCodeBlocksWithRefs(content: string, refs: CodeRef[]): CodeRef[] {
  return refs.map((ref) => {
    // codeBlockStartOffsetが設定されている場合はそれを使用、なければfullMatchから検索
    const commentIndex = ref.codeBlockStartOffset ?? content.indexOf(ref.fullMatch);

    if (commentIndex === -1) {
      // fullMatchが見つからない場合（通常は発生しないはず）
      return ref;
    }

    // コードブロックを抽出
    const codeBlock = extractCodeBlockAfterComment(content, commentIndex);

    if (codeBlock !== null) {
      return {
        ...ref,
        codeBlock,
        codeBlockStartOffset: commentIndex,
      };
    }

    return ref;
  });
}

/**
 * コードを正規化する（空白の違いを吸収）
 *
 * すべての空白文字を削除することで、インデント、改行位置、
 * スペースの数などの違いを完全に無視します。
 *
 * @param code 正規化するコード
 * @returns 正規化されたコード（空白なし）
 */
export function normalizeCode(code: string): string {
  // すべての空白文字（改行、タブ、スペースなど）を削除
  return code.replace(/\s+/g, '');
}
