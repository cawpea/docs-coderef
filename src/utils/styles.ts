/**
 * Styling utilities for CLI output using chalk
 */

import chalk from 'chalk';
import type { FixAction } from './types';

/**
 * Color scheme (consistent with diff-display.ts and new additions)
 */
const colors = {
  // Existing colors from diff-display.ts
  success: chalk.green,
  error: chalk.red,
  dim: chalk.dim,

  // New colors for fix options
  primary: chalk.cyan.bold, // Option numbers
  muted: chalk.gray, // Supplementary info
  code: chalk.yellow, // Code blocks
};

/**
 * Box drawing characters
 */
const box = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
};

/**
 * Maximum number of lines to show in preview
 */
const MAX_PREVIEW_LINES = 20;

/**
 * Number of lines to show when truncating
 */
const TRUNCATE_SHOW_LINES = 15;

/**
 * Format fix options for display
 * @param options Array of fix actions to display
 * @returns Formatted string with styled options
 */
export function formatFixOptions(options: FixAction[]): string {
  const output: string[] = [];

  options.forEach((option, index) => {
    const optionNumber = index + 1;

    // Option header with box drawing
    const headerText = ` Option ${optionNumber} `;
    const headerLine = box.horizontal.repeat(60 - headerText.length);
    output.push(colors.dim(`  ${box.topLeft}${box.horizontal}${headerText}${headerLine}`));

    // Option description
    output.push(colors.dim(`  ${box.vertical} `) + colors.primary(option.description));

    // Extract line information from preview if available
    const lineInfo = extractLineInfo(option.preview);
    if (lineInfo) {
      output.push(colors.dim(`  ${box.vertical} `) + colors.muted(lineInfo));
    }

    // Preview section
    if (option.preview) {
      output.push(colors.dim(`  ${box.vertical}`));
      output.push(colors.dim(`  ${box.vertical} `) + colors.muted('Preview:'));

      const previewLines = formatPreview(option.preview);
      previewLines.forEach((line) => {
        output.push(colors.dim(`  ${box.vertical}   `) + line);
      });
    }

    // Bottom border
    output.push(colors.dim(`  ${box.bottomLeft}${box.horizontal.repeat(60)}`));

    // Add spacing between options (except after the last one)
    if (index < options.length - 1) {
      output.push('');
    }
  });

  return output.join('\n');
}

/**
 * Extract line information from preview text
 * @param preview Preview text
 * @returns Line information string or null
 */
function extractLineInfo(preview: string): string | null {
  // Look for patterns like "Lines: 10-25" or "Line: 10"
  const regex = /Lines?: (\d+)-?(\d+)?/i;
  const linesMatch = regex.exec(preview);
  if (linesMatch) {
    const start = linesMatch[1];
    const end = linesMatch[2];
    if (end) {
      const lineCount = parseInt(end) - parseInt(start) + 1;
      return `Lines: ${start}-${end} (${lineCount} lines)`;
    } else {
      return `Line: ${start}`;
    }
  }
  return null;
}

/**
 * Format preview text with truncation and syntax highlighting
 * @param preview Preview text
 * @returns Array of formatted lines
 */
function formatPreview(preview: string): string[] {
  const lines = preview.split('\n');
  const output: string[] = [];

  // Truncate if too long
  if (lines.length > MAX_PREVIEW_LINES) {
    const truncatedLines = lines.slice(0, TRUNCATE_SHOW_LINES);
    const remainingCount = lines.length - TRUNCATE_SHOW_LINES;

    truncatedLines.forEach((line) => {
      output.push(formatCodeLine(line));
    });

    output.push(colors.muted(`... (${remainingCount} more lines)`));
  } else {
    lines.forEach((line) => {
      output.push(formatCodeLine(line));
    });
  }

  return output;
}

/**
 * Format a single code line with basic syntax highlighting
 * @param line Code line
 * @returns Formatted line
 */
function formatCodeLine(line: string): string {
  // Apply basic syntax highlighting
  // Detect code block markers
  if (line.trim().startsWith('```')) {
    return colors.dim(line);
  }

  // Detect keywords (basic highlighting)
  const keywords = [
    'function',
    'const',
    'let',
    'var',
    'class',
    'interface',
    'type',
    'export',
    'import',
    'return',
    'if',
    'else',
    'for',
    'while',
  ];

  let formattedLine = line;
  keywords.forEach((keyword) => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
    formattedLine = formattedLine.replace(regex, chalk.cyan('$1'));
  });

  // Highlight strings (simple patterns for single and double quotes)
  formattedLine = formattedLine.replace(/'[^']*'/g, (match) => colors.code(match));
  formattedLine = formattedLine.replace(/"[^"]*"/g, (match) => colors.code(match));
  formattedLine = formattedLine.replace(/`[^`]*`/g, (match) => colors.code(match));

  return formattedLine;
}
