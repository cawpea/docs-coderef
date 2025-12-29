/**
 * コードの差分を視覚的に表示するユーティリティ
 */

// ANSIカラーコード
const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  RESET: '\x1b[0m',
  DIM: '\x1b[2m',
};

/**
 * 2つのコードブロックの差分を行単位で表示
 * @param expected 期待されるコード（ドキュメント内のコードブロック）
 * @param actual 実際のコード（ファイルから取得したコード）
 * @returns 色付けされた差分表示の文字列
 */
export function displayCodeDiff(expected: string, actual: string): string {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');

  const output: string[] = [];
  const maxLines = Math.max(expectedLines.length, actualLines.length);

  // ヘッダー
  output.push(
    `${COLORS.DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.RESET}`
  );
  output.push(`${COLORS.RED}- 期待されるコード (ドキュメント内)${COLORS.RESET}`);
  output.push(`${COLORS.GREEN}+ 実際のコード (ファイル内)${COLORS.RESET}`);
  output.push(
    `${COLORS.DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.RESET}`
  );

  // 行ごとに比較
  for (let i = 0; i < maxLines; i++) {
    const expectedLine = expectedLines[i];
    const actualLine = actualLines[i];

    if (expectedLine === actualLine) {
      // 一致する行（両方存在する場合）
      if (expectedLine !== undefined) {
        output.push(`  ${expectedLine}`);
      }
    } else {
      // 期待される行（削除された行）
      if (expectedLine !== undefined) {
        output.push(`${COLORS.RED}- ${expectedLine}${COLORS.RESET}`);
      }
      // 実際の行（追加された行）
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
 * 行番号の差分を視覚的に表示（CODE_LOCATION_MISMATCH用）
 * @param code コードの内容
 * @param expectedRange 期待される行範囲
 * @param actualRange 実際の行範囲
 * @returns 色付けされた行番号差分表示の文字列
 */
export function displayLineRangeDiff(
  code: string,
  expectedRange: { start: number; end: number },
  actualRange: { start: number; end: number }
): string {
  const output: string[] = [];

  // ヘッダー
  output.push(
    `${COLORS.DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.RESET}`
  );
  output.push(
    `${COLORS.RED}- 期待される行範囲: ${expectedRange.start}-${expectedRange.end}${COLORS.RESET}`
  );
  output.push(
    `${COLORS.GREEN}+ 実際の行範囲: ${actualRange.start}-${actualRange.end}${COLORS.RESET}`
  );
  output.push(
    `${COLORS.DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.RESET}`
  );

  // コードを表示（内容は同じなので、両方の行番号を表示）
  const codeLines = code.split('\n');
  codeLines.forEach((line, index) => {
    const expectedLineNum = expectedRange.start + index;
    const actualLineNum = actualRange.start + index;

    // 期待される行番号と実際の行番号を並べて表示
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
 * 長いテキストを切り詰める（表示用）
 * @param text テキスト
 * @param maxLength 最大長
 * @returns 切り詰められたテキスト
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.substring(0, maxLength)}...`;
}
