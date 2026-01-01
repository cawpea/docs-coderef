/**
 * Core validation logic for CODE_REF references in markdown documentation
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  findSymbolInAST,
  isTypeScriptOrJavaScript,
  parseSymbolPath,
  selectBestSymbolMatch,
} from '@/utils/ast-symbol-search';
import {
  compareCodeContent,
  extractLinesFromFile,
  searchCodeInFile,
} from '@/utils/code-comparison';
import { associateCodeBlocksWithRefs } from '@/utils/markdown';
import type { CodeRef, CodeRefError } from '@/utils/types';
import { loadConfig, type CodeRefConfig } from '@/config';

// CODE_REF pattern constant
const CODE_REF_PATTERN = /<!--\s*CODE_REF:\s*([^:#]+?)(?:#([^:]+?))?(?::(\d+)-(\d+))?\s*-->/g;

/**
 * Recursively walk directory to get markdown files
 */
export function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentPath: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Detect code block and inline code ranges
 */
function getCodeBlockRanges(content: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];

  // Find all backtick sequences (3 or more consecutive backticks)
  const backtickSequences: { position: number; length: number }[] = [];
  let i = 0;

  while (i < content.length) {
    if (content[i] === '`') {
      const start = i;
      let count = 0;

      // Count consecutive backticks
      while (i < content.length && content[i] === '`') {
        count++;
        i++;
      }

      // Only consider sequences of 3 or more backticks as code block delimiters
      if (count >= 3) {
        backtickSequences.push({ position: start, length: count });
      }
    } else {
      i++;
    }
  }

  // Pair up backtick sequences with matching lengths
  const used = new Set<number>();

  for (let i = 0; i < backtickSequences.length; i++) {
    if (used.has(i)) continue;

    const opening = backtickSequences[i];

    // Find the next sequence with the same length
    for (let j = i + 1; j < backtickSequences.length; j++) {
      if (used.has(j)) continue;

      const closing = backtickSequences[j];

      if (opening.length === closing.length) {
        // Found a matching pair
        ranges.push({
          start: opening.position,
          end: closing.position + closing.length,
        });
        used.add(i);
        used.add(j);
        break;
      }
    }
  }

  // Handle unclosed code blocks (sequences without a matching pair)
  for (let i = 0; i < backtickSequences.length; i++) {
    if (!used.has(i)) {
      ranges.push({
        start: backtickSequences[i].position,
        end: content.length,
      });
    }
  }

  // Inline code (single backticks)
  const inlineCodePattern = /`[^`\n]+?`/g;
  let match: RegExpExecArray | null;

  while ((match = inlineCodePattern.exec(content)) !== null) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return ranges;
}

/**
 * Check if position is inside code block or inline code
 */
function isInsideCodeBlock(position: number, ranges: { start: number; end: number }[]): boolean {
  return ranges.some((range) => position >= range.start && position < range.end);
}

/**
 * Extract CODE_REF comments
 */
export function extractCodeRefs(content: string, filePath: string): CodeRef[] {
  const refs: CodeRef[] = [];
  let match: RegExpExecArray | null;

  // Pre-detect code block and inline code ranges
  const codeBlockRanges = getCodeBlockRanges(content);

  while ((match = CODE_REF_PATTERN.exec(content)) !== null) {
    const [fullMatch, refPath, symbolPath, startLine, endLine] = match;

    // Exclude CODE_REFs inside code blocks or inline code (for sample display)
    if (isInsideCodeBlock(match.index, codeBlockRanges)) {
      continue;
    }

    // Calculate line number from match position (1-indexed)
    const beforeMatch = content.substring(0, match.index);
    const docLineNumber = beforeMatch.split('\n').length;

    // Parse symbol path
    let className: string | undefined;
    let memberName: string | undefined;
    if (symbolPath) {
      const parsed = parseSymbolPath(symbolPath);
      className = parsed.className;
      memberName = parsed.memberName;
    }

    refs.push({
      fullMatch,
      refPath: refPath.trim(),
      startLine: startLine ? parseInt(startLine, 10) : null,
      endLine: endLine ? parseInt(endLine, 10) : null,
      docFile: filePath,
      docLineNumber,
      codeBlockStartOffset: match.index, // Save CODE_REF comment position
      symbolPath: symbolPath?.trim(),
      className,
      memberName,
    });
  }

  // Associate code blocks
  return associateCodeBlocksWithRefs(content, refs);
}

/**
 * Validate code content
 */
export function validateCodeContent(ref: CodeRef, config?: CodeRefConfig): CodeRefError[] {
  const cfg = config || loadConfig();
  const projectRoot = cfg.projectRoot;
  const errors: CodeRefError[] = [];

  // Process when line numbers not specified
  if (ref.startLine === null || ref.endLine === null) {
    // When symbol specified, validate exact match with entire symbol
    if (ref.symbolPath) {
      // Return error if no code block
      if (!ref.codeBlock || ref.codeBlock.trim() === '') {
        errors.push({
          type: 'CODE_BLOCK_MISSING',
          message: `Code block not found after CODE_REF with symbol specification (${ref.refPath}#${ref.symbolPath}).`,
          ref,
        });
        return errors;
      }

      // Get symbol range
      const absolutePath = path.resolve(projectRoot, ref.refPath);
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

        // Compare code block with entire symbol (ignore whitespace and newlines)
        if (!compareCodeContent(symbolCode, ref.codeBlock)) {
          errors.push({
            type: 'CODE_CONTENT_MISMATCH',
            message: `Code block does not match entire symbol.`,
            ref,
            actualCode: symbolCode.substring(0, 200),
            expectedCode: ref.codeBlock.substring(0, 200),
          });
        }
      }
      return errors;
    }
    // Skip if no symbol specified (whole file reference)
    return errors;
  }

  // Continue normal validation if line numbers specified, even with symbol specification

  // If no code block
  if (!ref.codeBlock || ref.codeBlock.trim() === '') {
    const refLocation =
      ref.startLine !== null ? `${ref.refPath}:${ref.startLine}-${ref.endLine}` : ref.refPath;
    errors.push({
      type: 'CODE_BLOCK_MISSING',
      message: `Code block not found after CODE_REF (${refLocation}).`,
      ref,
    });
    return errors;
  }

  const absolutePath = path.resolve(projectRoot, ref.refPath);

  try {
    // Get code from actual file at specified lines
    const actualCode = extractLinesFromFile(absolutePath, ref.startLine, ref.endLine);

    // Compare code content
    if (!compareCodeContent(actualCode, ref.codeBlock)) {
      // Not matched → search entire file
      const matches = searchCodeInFile(absolutePath, ref.codeBlock);

      if (matches.length > 0) {
        // Code exists but at different location
        const firstMatch = matches[0];
        const matchInfo =
          matches.length > 1 ? `Code found in ${matches.length} locations. First occurrence: ` : '';

        errors.push({
          type: 'CODE_LOCATION_MISMATCH',
          message: `Line numbers do not match in ${ref.refPath}. ${matchInfo}(expect: ${ref.startLine}-${ref.endLine}, result: ${firstMatch.start}-${firstMatch.end})`,
          ref,
          suggestedLines: firstMatch,
        });
      } else {
        // Code content differs
        errors.push({
          type: 'CODE_CONTENT_MISMATCH',
          message: `Code does not match in ${ref.refPath}.`,
          ref,
          actualCode: actualCode.substring(0, 200),
          expectedCode: ref.codeBlock.substring(0, 200),
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push({
      type: 'READ_ERROR',
      message: `Error occurred during code comparison: ${errorMessage}`,
      ref,
    });
  }

  return errors;
}

/**
 * Validate symbol specification
 */
export function validateSymbolRef(ref: CodeRef, config?: CodeRefConfig): CodeRefError[] {
  const cfg = config || loadConfig();
  const projectRoot = cfg.projectRoot;
  const errors: CodeRefError[] = [];

  // Skip if no symbol specification
  if (!ref.symbolPath) {
    return errors;
  }

  const absolutePath = path.resolve(projectRoot, ref.refPath);

  // TypeScript/JavaScript file check
  if (!isTypeScriptOrJavaScript(absolutePath)) {
    errors.push({
      type: 'NOT_TYPESCRIPT_FILE',
      message: `Symbol specification only supported for TypeScript/JavaScript files: ${ref.refPath}`,
      ref,
    });
    return errors;
  }

  const fileContent = fs.readFileSync(absolutePath, 'utf-8');

  try {
    // Search for symbol
    const matches = findSymbolInAST(fileContent, absolutePath, {
      className: ref.className,
      memberName: ref.memberName!,
    });

    if (matches.length === 0) {
      // Symbol not found
      errors.push({
        type: 'SYMBOL_NOT_FOUND',
        message: `Symbol "${ref.symbolPath}" not found`,
        ref,
      });
    } else if (matches.length > 1 && !ref.startLine) {
      // Multiple matches (no line number hint)
      errors.push({
        type: 'MULTIPLE_SYMBOLS_FOUND',
        message: `Symbol "${ref.symbolPath}" found in ${matches.length} locations. Please specify line numbers`,
        ref,
        foundSymbols: matches,
      });
    } else {
      // Validate if line numbers specified
      if (ref.startLine && ref.endLine) {
        const bestMatch = selectBestSymbolMatch(matches, {
          start: ref.startLine,
          end: ref.endLine,
        });

        if (bestMatch) {
          // Check if range matches
          if (bestMatch.startLine !== ref.startLine || bestMatch.endLine !== ref.endLine) {
            errors.push({
              type: 'SYMBOL_RANGE_MISMATCH',
              message: `Symbol "${ref.symbolPath}" range does not match (expected: ${ref.startLine}-${ref.endLine}, actual: ${bestMatch.startLine}-${bestMatch.endLine})`,
              ref,
              suggestedSymbol: bestMatch,
            });
          }
        }
      }
    }
  } catch (error) {
    errors.push({
      type: 'READ_ERROR',
      message: `AST parsing error: ${error instanceof Error ? error.message : String(error)}`,
      ref,
    });
  }

  return errors;
}

/**
 * Validate existence of referenced file and line numbers
 */
export function validateCodeRef(ref: CodeRef, config?: CodeRefConfig): CodeRefError[] {
  const cfg = config || loadConfig();
  const projectRoot = cfg.projectRoot;
  const errors: CodeRefError[] = [];

  // Convert relative path to absolute path (relative to project root)
  const absolutePath = path.resolve(projectRoot, ref.refPath);

  // Prevent path traversal attacks: validate stays within project root
  if (!absolutePath.startsWith(projectRoot + path.sep)) {
    errors.push({
      type: 'PATH_TRAVERSAL',
      message: `Referenced path points outside project root: ${ref.refPath}`,
      ref,
    });
    return errors;
  }

  // Check file existence
  if (!fs.existsSync(absolutePath)) {
    errors.push({
      type: 'FILE_NOT_FOUND',
      message: `Referenced file not found: ${ref.refPath}`,
      ref,
    });
    return errors;
  }

  // Check line count if line numbers specified
  if (ref.startLine !== null && ref.endLine !== null) {
    try {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const lines = content.split('\n');
      const totalLines = lines.length;

      if (ref.startLine < 1) {
        errors.push({
          type: 'INVALID_LINE_NUMBER',
          message: `Start line number is invalid (less than 1): ${ref.startLine}`,
          ref,
        });
      }

      if (ref.endLine > totalLines) {
        errors.push({
          type: 'LINE_OUT_OF_RANGE',
          message: `End line number exceeds file line count: ${ref.endLine} > ${totalLines}`,
          ref,
        });
      }

      if (ref.startLine > ref.endLine) {
        errors.push({
          type: 'INVALID_RANGE',
          message: `Start line number is greater than end line number: ${ref.startLine} > ${ref.endLine}`,
          ref,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        type: 'READ_ERROR',
        message: `Failed to read file: ${errorMessage}`,
        ref,
      });
    }
  }

  // Symbol validation if symbol specified
  if (errors.length === 0 && ref.symbolPath) {
    const symbolErrors = validateSymbolRef(ref, cfg);
    errors.push(...symbolErrors);
  }

  // Validate code content (only if no existing errors)
  if (errors.length === 0) {
    const contentErrors = validateCodeContent(ref, cfg);
    errors.push(...contentErrors);
  }

  return errors;
}
