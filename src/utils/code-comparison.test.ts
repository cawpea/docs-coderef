import * as fs from 'fs';

import { jest } from '@jest/globals';

import {
  compareCodeContent,
  dedentCode,
  extractLinesFromFile,
  searchCodeInFile,
} from '@/utils/code-comparison';

// fsモジュールをモック
jest.mock('fs');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('code-comparison.utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('dedentCode', () => {
    it('インデントがないコードはそのまま返すこと', () => {
      const code = 'function test() {\n  return 42;\n}';
      expect(dedentCode(code)).toBe(code);
    });

    it('共通の先頭インデントを除去すること', () => {
      const code = '    function test() {\n      return 42;\n    }';
      const expected = 'function test() {\n  return 42;\n}';
      expect(dedentCode(code)).toBe(expected);
    });

    it('空行はそのまま保持すること', () => {
      const code = '    function test() {\n\n      return 42;\n    }';
      const expected = 'function test() {\n\n  return 42;\n}';
      expect(dedentCode(code)).toBe(expected);
    });

    it('最小インデントを基準に除去すること', () => {
      const code = '      if (true) {\n        doSomething();\n      }';
      const expected = 'if (true) {\n  doSomething();\n}';
      expect(dedentCode(code)).toBe(expected);
    });

    it('空文字列を処理できること', () => {
      expect(dedentCode('')).toBe('');
    });

    it('空行のみの場合はそのまま返すこと', () => {
      const code = '\n\n\n';
      expect(dedentCode(code)).toBe(code);
    });

    it('タブインデントも正しく処理すること', () => {
      const code = '\t\tfunction test() {\n\t\t\treturn 42;\n\t\t}';
      const expected = 'function test() {\n\treturn 42;\n}';
      expect(dedentCode(code)).toBe(expected);
    });

    it('混合インデント（スペースとタブ）も処理すること', () => {
      const code = '    \tfunction test() {\n    \t  return 42;\n    \t}';
      const expected = 'function test() {\n  return 42;\n}';
      expect(dedentCode(code)).toBe(expected);
    });
  });

  describe('extractLinesFromFile', () => {
    it('指定行範囲のコードを抽出できること', () => {
      const fileContent = `line1
line2
line3
line4
line5`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = extractLinesFromFile('/test/file.ts', 2, 4);

      expect(result).toBe('line2\nline3\nline4');
      expect(mockedFs.readFileSync).toHaveBeenCalledWith('/test/file.ts', 'utf-8');
    });

    it('1行のみを抽出できること', () => {
      const fileContent = `line1
line2
line3`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = extractLinesFromFile('/test/file.ts', 2, 2);

      expect(result).toBe('line2');
    });

    it('ファイルの最初から抽出できること', () => {
      const fileContent = `line1
line2
line3`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = extractLinesFromFile('/test/file.ts', 1, 2);

      expect(result).toBe('line1\nline2');
    });

    it('ファイルの最後まで抽出できること', () => {
      const fileContent = `line1
line2
line3`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = extractLinesFromFile('/test/file.ts', 2, 3);

      expect(result).toBe('line2\nline3');
    });
  });

  describe('compareCodeContent', () => {
    it('完全に一致するコードをtrueと判定すること', () => {
      const code1 = 'const x = 1;';
      const code2 = 'const x = 1;';

      expect(compareCodeContent(code1, code2)).toBe(true);
    });

    it('空白の違いのみの場合はtrueと判定すること', () => {
      const code1 = '  const x = 1;  ';
      const code2 = 'const x = 1;';

      expect(compareCodeContent(code1, code2)).toBe(true);
    });

    it('改行の違いを吸収してtrueと判定すること', () => {
      const code1 = 'line1\r\nline2';
      const code2 = 'line1\nline2';

      expect(compareCodeContent(code1, code2)).toBe(true);
    });

    it('インデントの違いを吸収してtrueと判定すること', () => {
      const code1 = '\tconst x = 1;';
      const code2 = '  const x = 1;';

      expect(compareCodeContent(code1, code2)).toBe(true);
    });

    it('コード内容が異なる場合はfalseと判定すること', () => {
      const code1 = 'const x = 1;';
      const code2 = 'const y = 2;';

      expect(compareCodeContent(code1, code2)).toBe(false);
    });

    it('空文字列同士はtrueと判定すること', () => {
      expect(compareCodeContent('', '')).toBe(true);
    });
  });

  describe('searchCodeInFile', () => {
    it('ファイル内でコードが見つかった場合、その位置を返すこと', () => {
      const fileContent = `line1
const x = 1;
const y = 2;
line4`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = searchCodeInFile('/test/file.ts', 'const x = 1;\nconst y = 2;');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ start: 2, end: 3 });
    });

    it('空白の違いを吸収してコードを見つけること', () => {
      const fileContent = `line1
  const   x   =   1;
line3`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = searchCodeInFile('/test/file.ts', 'const x = 1;');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ start: 2, end: 2 });
    });

    it('コードが複数箇所で見つかった場合、全ての位置を返すこと', () => {
      const fileContent = `const x = 1;
line2
const x = 1;
line4
const x = 1;`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = searchCodeInFile('/test/file.ts', 'const x = 1;');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ start: 1, end: 1 });
      expect(result[1]).toEqual({ start: 3, end: 3 });
      expect(result[2]).toEqual({ start: 5, end: 5 });
    });

    it('コードが見つからない場合、空配列を返すこと', () => {
      const fileContent = `line1
line2
line3`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = searchCodeInFile('/test/file.ts', 'const x = 1;');

      expect(result).toHaveLength(0);
    });

    it('複数行のコードを検索できること', () => {
      const fileContent = `line1
function test() {
  return 1;
}
line5`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = searchCodeInFile(
        '/test/file.ts',
        `function test() {
  return 1;
}`
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ start: 2, end: 4 });
    });

    it('ファイルの先頭でコードを見つけること', () => {
      const fileContent = `const x = 1;
line2
line3`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = searchCodeInFile('/test/file.ts', 'const x = 1;');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ start: 1, end: 1 });
    });

    it('ファイルの末尾でコードを見つけること', () => {
      const fileContent = `line1
line2
const x = 1;`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = searchCodeInFile('/test/file.ts', 'const x = 1;');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ start: 3, end: 3 });
    });

    it('部分一致では見つからないこと', () => {
      const fileContent = `const x = 1;
const y = 2;`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      // "const x = 1;"のみを検索（"const y = 2;"は含まない）
      const result = searchCodeInFile('/test/file.ts', 'const x = 1;');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ start: 1, end: 1 });
    });
  });
});
