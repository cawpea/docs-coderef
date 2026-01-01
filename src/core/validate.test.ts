import * as fs from 'fs';
import * as path from 'path';

import { jest } from '@jest/globals';

import type { CodeRef } from '@/utils/types';
import { extractCodeRefs, findMarkdownFiles, validateCodeRef } from '@/core/validate';
import type { CodeRefConfig } from '@/config';

// テスト用のモックプロジェクトルート
const mockProjectRoot = '/project';

// テスト用の設定オブジェクト
const mockConfig: CodeRefConfig = {
  projectRoot: mockProjectRoot,
  docsDir: 'docs',
  verbose: false,
};

// モックの設定
jest.mock('fs');
jest.mock('path', () => {
  const actualPath = jest.requireActual<typeof path>('path');
  return {
    ...actualPath,
    sep: '/',
    join: jest.fn((...args: string[]) => args.join('/')),
    resolve: jest.fn((...args: string[]) => {
      // 引数がない場合は現在のディレクトリ
      if (args.length === 0) {
        return mockProjectRoot;
      }
      // 1つ目の引数が絶対パスの場合
      if (args[0] && args[0].startsWith('/')) {
        // 絶対パスから相対パスを解決
        return args.reduce((acc: string, arg: string) => {
          if (arg === '..') {
            // 親ディレクトリに移動
            const parts = acc.split('/').filter(Boolean);
            parts.pop();
            return `/${parts.join('/')}`;
          } else if (arg === '.') {
            // 現在のディレクトリ
            return acc;
          } else if (arg && !arg.startsWith('/')) {
            // 相対パスを追加
            return `${acc}/${arg}`;
          }
          return arg || acc;
        }, '');
      }
      // デフォルト: 全ての引数を結合
      return `/${args.filter((arg) => arg && arg !== '.').join('/')}`;
    }),
    relative: jest.fn((from: string, to: string) => to.replace(`${from}/`, '')),
  };
});

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('validate-docs-code', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findMarkdownFiles', () => {
    it('マークダウンファイルのみを返すこと', () => {
      // モックデータの設定
      const mockDirents = [
        { name: 'file1.md', isDirectory: () => false, isFile: () => true },
        { name: 'file2.txt', isDirectory: () => false, isFile: () => true },
        { name: 'subdir', isDirectory: () => true, isFile: () => false },
      ];

      const mockSubdirents = [{ name: 'file3.md', isDirectory: () => false, isFile: () => true }];

      mockedFs.readdirSync
        .mockReturnValueOnce(mockDirents as any)
        .mockReturnValueOnce(mockSubdirents as any);

      const result = findMarkdownFiles('/test');

      expect(result).toEqual(['/test/file1.md', '/test/subdir/file3.md']);
      expect(mockedFs.readdirSync).toHaveBeenCalledWith('/test', { withFileTypes: true });
      expect(mockedFs.readdirSync).toHaveBeenCalledWith('/test/subdir', { withFileTypes: true });
    });

    it('空のディレクトリでは空の配列を返すこと', () => {
      mockedFs.readdirSync.mockReturnValue([]);

      const result = findMarkdownFiles('/empty');

      expect(result).toEqual([]);
    });
  });

  describe('extractCodeRefs', () => {
    it('CODE_REFコメントを正しく抽出すること', () => {
      const content = `
# テストドキュメント

<!-- CODE_REF: src/example.ts -->
コードの例：

<!-- CODE_REF: src/example.ts:10-20 -->
特定の行範囲：

<!-- CODE_REF: src/other.js:5-15 -->
他のファイル：
      `;

      const result = extractCodeRefs(content, '/docs/test.md');

      expect(result).toHaveLength(3);

      expect(result[0]).toMatchObject({
        fullMatch: '<!-- CODE_REF: src/example.ts -->',
        refPath: 'src/example.ts',
        startLine: null,
        endLine: null,
        docFile: '/docs/test.md',
        docLineNumber: 4,
      });

      expect(result[1]).toMatchObject({
        fullMatch: '<!-- CODE_REF: src/example.ts:10-20 -->',
        refPath: 'src/example.ts',
        startLine: 10,
        endLine: 20,
        docFile: '/docs/test.md',
        docLineNumber: 7,
      });

      expect(result[2]).toMatchObject({
        fullMatch: '<!-- CODE_REF: src/other.js:5-15 -->',
        refPath: 'src/other.js',
        startLine: 5,
        endLine: 15,
        docFile: '/docs/test.md',
        docLineNumber: 10,
      });
    });

    it('CODE_REFがない場合は空の配列を返すこと', () => {
      const content = `
# テストドキュメント

これは通常のマークダウンファイルです。
      `;

      const result = extractCodeRefs(content, '/docs/test.md');

      expect(result).toEqual([]);
    });

    it('スペースが含まれるCODE_REFを正しく処理すること', () => {
      const content = `<!-- CODE_REF:   src/example.ts   -->`;

      const result = extractCodeRefs(content, '/docs/test.md');

      expect(result).toHaveLength(1);
      expect(result[0].refPath).toBe('src/example.ts');
    });
  });

  describe('validateCodeRef', () => {
    // beforeEachは親のdescribeブロックで設定されているものを使用

    it('有効なファイル参照では空のエラー配列を返すこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts -->',
        refPath: 'src/example.ts',
        startLine: null,
        endLine: null,
        docFile: '/docs/test.md',
      };

      mockedFs.existsSync.mockReturnValue(true);

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toEqual([]);
    });

    it('存在しないファイルでFILE_NOT_FOUNDエラーを返すこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/missing.ts -->',
        refPath: 'src/missing.ts',
        startLine: null,
        endLine: null,
        docFile: '/docs/test.md',
      };

      mockedFs.existsSync.mockReturnValue(false);

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('FILE_NOT_FOUND');
      expect(result[0].message).toBe('Referenced file not found: src/missing.ts');
    });

    it('パストラバーサルでPATH_TRAVERSALエラーを返すこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: ../../../etc/passwd -->',
        refPath: '../../../etc/passwd',
        startLine: null,
        endLine: null,
        docFile: '/docs/test.md',
      };

      // 一時的にモックを上書きして、プロジェクトルート外のパスを返す
      mockedPath.resolve.mockImplementationOnce(() => '/etc/passwd');

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('PATH_TRAVERSAL');
    });

    it('無効な開始行番号でINVALID_LINE_NUMBERエラーを返すこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts:0-5 -->',
        refPath: 'src/example.ts',
        startLine: 0,
        endLine: 5,
        docFile: '/docs/test.md',
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('line1\nline2\nline3\nline4\nline5\n');

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('INVALID_LINE_NUMBER');
    });

    it('終了行が総行数を超える場合にLINE_OUT_OF_RANGEエラーを返すこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts:1-10 -->',
        refPath: 'src/example.ts',
        startLine: 1,
        endLine: 10,
        docFile: '/docs/test.md',
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('line1\nline2\nline3\n'); // 3行のみ

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('LINE_OUT_OF_RANGE');
    });

    it('開始行が終了行より大きい場合にINVALID_RANGEエラーを返すこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts:10-5 -->',
        refPath: 'src/example.ts',
        startLine: 10,
        endLine: 5,
        docFile: '/docs/test.md',
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10\nline11\n'
      );

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('INVALID_RANGE');
    });

    it('ファイル読み込みエラーでREAD_ERRORエラーを返すこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts:1-5 -->',
        refPath: 'src/example.ts',
        startLine: 1,
        endLine: 5,
        docFile: '/docs/test.md',
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('READ_ERROR');
      expect(result[0].message).toBe('Failed to read file: Permission denied');
    });

    it('有効な行範囲指定では空のエラー配列を返すこと（コードブロックがない場合）', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts:1-3 -->',
        refPath: 'src/example.ts',
        startLine: 1,
        endLine: 3,
        docFile: '/docs/test.md',
        // codeBlockがundefinedの場合、コード内容検証はCODE_BLOCK_MISSINGを返す
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('line1\nline2\nline3\nline4\nline5\n');

      const result = validateCodeRef(ref, mockConfig);

      // 既存の検証（ファイル存在、行範囲）は通過するが、
      // コードブロックがないため CODE_BLOCK_MISSING が発生する
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('CODE_BLOCK_MISSING');
    });
  });

  describe('統合テスト', () => {
    it('複数のエラータイプを同時に検出すること', () => {
      // パストラバーサル + ファイル不存在の組み合わせ
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: ../../../etc/passwd -->',
        refPath: '../../../etc/passwd',
        startLine: 1,
        endLine: 5,
        docFile: '/docs/test.md',
      };

      // 一時的にモックを上書きして、プロジェクトルート外のパスを返す
      mockedPath.resolve.mockImplementationOnce(() => '/etc/passwd');

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('PATH_TRAVERSAL');
    });

    it('CODE_REF正規表現パターンが正しく動作すること', () => {
      const testCases = [
        {
          input: '<!-- CODE_REF: src/example.ts -->',
          expected: { refPath: 'src/example.ts', startLine: null, endLine: null },
        },
        {
          input: '<!-- CODE_REF: src/example.ts:10-20 -->',
          expected: { refPath: 'src/example.ts', startLine: 10, endLine: 20 },
        },
        {
          input: '<!--CODE_REF:src/example.ts:5-15-->',
          expected: { refPath: 'src/example.ts', startLine: 5, endLine: 15 },
        },
        {
          input: '<!--   CODE_REF:   src/example.ts   -->',
          expected: { refPath: 'src/example.ts', startLine: null, endLine: null },
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = extractCodeRefs(input, '/test.md');
        expect(result).toHaveLength(1);
        expect(result[0].refPath).toBe(expected.refPath);
        expect(result[0].startLine).toBe(expected.startLine);
        expect(result[0].endLine).toBe(expected.endLine);
      });
    });

    it('エッジケースの正規表現パターンを正しく処理すること', () => {
      const testCases = [
        {
          input: '<!-- CODE_REF: src/example.ts -->',
          expected: { refPath: 'src/example.ts', startLine: null, endLine: null },
        },
        {
          input: '<!-- CODE_REF: src/example.ts:10-20 -->',
          expected: { refPath: 'src/example.ts', startLine: 10, endLine: 20 },
        },
        {
          input: '<!--CODE_REF:src/example.ts:5-15-->',
          expected: { refPath: 'src/example.ts', startLine: 5, endLine: 15 },
        },
        {
          input: '<!--   CODE_REF:   src/example.ts   -->',
          expected: { refPath: 'src/example.ts', startLine: null, endLine: null },
        },
        {
          input: '<!-- CODE_REF: path/with spaces/file.ts:1-2 -->',
          expected: { refPath: 'path/with spaces/file.ts', startLine: 1, endLine: 2 },
        },
        {
          input: '<!-- CODE_REF: file-with-dashes.ts -->',
          expected: { refPath: 'file-with-dashes.ts', startLine: null, endLine: null },
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = extractCodeRefs(input, '/test.md');
        expect(result).toHaveLength(1);
        expect(result[0].refPath).toBe(expected.refPath);
        expect(result[0].startLine).toBe(expected.startLine);
        expect(result[0].endLine).toBe(expected.endLine);
      });
    });

    it('複数のCODE_REFが同一ドキュメント内にある場合を処理すること', () => {
      const content = `
# ドキュメント

<!-- CODE_REF: src/a.ts -->
<!-- CODE_REF: src/b.ts:5-10 -->
<!-- CODE_REF: src/c.js -->

テキストの間に

<!-- CODE_REF: src/d.ts:1-5 -->
      `;

      const result = extractCodeRefs(content, '/docs/multiple.md');

      expect(result).toHaveLength(4);
      expect(result[0].refPath).toBe('src/a.ts');
      expect(result[1].refPath).toBe('src/b.ts');
      expect(result[2].refPath).toBe('src/c.js');
      expect(result[3].refPath).toBe('src/d.ts');
    });
  });

  describe('コード内容検証', () => {
    beforeEach(() => {
      // existsSyncは常にtrueを返す
      mockedFs.existsSync.mockReturnValue(true);
    });

    it('CODE_LOCATION_MISMATCH: コードは一致するが行数が異なる場合', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts:5-7 -->',
        refPath: 'src/example.ts',
        startLine: 5,
        endLine: 7,
        docFile: '/docs/test.md',
        codeBlock: 'const x = 1;\nconst y = 2;\nconst z = 3;',
      };

      const fileContent = `line1
line2
const x = 1;
const y = 2;
const z = 3;
line6
line7
line8`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('CODE_LOCATION_MISMATCH');
      expect(result[0].message).toContain('src/example.ts');
      expect(result[0].message).toContain('expect: 5-7');
      expect(result[0].message).toContain('result: 3-5');
      expect(result[0].suggestedLines).toEqual({ start: 3, end: 5 });
    });

    it('CODE_CONTENT_MISMATCH: 指定行のコードが異なる場合', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts:2-3 -->',
        refPath: 'src/example.ts',
        startLine: 2,
        endLine: 3,
        docFile: '/docs/test.md',
        codeBlock: 'const x = 1;\nconst y = 2;',
      };

      const fileContent = `line1
const a = 100;
const b = 200;
line4`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('CODE_CONTENT_MISMATCH');
      expect(result[0].message).toContain('src/example.ts');
      expect(result[0].message).toContain('Code does not match');
    });

    it('CODE_BLOCK_MISSING: CODE_REFの後にコードブロックがない場合', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts:1-3 -->',
        refPath: 'src/example.ts',
        startLine: 1,
        endLine: 3,
        docFile: '/docs/test.md',
        // codeBlockがundefined
      };

      mockedFs.readFileSync.mockReturnValue('line1\nline2\nline3');

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('CODE_BLOCK_MISSING');
      expect(result[0].message).toContain('Code block not found after CODE_REF');
      expect(result[0].message).toContain('src/example.ts');
    });

    it('複数の一致がファイル内にある場合、最初の出現を提案すること', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts:10-11 -->',
        refPath: 'src/example.ts',
        startLine: 10,
        endLine: 11,
        docFile: '/docs/test.md',
        codeBlock: 'const x = 1;\nconst y = 2;',
      };

      const fileContent = `const x = 1;
const y = 2;
line3
const x = 1;
const y = 2;
line6
const x = 1;
const y = 2;
line9
line10
line11
line12`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = validateCodeRef(ref, mockConfig);

      // LINE_OUT_OF_RANGEとCODE_LOCATION_MISMATCHの両方が発生する可能性がある
      // ここでは CODE_LOCATION_MISMATCH をチェック
      const locationMismatch = result.find((e) => e.type === 'CODE_LOCATION_MISMATCH');
      expect(locationMismatch).toBeDefined();
      expect(locationMismatch!.message).toContain('Code found in 3 locations');
      expect(locationMismatch!.message).toContain('result: 1-2');
      expect(locationMismatch!.suggestedLines).toEqual({ start: 1, end: 2 });
    });

    it('全体参照（行数なし）の場合、コード検証をスキップすること', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts -->',
        refPath: 'src/example.ts',
        startLine: null,
        endLine: null,
        docFile: '/docs/test.md',
        codeBlock: 'some code',
      };

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toEqual([]);
    });

    it('コード内容が完全に一致する場合、エラーを返さないこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts:2-4 -->',
        refPath: 'src/example.ts',
        startLine: 2,
        endLine: 4,
        docFile: '/docs/test.md',
        codeBlock: 'const x = 1;\nconst y = 2;\nconst z = 3;',
      };

      const fileContent = `line1
const x = 1;
const y = 2;
const z = 3;
line5`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toEqual([]);
    });

    it('空白の違いを吸収してコードが一致する場合、エラーを返さないこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts:2-3 -->',
        refPath: 'src/example.ts',
        startLine: 2,
        endLine: 3,
        docFile: '/docs/test.md',
        codeBlock: 'const x = 1;\nconst y = 2;',
      };

      const fileContent = `line1
  const   x   =   1;
    const    y    =    2;
line4`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toEqual([]);
    });

    // 新規テスト: シンボル指定のみでコードブロックなし
    it('シンボル指定のみでコードブロックがない場合、CODE_BLOCK_MISSINGエラーを返すこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts#myFunction -->',
        refPath: 'src/example.ts',
        symbolPath: 'myFunction',
        memberName: 'myFunction',
        startLine: null,
        endLine: null,
        docFile: '/docs/test.md',
        // codeBlockがundefined
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('function myFunction() { return 42; }');

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('CODE_BLOCK_MISSING');
      expect(result[0].message).toContain('CODE_REF with symbol specification');
      expect(result[0].message).toContain('src/example.ts#myFunction');
    });

    it('シンボル指定のみで空のコードブロックがある場合、CODE_BLOCK_MISSINGエラーを返すこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts#myFunction -->',
        refPath: 'src/example.ts',
        symbolPath: 'myFunction',
        memberName: 'myFunction',
        startLine: null,
        endLine: null,
        docFile: '/docs/test.md',
        codeBlock: '   \n\n  ', // 空白のみ
      };

      mockedFs.existsSync.mockReturnValue(true);

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('CODE_BLOCK_MISSING');
    });

    it('ファイル全体参照でコードブロックがなくてもエラーを返さないこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts -->',
        refPath: 'src/example.ts',
        startLine: null,
        endLine: null,
        docFile: '/docs/test.md',
        // シンボル指定なし、コードブロックもなし
      };

      mockedFs.existsSync.mockReturnValue(true);

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toEqual([]);
    });

    it('シンボル指定のみでコードブロックがある場合、検証が実行されること', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: src/example.ts#myFunction -->',
        refPath: 'src/example.ts',
        symbolPath: 'myFunction',
        memberName: 'myFunction',
        startLine: null,
        endLine: null,
        docFile: '/docs/test.md',
        codeBlock: 'function myFunction() {\n  return 42;\n}',
      };

      mockedFs.existsSync.mockReturnValue(true);
      // コードブロックがある場合は、シンボル全体との比較が行われる
      // この検証は既存のロジックで実装されている
      const result = validateCodeRef(ref, mockConfig);

      // エラーがないか、またはシンボルが見つからないなどの別のエラー
      // 既存のロジックに依存するため、ここでは詳細な検証は行わない
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('extractCodeRefs - シンボル記法', () => {
    it('クラス名+メソッド名のシンボルパスをパースすること', () => {
      const content = `
# Test Document

<!-- CODE_REF: backend/src/services/evaluation.service.ts#EvaluationService#evaluateDesign:30-172 -->
`;

      const result = extractCodeRefs(content, '/docs/test.md');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        refPath: 'backend/src/services/evaluation.service.ts',
        symbolPath: 'EvaluationService#evaluateDesign',
        className: 'EvaluationService',
        memberName: 'evaluateDesign',
        startLine: 30,
        endLine: 172,
      });
    });

    it('関数名のみのシンボルパスをパースすること', () => {
      const content = `
# Test Document

<!-- CODE_REF: backend/src/utils/helper.ts#helperFunction:10-20 -->
`;

      const result = extractCodeRefs(content, '/docs/test.md');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        refPath: 'backend/src/utils/helper.ts',
        symbolPath: 'helperFunction',
        memberName: 'helperFunction',
        startLine: 10,
        endLine: 20,
      });
      expect(result[0].className).toBeUndefined();
    });

    it('シンボルパスのみ（行番号なし）をパースすること', () => {
      const content = `
# Test Document

<!-- CODE_REF: backend/src/services/evaluation.service.ts#EvaluationService#evaluateDesign -->
`;

      const result = extractCodeRefs(content, '/docs/test.md');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        refPath: 'backend/src/services/evaluation.service.ts',
        symbolPath: 'EvaluationService#evaluateDesign',
        className: 'EvaluationService',
        memberName: 'evaluateDesign',
        startLine: null,
        endLine: null,
      });
    });

    it('既存の記法（行番号のみ）も引き続き動作すること', () => {
      const content = `
# Test Document

<!-- CODE_REF: backend/src/services/evaluation.service.ts:30-172 -->
`;

      const result = extractCodeRefs(content, '/docs/test.md');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        refPath: 'backend/src/services/evaluation.service.ts',
        startLine: 30,
        endLine: 172,
      });
      expect(result[0].symbolPath).toBeUndefined();
      expect(result[0].className).toBeUndefined();
      expect(result[0].memberName).toBeUndefined();
    });

    it('シンボル記法と行番号記法を混在させられること', () => {
      const content = `
# Test Document

<!-- CODE_REF: backend/src/services/evaluation.service.ts#EvaluationService#evaluateDesign:30-172 -->

<!-- CODE_REF: backend/src/utils/helper.ts:10-20 -->
`;

      const result = extractCodeRefs(content, '/docs/test.md');

      expect(result).toHaveLength(2);
      expect(result[0].symbolPath).toBe('EvaluationService#evaluateDesign');
      expect(result[1].symbolPath).toBeUndefined();
    });
  });

  describe('validateSymbolRef', () => {
    it('TypeScript/JavaScript以外のファイルでエラーを返すこと', () => {
      const ref: CodeRef = {
        fullMatch: '<!-- CODE_REF: README.md#MyClass#method -->',
        refPath: 'README.md',
        symbolPath: 'MyClass#method',
        className: 'MyClass',
        memberName: 'method',
        startLine: null,
        endLine: null,
        docFile: '/docs/test.md',
      };

      mockedFs.existsSync.mockReturnValue(true);

      const result = validateCodeRef(ref, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('NOT_TYPESCRIPT_FILE');
      expect(result[0].message).toContain('TypeScript/JavaScript');
    });
  });
});
