/**
 * Fix logic utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import type * as readline from 'readline';

import { expandMatchToScope } from '@/utils/ast-scope-expansion';
import { findSymbolInAST } from '@/utils/ast-symbol-search';
import { extractLinesFromFile, searchCodeInFileWithScopeExpansion } from '@/utils/code-comparison';
import {
  findCodeBlockPosition,
  insertCodeBlockAfterComment,
  moveCodeRefCommentBeforeCodeBlock,
  replaceCodeBlock,
  replaceCodeRefComment,
} from '@/utils/markdown-edit';
import { askSelectOption } from '@/utils/prompt';
import type { CodeRefError, ExpandedMatch, FixAction } from '@/utils/types';
import type { CodeRefConfig } from '@/config';

/**
 * Check if error is fixable
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
 * Create fix action for CODE_LOCATION_MISMATCH
 */
export function createLocationMismatchFix(error: CodeRefError, config: CodeRefConfig): FixAction {
  if (!error.suggestedLines) {
    throw new Error('CODE_LOCATION_MISMATCH requires suggestedLines');
  }

  const { ref } = error;
  const oldComment = ref.fullMatch;
  const newComment = `<!-- CODE_REF: ${ref.refPath}:${error.suggestedLines.start}-${error.suggestedLines.end} -->`;

  // Get actual code for preview
  const projectRoot = config.projectRoot;
  const absolutePath = path.resolve(projectRoot, ref.refPath);
  const actualCode = extractLinesFromFile(
    absolutePath,
    error.suggestedLines.start,
    error.suggestedLines.end
  );

  return {
    type: 'UPDATE_LINE_NUMBERS',
    error,
    description: `Update line numbers from ${ref.startLine}-${ref.endLine} to ${error.suggestedLines.start}-${error.suggestedLines.end}`,
    preview: `${oldComment}\n→ ${newComment}`,
    newStartLine: error.suggestedLines.start,
    newEndLine: error.suggestedLines.end,
    newCodeBlock: actualCode,
  };
}

/**
 * Search for code block near CODE_REF comment
 *
 * @param content Document content
 * @param commentMatch CODE_REF comment text
 * @returns Code block information, or null if not found
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

  // Search for next CODE_REF comment
  const nextCommentMatch = /<!--\s*CODE_REF:/.exec(searchWindow);
  const searchLimit = nextCommentMatch ? nextCommentMatch.index : searchWindow.length;

  // Search for code block (up to next CODE_REF comment)
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
 * Create fix action to move CODE_REF comment
 *
 * @param error Error information
 * @param codeBlock Code block information
 * @returns Fix action
 */
function createMoveCommentFix(
  error: CodeRefError,
  codeBlock: { start: number; end: number; language: string; content: string }
): FixAction {
  return {
    type: 'MOVE_CODE_REF_COMMENT',
    error,
    description: `Move CODE_REF comment before code block`,
    preview: '',
    codeBlockPosition: codeBlock,
  };
}

/**
 * Create fix action for CODE_BLOCK_MISSING
 */
export function createBlockMissingFix(error: CodeRefError, config: CodeRefConfig): FixAction {
  const { ref } = error;

  // 0. Early return for whole file reference (no code block needed)
  if (ref.startLine === null && !ref.symbolPath) {
    // Whole file reference shouldn't cause CODE_BLOCK_MISSING error,
    // but throw error just in case
    throw new Error('Whole file reference does not need code block');
  }

  // 1. Search for existing code block (only when line numbers or symbols are specified)
  const docContent = fs.readFileSync(ref.docFile, 'utf-8');
  const existingBlock = findCodeBlockNearComment(docContent, ref.fullMatch);

  if (existingBlock) {
    // Code block exists → move comment
    return createMoveCommentFix(error, existingBlock);
  }

  // 2. Code block not found → existing logic (insert)
  const absolutePath = path.resolve(config.projectRoot, ref.refPath);

  // Only symbol specified without line numbers
  if (ref.symbolPath && (ref.startLine === null || ref.endLine === null)) {
    // Extract entire symbol using AST analysis
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    const matches = findSymbolInAST(fileContent, absolutePath, {
      className: ref.className,
      memberName: ref.memberName!,
    });

    if (matches.length === 0) {
      throw new Error(`Symbol "${ref.symbolPath}" not found`);
    }

    // Use first match if multiple matches
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
      description: `Insert code block from ${ref.refPath}#${ref.symbolPath} (lines ${symbolMatch.startLine}-${symbolMatch.endLine})`,
      preview,
      newCodeBlock: codeBlock,
    };
  }

  // When line numbers are specified
  if (ref.startLine === null || ref.endLine === null) {
    throw new Error('CODE_BLOCK_MISSING requires line numbers or symbol specification');
  }

  const codeBlock = extractLinesFromFile(absolutePath, ref.startLine, ref.endLine);

  const preview =
    codeBlock.length > 200
      ? `\`\`\`typescript\n${codeBlock.substring(0, 200)}...\n\`\`\``
      : `\`\`\`typescript\n${codeBlock}\n\`\`\``;

  return {
    type: 'INSERT_CODE_BLOCK',
    error,
    description: `Insert code block from ${ref.refPath}:${ref.startLine}-${ref.endLine}`,
    preview,
    newCodeBlock: codeBlock,
  };
}

/**
 * Create fix action for CODE_CONTENT_MISMATCH
 */
export function createContentMismatchFix(
  error: CodeRefError,
  config: CodeRefConfig
): FixAction | FixAction[] {
  const { ref } = error;
  const projectRoot = config.projectRoot;
  const absolutePath = path.resolve(projectRoot, ref.refPath);

  // When only symbol is specified (no line numbers): return multiple options
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

      // Option 1: Replace code block with complete code
      const option1: FixAction = {
        type: 'REPLACE_CODE_BLOCK',
        error,
        description: `Replace code block with entire symbol (lines ${symbolMatch.startLine}-${symbolMatch.endLine}, ${symbolMatch.endLine - symbolMatch.startLine + 1} lines)`,
        preview:
          symbolCode.length > 300
            ? `\`\`\`typescript\n${symbolCode.substring(0, 300)}...\n\`\`\` (${symbolMatch.endLine - symbolMatch.startLine + 1} lines)`
            : `\`\`\`typescript\n${symbolCode}\n\`\`\``,
        newCodeBlock: symbolCode,
      };

      // Option 2: Remove symbol specification and change to line number specification
      const oldComment = ref.fullMatch;
      const newComment = `<!-- CODE_REF: ${ref.refPath}:${symbolMatch.startLine}-${symbolMatch.endLine} -->`;

      const option2: FixAction = {
        type: 'UPDATE_LINE_NUMBERS',
        error,
        description: `Remove symbol specification and change to line number specification (maintain code block, manual adjustment needed)`,
        preview: `${oldComment}\n→ ${newComment}`,
        newStartLine: symbolMatch.startLine,
        newEndLine: symbolMatch.endLine,
        newCodeBlock: ref.codeBlock, // Maintain existing code block
      };

      return [option1, option2];
    }
  }

  // Existing logic when line numbers are specified
  if (ref.startLine === null || ref.endLine === null) {
    throw new Error('CODE_CONTENT_MISMATCH requires line numbers or symbol specification');
  }

  const actualCode = extractLinesFromFile(absolutePath, ref.startLine, ref.endLine);

  // Check if specified line range is incomplete scope (e.g., middle of function) using AST analysis
  // Detect scope using only start line (to avoid false detection when using entire range)
  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  const expandedMatches = expandMatchToScope({
    filePath: absolutePath,
    originalMatch: { start: ref.startLine, end: ref.startLine },
    fileContent,
  });

  // Update line numbers if expansion result differs from original range and has high confidence
  const expanded = expandedMatches[0];
  if (
    expanded?.confidence === 'high' &&
    (expanded.start !== ref.startLine || expanded.end !== ref.endLine)
  ) {
    // Update line numbers if scope expansion succeeds
    const expandedCode = extractLinesFromFile(absolutePath, expanded.start, expanded.end);
    const scopeInfo = expanded.scopeType ? ` (${expanded.scopeType})` : '';
    console.log(
      `   ℹ️  Expanded ${ref.startLine}-${ref.endLine} to ${expanded.start}-${expanded.end} using AST analysis${scopeInfo}`
    );

    const oldComment = ref.fullMatch;
    const newComment = `<!-- CODE_REF: ${ref.refPath}:${expanded.start}-${expanded.end} -->`;

    return {
      type: 'UPDATE_LINE_NUMBERS',
      error,
      description: `Update line numbers from ${ref.startLine}-${ref.endLine} to ${expanded.start}-${expanded.end} using AST analysis and replace code block`,
      preview: `${oldComment}\n→ ${newComment}`,
      newStartLine: expanded.start,
      newEndLine: expanded.end,
      newCodeBlock: expandedCode,
    };
  }

  // If AST expansion is unnecessary or fails, replace only code block as before
  const expectedPreview = error.expectedCode?.substring(0, 100) || '';
  const actualPreview = actualCode.substring(0, 100);

  return {
    type: 'REPLACE_CODE_BLOCK',
    error,
    description: 'Replace code block with actual code content',
    preview: `Expected: ${expectedPreview}${expectedPreview.length >= 100 ? '...' : ''}\nActual: ${actualPreview}${actualPreview.length >= 100 ? '...' : ''}`,
    newCodeBlock: actualCode,
  };
}

/**
 * Create fix action for LINE_OUT_OF_RANGE
 */
export function createLineOutOfRangeFix(error: CodeRefError): FixAction {
  const { ref } = error;

  // Extract line count from error message
  const match = /(\d+)\s*>\s*(\d+)/.exec(error.message);
  if (!match) {
    throw new Error('Cannot get line count from LINE_OUT_OF_RANGE error message');
  }

  const totalLines = parseInt(match[2], 10);
  const oldComment = ref.fullMatch;
  const newComment = `<!-- CODE_REF: ${ref.refPath}:${ref.startLine}-${totalLines} -->`;

  return {
    type: 'UPDATE_END_LINE',
    error,
    description: `Fix end line from ${ref.endLine} to ${totalLines} (end of file)`,
    preview: `${oldComment}\n→ ${newComment}`,
    newStartLine: ref.startLine!,
    newEndLine: totalLines,
  };
}

/**
 * Create fix action for SYMBOL_RANGE_MISMATCH
 */
export function createSymbolRangeMismatchFix(error: CodeRefError): FixAction {
  if (!error.suggestedSymbol) {
    throw new Error('SYMBOL_RANGE_MISMATCH requires suggestedSymbol');
  }

  const { ref } = error;
  const suggested = error.suggestedSymbol;

  const oldComment = ref.fullMatch;
  const newComment = `<!-- CODE_REF: ${ref.refPath}#${ref.symbolPath}:${suggested.startLine}-${suggested.endLine} -->`;

  return {
    type: 'UPDATE_SYMBOL_RANGE',
    error,
    description: `Update line numbers for symbol "${ref.symbolPath}" from ${ref.startLine}-${ref.endLine} to ${suggested.startLine}-${suggested.endLine}`,
    preview: `${oldComment}\n→ ${newComment}`,
    newStartLine: suggested.startLine,
    newEndLine: suggested.endLine,
  };
}

/**
 * Create fix action for MULTIPLE_SYMBOLS_FOUND (interactive selection)
 */
export async function createMultipleSymbolsFoundFix(
  error: CodeRefError,
  rl: readline.Interface
): Promise<FixAction | null> {
  if (!error.foundSymbols || error.foundSymbols.length === 0) {
    throw new Error('MULTIPLE_SYMBOLS_FOUND requires foundSymbols');
  }

  const { ref } = error;

  const options = error.foundSymbols.map((symbol) => {
    const classInfo = symbol.className ? `${symbol.className}#` : '';
    return `Line ${symbol.startLine}-${symbol.endLine} (${classInfo}${symbol.memberName})`;
  });

  const selectedIndex = await askSelectOption(
    rl,
    options,
    `⚠️  Symbol "${ref.symbolPath}" found in ${error.foundSymbols.length} locations. Which position should be used?`
  );

  const selected = error.foundSymbols[selectedIndex];

  const oldComment = ref.fullMatch;
  const newComment = `<!-- CODE_REF: ${ref.refPath}#${ref.symbolPath}:${selected.startLine}-${selected.endLine} -->`;

  return {
    type: 'UPDATE_SYMBOL_RANGE',
    error,
    description: `Add line numbers for symbol "${ref.symbolPath}": ${selected.startLine}-${selected.endLine}`,
    preview: `${oldComment}\n→ ${newComment}`,
    newStartLine: selected.startLine,
    newEndLine: selected.endLine,
  };
}

/**
 * Create fix action based on error type
 */
export async function createFixAction(
  error: CodeRefError,
  config: CodeRefConfig,
  rl?: readline.Interface
): Promise<FixAction | FixAction[] | null> {
  if (!isFixableError(error)) {
    return null;
  }

  switch (error.type) {
    case 'CODE_LOCATION_MISMATCH':
      return createLocationMismatchFix(error, config);
    case 'CODE_BLOCK_MISSING':
      return createBlockMissingFix(error, config);
    case 'CODE_CONTENT_MISMATCH':
      return createContentMismatchFix(error, config);
    case 'LINE_OUT_OF_RANGE':
      return createLineOutOfRangeFix(error);
    case 'SYMBOL_RANGE_MISMATCH':
      return createSymbolRangeMismatchFix(error);
    case 'MULTIPLE_SYMBOLS_FOUND':
      if (!rl) {
        throw new Error('MULTIPLE_SYMBOLS_FOUND requires readline.Interface');
      }
      return await createMultipleSymbolsFoundFix(error, rl);
    default:
      return null;
  }
}

/**
 * Apply fix to markdown file
 * @returns Line delta (positive: lines added, negative: lines removed, 0: no change)
 */
export function applyFix(action: FixAction): number {
  const filePath = action.error.ref.docFile;
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalLines = content.split('\n').length;

  switch (action.type) {
    case 'UPDATE_LINE_NUMBERS':
    case 'UPDATE_END_LINE': {
      // Update CODE_REF comment
      const oldComment = action.error.ref.fullMatch;
      const newComment = `<!-- CODE_REF: ${action.error.ref.refPath}:${action.newStartLine}-${action.newEndLine} -->`;
      content = replaceCodeRefComment(content, oldComment, newComment);

      // Also update code block (if exists)
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
        throw new Error('Code block not found');
      }
      content = replaceCodeBlock(content, action.error.ref.codeBlock, action.newCodeBlock!);
      break;
    }

    case 'MOVE_CODE_REF_COMMENT': {
      if (!action.codeBlockPosition) {
        throw new Error('MOVE_CODE_REF_COMMENT requires codeBlockPosition');
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

  // Return line delta
  const newLines = content.split('\n').length;
  return newLines - originalLines;
}

/**
 * Prioritization context
 */
interface PrioritizationContext {
  originalStart: number;
  originalEnd: number;
}

/**
 * Prioritization considering confidence and scope type
 *
 * @param matches Array of expanded matches
 * @param context Prioritization context (original line numbers)
 * @returns Prioritized matches (considering confidence and scope type)
 */
function prioritizeMatchesWithConfidence(
  matches: ExpandedMatch[],
  context: PrioritizationContext
): ExpandedMatch[] {
  return matches.sort((a, b) => {
    // 1. Prioritize by confidence (highest priority)
    const confidenceScore = { high: 3, medium: 2, low: 1 };
    const confDiff = confidenceScore[b.confidence] - confidenceScore[a.confidence];
    if (confDiff !== 0) return confDiff;

    // 2. Prioritize by proximity to original line numbers
    const distanceA = Math.abs(a.start - context.originalStart);
    const distanceB = Math.abs(b.start - context.originalStart);
    const distDiff = distanceA - distanceB;
    if (distDiff !== 0) return distDiff;

    // 3. Scope type priority
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

    // 4. Prioritize shorter range (more specific match)
    return a.end - a.start - (b.end - b.start);
  });
}

/**
 * Handle multiple matches
 */
export async function handleMultipleMatches(
  error: CodeRefError,
  rl: readline.Interface,
  config: CodeRefConfig
): Promise<FixAction | null> {
  const { ref } = error;

  if (!ref.codeBlock) {
    return null;
  }

  const projectRoot = config.projectRoot;
  const absolutePath = path.resolve(projectRoot, ref.refPath);

  // Use AST analysis with scope expansion
  const matches = searchCodeInFileWithScopeExpansion(absolutePath, ref.codeBlock);

  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    // Single match - create fix action
    const match = matches[0];
    const confidenceInfo =
      match.confidence === 'high' && match.scopeType
        ? ` (${match.scopeType})`
        : match.confidence === 'low'
          ? ' (low confidence)'
          : '';
    console.log(
      `\n✓ Detected single match in ${ref.refPath}: lines ${match.start}-${match.end}${confidenceInfo}`
    );
    return {
      type: 'UPDATE_LINE_NUMBERS',
      error,
      description: `Update line numbers from ${ref.startLine}-${ref.endLine} to ${match.start}-${match.end}`,
      preview: `<!-- CODE_REF: ${ref.refPath}:${match.start}-${match.end} -->`,
      newStartLine: match.start,
      newEndLine: match.end,
      matchOptions: matches.map((m) => ({ start: m.start, end: m.end })),
    };
  }

  // Multiple matches - try automatic selection with prioritization
  const sortedMatches = prioritizeMatchesWithConfidence(matches, {
    originalStart: ref.startLine!,
    originalEnd: ref.endLine!,
  });

  // Auto-select if only one high-confidence match
  const highConfidenceMatches = sortedMatches.filter((m) => m.confidence === 'high');
  if (highConfidenceMatches.length === 1) {
    const bestMatch = highConfidenceMatches[0];
    const scopeInfo = bestMatch.scopeType ? ` (${bestMatch.scopeType})` : '';
    console.log(
      `\n✓ Auto-selected most appropriate match in ${ref.refPath}: lines ${bestMatch.start}-${bestMatch.end}${scopeInfo}`
    );
    return {
      type: 'UPDATE_LINE_NUMBERS',
      error,
      description: `Update line numbers from ${ref.startLine}-${ref.endLine} to ${bestMatch.start}-${bestMatch.end}`,
      preview: `<!-- CODE_REF: ${ref.refPath}:${bestMatch.start}-${bestMatch.end} -->`,
      newStartLine: bestMatch.start,
      newEndLine: bestMatch.end,
      matchOptions: matches.map((m) => ({ start: m.start, end: m.end })),
    };
  }

  // Otherwise let user choose
  console.log(`\n⚠️  Code found in ${matches.length} locations in ${ref.refPath}:`);
  const options = sortedMatches.map((m) => {
    const confidenceLabel =
      m.confidence === 'high' ? 'high' : m.confidence === 'medium' ? 'medium' : 'low';
    const scopeInfo = m.scopeType && m.scopeType !== 'unknown' ? `, ${m.scopeType}` : '';
    return `Line ${m.start}-${m.end} (confidence: ${confidenceLabel}${scopeInfo})`;
  });

  const selection = await askSelectOption(rl, options, 'Which position should be used?');
  const selectedMatch = sortedMatches[selection];

  // Warn if selected match has low confidence
  if (selectedMatch.confidence === 'low') {
    console.warn('⚠️  Scope detection confidence is low, please verify the result.');
  }
  if (selectedMatch.expansionType === 'none') {
    console.warn('⚠️  Structural analysis failed, using simple string matching.');
  }

  return {
    type: 'UPDATE_LINE_NUMBERS',
    error,
    description: `Update line numbers from ${ref.startLine}-${ref.endLine} to ${selectedMatch.start}-${selectedMatch.end}`,
    preview: `<!-- CODE_REF: ${ref.refPath}:${selectedMatch.start}-${selectedMatch.end} -->`,
    newStartLine: selectedMatch.start,
    newEndLine: selectedMatch.end,
    matchOptions: matches.map((m) => ({ start: m.start, end: m.end })),
  };
}
