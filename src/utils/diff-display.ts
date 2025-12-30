/**
 * Utility for visually displaying code diffs
 */

// ANSI color codes
const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  RESET: '\x1b[0m',
  DIM: '\x1b[2m',
};

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
  output.push(
    `${COLORS.DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.RESET}`
  );
  output.push(`${COLORS.RED}- Expected code (in document)${COLORS.RESET}`);
  output.push(`${COLORS.GREEN}+ Actual code (in file)${COLORS.RESET}`);
  output.push(
    `${COLORS.DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.RESET}`
  );

  // Compare line by line
  for (let i = 0; i < maxLines; i++) {
    const expectedLine = expectedLines[i];
    const actualLine = actualLines[i];

    if (expectedLine === actualLine) {
      // Matching lines (when both exist)
      if (expectedLine !== undefined) {
        output.push(`  ${expectedLine}`);
      }
    } else {
      // Expected lines (deleted lines)
      if (expectedLine !== undefined) {
        output.push(`${COLORS.RED}- ${expectedLine}${COLORS.RESET}`);
      }
      // Actual lines (added lines)
      if (actualLine !== undefined) {
        output.push(`${COLORS.GREEN}+ ${actualLine}${COLORS.RESET}`);
      }
    }
  }

  output.push(
    `${COLORS.DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.RESET}`
  );

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
  output.push(
    `${COLORS.DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.RESET}`
  );
  output.push(
    `${COLORS.RED}- Expected line range: ${expectedRange.start}-${expectedRange.end}${COLORS.RESET}`
  );
  output.push(
    `${COLORS.GREEN}+ Actual line range: ${actualRange.start}-${actualRange.end}${COLORS.RESET}`
  );
  output.push(
    `${COLORS.DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.RESET}`
  );

  // Display code (content is the same, show both line numbers)
  const codeLines = code.split('\n');
  codeLines.forEach((line, index) => {
    const expectedLineNum = expectedRange.start + index;
    const actualLineNum = actualRange.start + index;

    // Display expected and actual line numbers side by side
    output.push(
      `${COLORS.RED}${expectedLineNum.toString().padStart(4)}${COLORS.RESET} | ` +
        `${COLORS.GREEN}${actualLineNum.toString().padStart(4)}${COLORS.RESET} | ` +
        `${line}`
    );
  });

  output.push(
    `${COLORS.DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.RESET}`
  );

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
