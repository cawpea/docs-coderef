/**
 * マークダウン編集ユーティリティ
 */

import { normalizeCode } from './markdown';

/**
 * CODE_REFコメントを置換
 */
export function replaceCodeRefComment(
  content: string,
  oldComment: string,
  newComment: string
): string {
  // 安全のため完全一致を使用
  const index = content.indexOf(oldComment);
  if (index === -1) {
    throw new Error(`CODE_REFコメントが見つかりません: ${oldComment}`);
  }

  return content.substring(0, index) + newComment + content.substring(index + oldComment.length);
}

/**
 * CODE_REFコメントの後にコードブロックを挿入
 */
export function insertCodeBlockAfterComment(
  content: string,
  commentMatch: string,
  codeBlock: string,
  language = 'typescript'
): string {
  const commentIndex = content.indexOf(commentMatch);
  if (commentIndex === -1) {
    throw new Error(`CODE_REFコメントが見つかりません: ${commentMatch}`);
  }

  // コメントの終了（-->）を検索
  const commentEnd = content.indexOf('-->', commentIndex);
  if (commentEnd === -1) {
    throw new Error('CODE_REFコメントの終了タグが見つかりません');
  }

  // コメント後に挿入、次の行にスキップ
  const insertPosition = commentEnd + 3;

  // コメント後に既にコンテンツがあるかチェック
  const afterComment = content.substring(insertPosition, insertPosition + 10);
  const newlinePrefix = afterComment.startsWith('\n') ? '\n' : '\n\n';

  const codeBlockText = `${newlinePrefix}\`\`\`${language}\n${codeBlock}\n\`\`\`\n`;

  return content.substring(0, insertPosition) + codeBlockText + content.substring(insertPosition);
}

/**
 * マークダウン内のコードブロックを置換
 */
export function replaceCodeBlock(
  content: string,
  oldCodeBlock: string,
  newCodeBlock: string
): string {
  // マークダウン形式でコードブロックを検索
  const codeBlockPattern = /```[\w]*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let found = false;

  while ((match = codeBlockPattern.exec(content)) !== null) {
    const blockContent = match[1];

    // 正規化して比較
    if (normalizeCode(blockContent) === normalizeCode(oldCodeBlock)) {
      // このブロックを置換
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;

      // 言語識別子を抽出
      const langMatch = /```([\w]*)\n/.exec(match[0]);
      const language = langMatch ? langMatch[1] : '';

      const newBlock = `\`\`\`${language}\n${newCodeBlock}\n\`\`\``;

      content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error('一致するコードブロックが見つかりません');
  }

  return content;
}

/**
 * CODE_REFコメント後のコードブロック位置を検索
 */
export function findCodeBlockPosition(
  content: string,
  commentMatch: string
): { start: number; end: number; language: string } | null {
  const commentIndex = content.indexOf(commentMatch);
  if (commentIndex === -1) {
    return null;
  }

  const commentEnd = content.indexOf('-->', commentIndex);
  if (commentEnd === -1) {
    return null;
  }

  // コメント後500文字以内でコードブロックを検索
  const searchStart = commentEnd + 3;
  const searchWindow = content.substring(searchStart, searchStart + 500);

  const codeBlockMatch = /```([\w]*)\n([\s\S]*?)```/.exec(searchWindow);
  if (!codeBlockMatch) {
    return null;
  }

  return {
    start: searchStart + codeBlockMatch.index,
    end: searchStart + codeBlockMatch.index + codeBlockMatch[0].length,
    language: codeBlockMatch[1] || 'typescript',
  };
}

/**
 * CODE_REFコメントをコードブロックの直前に移動
 *
 * @param content マークダウンファイルの内容
 * @param commentMatch CODE_REFコメントのテキスト
 * @param codeBlockStart コードブロックの開始位置
 * @returns 修正後のマークダウン内容
 */
export function moveCodeRefCommentBeforeCodeBlock(
  content: string,
  commentMatch: string,
  codeBlockStart: number
): string {
  // 1. CODE_REFコメントの位置を特定
  const commentIndex = content.indexOf(commentMatch);
  if (commentIndex === -1) {
    throw new Error(`CODE_REFコメントが見つかりません: ${commentMatch}`);
  }

  const commentEnd = content.indexOf('-->', commentIndex);
  if (commentEnd === -1) {
    throw new Error('CODE_REFコメントの終了タグが見つかりません');
  }

  // 2. 削除範囲を決定（前後の改行を含める）
  let removalStart = commentIndex;
  let removalEnd = commentEnd + 3;

  // コメントの前に改行がある場合、それも削除
  if (commentIndex > 0 && content[commentIndex - 1] === '\n') {
    removalStart = commentIndex - 1;
  }

  // コメントの後の改行を削除（最大2つ）
  let newlinesAfter = 0;
  while (removalEnd < content.length && content[removalEnd] === '\n' && newlinesAfter < 2) {
    removalEnd++;
    newlinesAfter++;
  }

  // 3. コメントを削除
  const contentWithoutComment = content.substring(0, removalStart) + content.substring(removalEnd);

  // 4. 位置調整（削除によるシフト）
  const removedLength = removalEnd - removalStart;
  const adjustedCodeBlockStart =
    codeBlockStart > commentIndex ? codeBlockStart - removedLength : codeBlockStart;

  // 5. コードブロックの直前に挿入
  const beforeCodeBlock = contentWithoutComment.substring(0, adjustedCodeBlockStart);
  const afterCodeBlock = contentWithoutComment.substring(adjustedCodeBlockStart);

  // コメントの前に適切な改行を追加
  const needsNewlineBefore = beforeCodeBlock.length > 0 && !beforeCodeBlock.endsWith('\n\n');
  const prefix = needsNewlineBefore ? '\n' : '';

  // コメントとコードブロックの間に1つの改行
  const commentWithNewline = `${prefix}${commentMatch}\n`;

  return beforeCodeBlock + commentWithNewline + afterCodeBlock;
}
