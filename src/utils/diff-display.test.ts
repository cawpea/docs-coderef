import { displayCodeDiff, displayLineRangeDiff, truncateText } from '@/utils/diff-display';

describe('displayCodeDiff', () => {
  it('一致するコードの場合、差分を表示しない', () => {
    const code = 'const foo = "bar";\nconst baz = 42;';
    const result = displayCodeDiff(code, code);

    // ヘッダーとフッターが含まれることを確認
    expect(result).toContain('Expected code');
    expect(result).toContain('Actual code');
    // 差分マーカー（- や +）がないことを確認
    expect(result.split('\n').filter((line) => line.startsWith('-')).length).toBe(0);
    expect(result.split('\n').filter((line) => line.startsWith('+')).length).toBe(0);
  });

  it('異なるコードの場合、削除と追加を表示する', () => {
    const expected = 'const foo = "bar";\nconst baz = 42;';
    const actual = 'const foo = "baz";\nconst qux = 100;';
    const result = displayCodeDiff(expected, actual);

    // 削除された行（期待されるコード）
    expect(result).toContain('- const foo = "bar";');
    expect(result).toContain('- const baz = 42;');

    // 追加された行（実際のコード）
    expect(result).toContain('+ const foo = "baz";');
    expect(result).toContain('+ const qux = 100;');
  });

  it('行数が異なる場合も正しく表示する', () => {
    const expected = 'line1\nline2';
    const actual = 'line1\nline2\nline3';
    const result = displayCodeDiff(expected, actual);

    // 一致する行
    expect(result).toContain('  line1');
    expect(result).toContain('  line2');

    // 追加された行
    expect(result).toContain('+ line3');
  });

  it('空文字列の比較も処理できる', () => {
    const result = displayCodeDiff('', 'new line');

    expect(result).toContain('+ new line');
  });
});

describe('displayLineRangeDiff', () => {
  it('行範囲の差分を正しく表示する', () => {
    const code = 'const foo = "bar";\nconst baz = 42;';
    const expectedRange = { start: 10, end: 11 };
    const actualRange = { start: 15, end: 16 };
    const result = displayLineRangeDiff(code, expectedRange, actualRange);

    // ヘッダーが含まれることを確認
    expect(result).toContain('Expected line range: 10-11');
    expect(result).toContain('Actual line range: 15-16');

    // 行番号が表示されることを確認（ANSIカラーコードを含む形式）
    expect(result).toContain('10');
    expect(result).toContain('15');
    expect(result).toContain('11');
    expect(result).toContain('16');

    // コードが含まれることを確認
    expect(result).toContain('const foo = "bar";');
    expect(result).toContain('const baz = 42;');
  });

  it('単一行の場合も正しく表示する', () => {
    const code = 'const foo = "bar";';
    const expectedRange = { start: 5, end: 5 };
    const actualRange = { start: 10, end: 10 };
    const result = displayLineRangeDiff(code, expectedRange, actualRange);

    expect(result).toContain('Expected line range: 5-5');
    expect(result).toContain('Actual line range: 10-10');
    expect(result).toContain('5');
    expect(result).toContain('10');
    expect(result).toContain('const foo = "bar";');
  });

  it('大きな行番号も正しく表示する', () => {
    const code = 'line1\nline2\nline3';
    const expectedRange = { start: 100, end: 102 };
    const actualRange = { start: 200, end: 202 };
    const result = displayLineRangeDiff(code, expectedRange, actualRange);

    expect(result).toContain('100');
    expect(result).toContain('200');
    expect(result).toContain('101');
    expect(result).toContain('201');
    expect(result).toContain('102');
    expect(result).toContain('202');
    expect(result).toContain('line1');
    expect(result).toContain('line2');
    expect(result).toContain('line3');
  });
});

describe('truncateText', () => {
  it('最大長以下のテキストはそのまま返す', () => {
    const text = 'short text';
    expect(truncateText(text, 20)).toBe(text);
  });

  it('最大長を超えるテキストは切り詰める', () => {
    const text = 'This is a very long text that should be truncated';
    const result = truncateText(text, 20);

    expect(result).toBe('This is a very long ...');
    expect(result.length).toBe(23); // 20 + '...'
  });

  it('空文字列を処理できる', () => {
    expect(truncateText('', 10)).toBe('');
  });
});
