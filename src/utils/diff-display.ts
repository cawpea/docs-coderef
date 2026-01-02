/**
 * Utility for visually displaying code diffs
 */

import { COLOR_SCHEMES } from './message-formatter';

/**
 * Display diff between two code blocks line by line
 * @param expected Expected code (code block in document)
 * @param actual Actual code (code retrieved from file)
 * @returns Colored diff display string
 */
export function displayCodeDiff(expected: string, actual: string): string {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');

  const output: string[] = [];
  const maxLines = Math.max(expectedLines.length, actualLines.length);

  // Header
  output.push(COLOR_SCHEMES.dim('━'.repeat(64)));
  output.push(COLOR_SCHEMES.error('- Expected code (in document)'));
  output.push(COLOR_SCHEMES.success('+ Actual code (in file)'));
  output.push(COLOR_SCHEMES.dim('━'.repeat(64)));

  // Buffer for grouping consecutive changes
  const removedLines: string[] = [];
  const addedLines: string[] = [];

  const flushChanges = () => {
    // Output all removed lines first, then all added lines
    removedLines.forEach((line) => {
      output.push(COLOR_SCHEMES.error(`- ${line}`));
    });
    addedLines.forEach((line) => {
      output.push(COLOR_SCHEMES.success(`+ ${line}`));
    });
    removedLines.length = 0;
    addedLines.length = 0;
  };

  // Compare line by line
  for (let i = 0; i < maxLines; i++) {
    const expectedLine = expectedLines[i];
    const actualLine = actualLines[i];

    if (expectedLine === actualLine) {
      // Flush any pending changes before showing matching lines
      if (removedLines.length > 0 || addedLines.length > 0) {
        flushChanges();
      }
      // Matching lines (when both exist)
      if (expectedLine !== undefined) {
        output.push(`  ${expectedLine}`);
      }
    } else {
      // Buffer expected lines (deleted lines)
      if (expectedLine !== undefined) {
        removedLines.push(expectedLine);
      }
      // Buffer actual lines (added lines)
      if (actualLine !== undefined) {
        addedLines.push(actualLine);
      }
    }
  }

  // Flush any remaining changes
  if (removedLines.length > 0 || addedLines.length > 0) {
    flushChanges();
  }

  output.push(COLOR_SCHEMES.dim('━'.repeat(64)));

  return output.join('\n');
}

/**
 * Visually display line number diff (for CODE_LOCATION_MISMATCH)
 * @param code Code content
 * @param expectedRange Expected line range
 * @param actualRange Actual line range
 * @returns Colored line number diff display string
 */
export function displayLineRangeDiff(
  code: string,
  expectedRange: { start: number; end: number },
  actualRange: { start: number; end: number }
): string {
  const output: string[] = [];

  // Header
  output.push(COLOR_SCHEMES.dim('━'.repeat(64)));
  output.push(
    COLOR_SCHEMES.error(`- Expected line range: ${expectedRange.start}-${expectedRange.end}`)
  );
  output.push(
    COLOR_SCHEMES.success(`+ Actual line range: ${actualRange.start}-${actualRange.end}`)
  );
  output.push(COLOR_SCHEMES.dim('━'.repeat(64)));

  // Display code (content is the same, show both line numbers)
  const codeLines = code.split('\n');
  codeLines.forEach((line, index) => {
    const expectedLineNum = expectedRange.start + index;
    const actualLineNum = actualRange.start + index;

    // Display expected and actual line numbers side by side
    output.push(
      `${COLOR_SCHEMES.error(expectedLineNum.toString().padStart(4))} | ` +
        `${COLOR_SCHEMES.success(actualLineNum.toString().padStart(4))} | ` +
        `${line}`
    );
  });

  output.push(COLOR_SCHEMES.dim('━'.repeat(64)));

  return output.join('\n');
}

/**
 * Truncate long text (for display)
 * @param text Text
 * @param maxLength Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.substring(0, maxLength)}...`;
}
