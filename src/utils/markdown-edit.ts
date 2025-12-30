/**
 * Markdown editing utility
 */

import { normalizeCode } from '@/utils/markdown';

/**
 * Replace CODE_REF comment
 */
export function replaceCodeRefComment(
  content: string,
  oldComment: string,
  newComment: string
): string {
  // Use exact match for safety
  const index = content.indexOf(oldComment);
  if (index === -1) {
    throw new Error(`CODE_REF comment not found: ${oldComment}`);
  }

  return content.substring(0, index) + newComment + content.substring(index + oldComment.length);
}

/**
 * Insert code block after CODE_REF comment
 */
export function insertCodeBlockAfterComment(
  content: string,
  commentMatch: string,
  codeBlock: string,
  language = 'typescript'
): string {
  const commentIndex = content.indexOf(commentMatch);
  if (commentIndex === -1) {
    throw new Error(`CODE_REF comment not found: ${commentMatch}`);
  }

  // Search for comment end (-->)
  const commentEnd = content.indexOf('-->', commentIndex);
  if (commentEnd === -1) {
    throw new Error('CODE_REF comment end tag not found');
  }

  // Insert after comment, skip to next line
  const insertPosition = commentEnd + 3;

  // Check if content already exists after comment
  const afterComment = content.substring(insertPosition, insertPosition + 10);
  const newlinePrefix = afterComment.startsWith('\n') ? '\n' : '\n\n';

  const codeBlockText = `${newlinePrefix}\`\`\`${language}\n${codeBlock}\n\`\`\`\n`;

  return content.substring(0, insertPosition) + codeBlockText + content.substring(insertPosition);
}

/**
 * Replace code block in markdown
 */
export function replaceCodeBlock(
  content: string,
  oldCodeBlock: string,
  newCodeBlock: string
): string {
  // Search for code block in markdown format
  const codeBlockPattern = /```[\w]*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let found = false;

  while ((match = codeBlockPattern.exec(content)) !== null) {
    const blockContent = match[1];

    // Normalize and compare
    if (normalizeCode(blockContent) === normalizeCode(oldCodeBlock)) {
      // Replace this block
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;

      // Extract language identifier
      const langMatch = /```([\w]*)\n/.exec(match[0]);
      const language = langMatch ? langMatch[1] : '';

      const newBlock = `\`\`\`${language}\n${newCodeBlock}\n\`\`\``;

      content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error('No matching code block found');
  }

  return content;
}

/**
 * Find code block position after CODE_REF comment
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

  // Search for code block within 500 characters after comment
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
 * Move CODE_REF comment before code block
 *
 * @param content Markdown file content
 * @param commentMatch CODE_REF comment text
 * @param codeBlockStart Code block start position
 * @returns Modified markdown content
 */
export function moveCodeRefCommentBeforeCodeBlock(
  content: string,
  commentMatch: string,
  codeBlockStart: number
): string {
  // 1. Identify CODE_REF comment position
  const commentIndex = content.indexOf(commentMatch);
  if (commentIndex === -1) {
    throw new Error(`CODE_REF comment not found: ${commentMatch}`);
  }

  const commentEnd = content.indexOf('-->', commentIndex);
  if (commentEnd === -1) {
    throw new Error('CODE_REF comment end tag not found');
  }

  // 2. Determine removal range (including surrounding newlines)
  let removalStart = commentIndex;
  let removalEnd = commentEnd + 3;

  // If newline exists before comment, remove it too
  if (commentIndex > 0 && content[commentIndex - 1] === '\n') {
    removalStart = commentIndex - 1;
  }

  // Remove newlines after comment (max 2)
  let newlinesAfter = 0;
  while (removalEnd < content.length && content[removalEnd] === '\n' && newlinesAfter < 2) {
    removalEnd++;
    newlinesAfter++;
  }

  // 3. Remove comment
  const contentWithoutComment = content.substring(0, removalStart) + content.substring(removalEnd);

  // 4. Adjust position (shift due to removal)
  const removedLength = removalEnd - removalStart;
  const adjustedCodeBlockStart =
    codeBlockStart > commentIndex ? codeBlockStart - removedLength : codeBlockStart;

  // 5. Insert before code block
  const beforeCodeBlock = contentWithoutComment.substring(0, adjustedCodeBlockStart);
  const afterCodeBlock = contentWithoutComment.substring(adjustedCodeBlockStart);

  // Add appropriate newline before comment
  const needsNewlineBefore = beforeCodeBlock.length > 0 && !beforeCodeBlock.endsWith('\n\n');
  const prefix = needsNewlineBefore ? '\n' : '';

  // One newline between comment and code block
  const commentWithNewline = `${prefix}${commentMatch}\n`;

  return beforeCodeBlock + commentWithNewline + afterCodeBlock;
}
