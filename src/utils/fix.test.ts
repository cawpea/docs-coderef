/**
 * 修正ロジックのテスト
 */

import * as fs from 'fs';
import * as path from 'path';
import type * as readline from 'readline';

import { extractLinesFromFile, searchCodeInFileWithScopeExpansion } from '@/utils/code-comparison';
import {
  applyFix,
  createBlockMissingFix,
  createContentMismatchFix,
  createFixAction,
  createLineOutOfRangeFix,
  createLocationMismatchFix,
  createMultipleSymbolsFoundFix,
  createSymbolRangeMismatchFix,
  handleMultipleMatches,
  isFixableError,
} from '@/utils/fix';
import * as markdownEdit from '@/utils/markdown-edit';
import * as prompt from '@/utils/prompt';
import type { CodeRefError, FixAction } from '@/utils/types';
import type { CodeRefConfig } from '@/config';

// モック設定
jest.mock('fs');
jest.mock('@/utils/code-comparison', () => ({
  searchCodeInFile: jest.fn(),
  searchCodeInFileWithScopeExpansion: jest.fn(),
  extractLinesFromFile: jest.fn(),
}));
jest.mock('./markdown-edit');
jest.mock('./prompt');
jest.mock('./ast-scope-expansion');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExtractLinesFromFile = extractLinesFromFile as jest.MockedFunction<
  typeof extractLinesFromFile
>;
const mockSearchCodeInFileWithScopeExpansion =
  searchCodeInFileWithScopeExpansion as jest.MockedFunction<
    typeof searchCodeInFileWithScopeExpansion
  >;
const mockMarkdownEdit = markdownEdit as jest.Mocked<typeof markdownEdit>;
const mockPrompt = prompt as jest.Mocked<typeof prompt>;

// Mock config for tests
const mockConfig: CodeRefConfig = {
  projectRoot: path.resolve(__dirname, '../../..'),
  docsDir: 'docs',
  ignoreFile: '.docsignore',
  verbose: false,
};

describe('isFixableError', () => {
  it('修正可能なエラータイプの場合にtrueを返すこと', () => {
    const fixableTypes = [
      'CODE_LOCATION_MISMATCH',
      'CODE_BLOCK_MISSING',
      'CODE_CONTENT_MISMATCH',
      'LINE_OUT_OF_RANGE',
      'SYMBOL_RANGE_MISMATCH',
      'MULTIPLE_SYMBOLS_FOUND',
    ];

    fixableTypes.forEach((type) => {
      const error: CodeRefError = {
        type: type as any,
        message: 'test',
        ref: {} as any,
      };
      expect(isFixableError(error)).toBe(true);
    });
  });

  it('修正不可能なエラータイプの場合にfalseを返すこと', () => {
    const unfixableTypes = ['FILE_NOT_FOUND', 'SYMBOL_NOT_FOUND', 'INVALID_FORMAT'];

    unfixableTypes.forEach((type) => {
      const error: CodeRefError = {
        type: type as any,
        message: 'test',
        ref: {} as any,
      };
      expect(isFixableError(error)).toBe(false);
    });
  });
});

describe('createLocationMismatchFix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正しい修正アクションを作成すること', () => {
    const error: CodeRefError = {
      type: 'CODE_LOCATION_MISMATCH',
      message: 'test',
      ref: {
        fullMatch: '<!-- CODE_REF: test.ts:10-20 -->',
        refPath: 'test.ts',
        startLine: 10,
        endLine: 20,
        docFile: '/path/to/doc.md',
        docLineNumber: 5,
      },
      suggestedLines: { start: 15, end: 25 },
    };

    mockExtractLinesFromFile.mockReturnValue('code content');

    const result = createLocationMismatchFix(error, mockConfig);

    expect(result).toEqual({
      type: 'UPDATE_LINE_NUMBERS',
      error,
      description: 'Update line numbers from 10-20 to 15-25',
      preview: expect.stringContaining('test.ts:10-20'),
      newStartLine: 15,
      newEndLine: 25,
      newCodeBlock: 'code content',
    });
  });

  it('suggestedLinesがない場合にエラーをスローすること', () => {
    const error: CodeRefError = {
      type: 'CODE_LOCATION_MISMATCH',
      message: 'test',
      ref: {
        fullMatch: '<!-- CODE_REF: test.ts:10-20 -->',
        refPath: 'test.ts',
        startLine: 10,
        endLine: 20,
        docFile: '/path/to/doc.md',
        docLineNumber: 5,
      },
    };

    expect(() => createLocationMismatchFix(error, mockConfig)).toThrow(
      'CODE_LOCATION_MISMATCH requires suggestedLines'
    );
  });
});

describe('createBlockMissingFix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正しい修正アクションを作成すること', () => {
    const error: CodeRefError = {
      type: 'CODE_BLOCK_MISSING',
      message: 'test',
      ref: {
        fullMatch: '<!-- CODE_REF: test.ts:10-20 -->',
        refPath: 'test.ts',
        startLine: 10,
        endLine: 20,
        docFile: '/path/to/doc.md',
        docLineNumber: 5,
      },
    };

    // ドキュメントファイルの内容をモック（コードブロックなし）
    mockFs.readFileSync.mockReturnValue(
      '# Test Doc\n\n<!-- CODE_REF: test.ts:10-20 -->\n\nSome text.' as any
    );
    mockExtractLinesFromFile.mockReturnValue('code content');

    const result = createBlockMissingFix(error, mockConfig);

    expect(result).toEqual({
      type: 'INSERT_CODE_BLOCK',
      error,
      description: 'Insert code block from test.ts:10-20',
      preview: expect.stringContaining('code content'),
      newCodeBlock: 'code content',
    });
  });

  it('行番号がない場合にエラーをスローすること', () => {
    const error: CodeRefError = {
      type: 'CODE_BLOCK_MISSING',
      message: 'test',
      ref: {
        fullMatch: '<!-- CODE_REF: test.ts -->',
        refPath: 'test.ts',
        startLine: null,
        endLine: null,
        docFile: '/path/to/doc.md',
        docLineNumber: 5,
      },
    };

    expect(() => createBlockMissingFix(error, mockConfig)).toThrow(
      'Whole file reference does not need code block'
    );
  });
});

describe('createContentMismatchFix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('AST拡張なしの場合に正しい修正アクションを作成すること', () => {
    const error: CodeRefError = {
      type: 'CODE_CONTENT_MISMATCH',
      message: 'test',
      ref: {
        fullMatch: '<!-- CODE_REF: test.ts:10-20 -->',
        refPath: 'test.ts',
        startLine: 10,
        endLine: 20,
        docFile: '/path/to/doc.md',
        docLineNumber: 5,
        codeBlock: 'old code',
      },
      expectedCode: 'expected code',
    };

    mockExtractLinesFromFile.mockReturnValue('actual code');
    mockFs.readFileSync.mockReturnValue('file content' as any);

    // ast-scope-expansionモックで空配列を返す（拡張なし）
    const astScopeExpansion = require('./ast-scope-expansion'); // eslint-disable-line
    astScopeExpansion.expandMatchToScope = jest.fn().mockReturnValue([]);

    const result = createContentMismatchFix(error, mockConfig) as FixAction;

    expect(result.type).toBe('REPLACE_CODE_BLOCK');
    expect(result.newCodeBlock).toBe('actual code');
  });

  it('AST拡張ありの場合に行番号更新アクションを作成すること', () => {
    const error: CodeRefError = {
      type: 'CODE_CONTENT_MISMATCH',
      message: 'test',
      ref: {
        fullMatch: '<!-- CODE_REF: test.ts:10-20 -->',
        refPath: 'test.ts',
        startLine: 10,
        endLine: 20,
        docFile: '/path/to/doc.md',
        docLineNumber: 5,
        codeBlock: 'old code',
      },
    };

    mockExtractLinesFromFile.mockReturnValue('expanded code');
    mockFs.readFileSync.mockReturnValue('file content' as any);

    // ast-scope-expansionモックで拡張されたマッチを返す
    const astScopeExpansion = require('./ast-scope-expansion'); // eslint-disable-line
    astScopeExpansion.expandMatchToScope = jest.fn().mockReturnValue([
      {
        start: 8,
        end: 22,
        confidence: 'high',
        scopeType: 'function',
        expansionType: 'ast',
      },
    ]);

    const result = createContentMismatchFix(error, mockConfig) as FixAction;

    expect(result.type).toBe('UPDATE_LINE_NUMBERS');
    expect(result.newStartLine).toBe(8);
    expect(result.newEndLine).toBe(22);
    expect(result.newCodeBlock).toBe('expanded code');
  });
});

describe('createLineOutOfRangeFix', () => {
  it('正しい修正アクションを作成すること', () => {
    const error: CodeRefError = {
      type: 'LINE_OUT_OF_RANGE',
      message: '終了行 150 > 100',
      ref: {
        fullMatch: '<!-- CODE_REF: test.ts:10-150 -->',
        refPath: 'test.ts',
        startLine: 10,
        endLine: 150,
        docFile: '/path/to/doc.md',
        docLineNumber: 5,
      },
    };

    const result = createLineOutOfRangeFix(error);

    expect(result).toEqual({
      type: 'UPDATE_END_LINE',
      error,
      description: 'Fix end line from 150 to 100 (end of file)',
      preview: expect.stringContaining('10-100'),
      newStartLine: 10,
      newEndLine: 100,
    });
  });

  it('エラーメッセージから行数を抽出できない場合にエラーをスローすること', () => {
    const error: CodeRefError = {
      type: 'LINE_OUT_OF_RANGE',
      message: 'invalid message',
      ref: {} as any,
    };

    expect(() => createLineOutOfRangeFix(error)).toThrow(
      'Cannot get line count from LINE_OUT_OF_RANGE error message'
    );
  });
});

describe('createSymbolRangeMismatchFix', () => {
  it('正しい修正アクションを作成すること', () => {
    const error: CodeRefError = {
      type: 'SYMBOL_RANGE_MISMATCH',
      message: 'test',
      ref: {
        fullMatch: '<!-- CODE_REF: test.ts#ClassName#methodName:10-20 -->',
        refPath: 'test.ts',
        symbolPath: 'ClassName#methodName',
        startLine: 10,
        endLine: 20,
        docFile: '/path/to/doc.md',
        docLineNumber: 5,
      },
      suggestedSymbol: {
        memberName: 'methodName',
        className: 'ClassName',
        startLine: 15,
        endLine: 25,
        scopeType: 'method',
        confidence: 'high',
      },
    };

    const result = createSymbolRangeMismatchFix(error);

    expect(result).toEqual({
      type: 'UPDATE_SYMBOL_RANGE',
      error,
      description: 'Update line numbers for symbol "ClassName#methodName" from 10-20 to 15-25',
      preview: expect.stringContaining('15-25'),
      newStartLine: 15,
      newEndLine: 25,
    });
  });

  it('suggestedSymbolがない場合にエラーをスローすること', () => {
    const error: CodeRefError = {
      type: 'SYMBOL_RANGE_MISMATCH',
      message: 'test',
      ref: {} as any,
    };

    expect(() => createSymbolRangeMismatchFix(error)).toThrow(
      'SYMBOL_RANGE_MISMATCH requires suggestedSymbol'
    );
  });
});

describe('createMultipleSymbolsFoundFix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ユーザーが選択したシンボルで修正アクションを作成すること', async () => {
    const error: CodeRefError = {
      type: 'MULTIPLE_SYMBOLS_FOUND',
      message: 'test',
      ref: {
        fullMatch: '<!-- CODE_REF: test.ts#methodName -->',
        refPath: 'test.ts',
        symbolPath: 'methodName',
        startLine: null,
        endLine: null,
        docFile: '/path/to/doc.md',
        docLineNumber: 5,
      },
      foundSymbols: [
        {
          memberName: 'methodName',
          startLine: 10,
          endLine: 20,
          scopeType: 'method',
          confidence: 'high',
        },
        {
          memberName: 'methodName',
          startLine: 50,
          endLine: 60,
          scopeType: 'method',
          confidence: 'high',
        },
      ],
    };

    const mockRl = {} as readline.Interface;
    mockPrompt.askSelectOption.mockResolvedValue(1);

    const result = await createMultipleSymbolsFoundFix(error, mockRl);

    expect(result).toEqual({
      type: 'UPDATE_SYMBOL_RANGE',
      error,
      description: 'Add line numbers for symbol "methodName": 50-60',
      preview: expect.stringContaining('50-60'),
      newStartLine: 50,
      newEndLine: 60,
    });
  });

  it('foundSymbolsがない場合にエラーをスローすること', async () => {
    const error: CodeRefError = {
      type: 'MULTIPLE_SYMBOLS_FOUND',
      message: 'test',
      ref: {} as any,
    };

    const mockRl = {} as readline.Interface;

    await expect(createMultipleSymbolsFoundFix(error, mockRl)).rejects.toThrow(
      'MULTIPLE_SYMBOLS_FOUND requires foundSymbols'
    );
  });
});

describe('createFixAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('修正不可能なエラーの場合にnullを返すこと', async () => {
    const error: CodeRefError = {
      type: 'FILE_NOT_FOUND',
      message: 'test',
      ref: {} as any,
    };

    const result = await createFixAction(error, mockConfig);

    expect(result).toBeNull();
  });

  it('CODE_LOCATION_MISMATCHの場合に適切な修正アクションを返すこと', async () => {
    const error: CodeRefError = {
      type: 'CODE_LOCATION_MISMATCH',
      message: 'test',
      ref: {
        fullMatch: '<!-- CODE_REF: test.ts:10-20 -->',
        refPath: 'test.ts',
        startLine: 10,
        endLine: 20,
        docFile: '/path/to/doc.md',
        docLineNumber: 5,
      },
      suggestedLines: { start: 15, end: 25 },
    };

    mockExtractLinesFromFile.mockReturnValue('code content');

    const result = (await createFixAction(error, mockConfig)) as FixAction;

    expect(result?.type).toBe('UPDATE_LINE_NUMBERS');
  });

  it('MULTIPLE_SYMBOLS_FOUNDでreadline.Interfaceがない場合にエラーをスローすること', async () => {
    const error: CodeRefError = {
      type: 'MULTIPLE_SYMBOLS_FOUND',
      message: 'test',
      ref: {} as any,
      foundSymbols: [
        {
          memberName: 'test',
          startLine: 1,
          endLine: 10,
          scopeType: 'method',
          confidence: 'high',
        },
      ],
    };

    await expect(createFixAction(error, mockConfig)).rejects.toThrow(
      'MULTIPLE_SYMBOLS_FOUND requires readline.Interface'
    );
  });
});

describe('優先順位付けロジック', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleMultipleMatches()', () => {
    const createMockError = (
      startLine: number,
      endLine: number,
      codeBlock = 'test code'
    ): CodeRefError => ({
      type: 'CODE_LOCATION_MISMATCH',
      message: 'Test error',
      ref: {
        fullMatch: '<!-- CODE_REF: test.ts:10-20 -->',
        refPath: 'test.ts',
        startLine,
        endLine,
        docFile: 'test.md',
        codeBlock,
      },
    });

    const createMockReadline = (answer = 0): readline.Interface => {
      const rl = {
        question: jest.fn((_query, callback) => {
          // ユーザーが選択肢を選んだとして、すぐにコールバックを呼ぶ
          callback(`${answer + 1}`); // 1-indexed の選択肢
        }),
        close: jest.fn(),
      } as unknown as readline.Interface;
      return rl;
    };

    it('単一マッチの場合、そのマッチを返す', async () => {
      const error = createMockError(10, 20);
      const rl = createMockReadline();

      mockSearchCodeInFileWithScopeExpansion.mockReturnValue([
        { start: 15, end: 25, confidence: 'high', expansionType: 'ast', scopeType: 'function' },
      ]);

      const result = await handleMultipleMatches(error, rl, mockConfig);

      expect(result).not.toBeNull();
      expect(result?.newStartLine).toBe(15);
      expect(result?.newEndLine).toBe(25);
    });

    it('複数マッチで高信頼度が1つの場合、自動選択する', async () => {
      const error = createMockError(10, 20);
      const rl = createMockReadline();

      // 1つだけ高信頼度のマッチがある場合、自動選択される
      mockSearchCodeInFileWithScopeExpansion.mockReturnValue([
        {
          start: 10,
          end: 20,
          confidence: 'high',
          expansionType: 'ast',
          scopeType: 'interface',
        },
        { start: 50, end: 60, confidence: 'low', expansionType: 'none', scopeType: 'unknown' },
        { start: 100, end: 110, confidence: 'low', expansionType: 'none', scopeType: 'unknown' },
      ]);

      const result = await handleMultipleMatches(error, rl, mockConfig);

      expect(result).not.toBeNull();
      expect(result?.newStartLine).toBe(10);
      expect(result?.newEndLine).toBe(20);
      // 自動選択されたので、ユーザーに質問しない
      expect(rl.question).not.toHaveBeenCalled();
    });

    it('元の位置に近いマッチを優先する', async () => {
      const error = createMockError(10, 20);
      const rl = createMockReadline();

      // 距離の異なる3つのマッチ（全て同じ信頼度）
      mockSearchCodeInFileWithScopeExpansion.mockReturnValue([
        { start: 100, end: 110, confidence: 'medium', expansionType: 'none', scopeType: 'unknown' }, // 90行離れている
        { start: 12, end: 22, confidence: 'medium', expansionType: 'none', scopeType: 'unknown' }, // 2行ずれ - 最も近い
        { start: 50, end: 60, confidence: 'medium', expansionType: 'none', scopeType: 'unknown' }, // 40行離れている
      ]);

      const result = await handleMultipleMatches(error, rl, mockConfig);

      expect(result).not.toBeNull();
      // ソート後の配列から選択される（モックのreadlineが選択）
      expect(result?.newStartLine).toBe(50);
      expect(result?.newEndLine).toBe(60);
    });

    it('スコープタイプで優先順位付けする', async () => {
      const error = createMockError(10, 20);
      const rl = createMockReadline();

      // 同じ距離だが、スコープタイプが異なる（複数のhighがあるのでユーザーに選択させる）
      mockSearchCodeInFileWithScopeExpansion.mockReturnValue([
        { start: 12, end: 22, confidence: 'high', expansionType: 'ast', scopeType: 'function' },
        { start: 13, end: 23, confidence: 'high', expansionType: 'ast', scopeType: 'interface' },
        { start: 14, end: 24, confidence: 'high', expansionType: 'ast', scopeType: 'const' },
      ]);

      const result = await handleMultipleMatches(error, rl, mockConfig);

      expect(result).not.toBeNull();
      // 複数のhigh信頼度マッチがあり、その中でスコープタイプの優先度が高いマッチが自動選択される
      expect(result?.newStartLine).toBe(13);
      expect(result?.newEndLine).toBe(23);
      // 高信頼度マッチが1つだけ（ソート後の最優先）なので自動選択される
      expect(rl.question).not.toHaveBeenCalled();
    });

    it('信頼度が最優先される', async () => {
      const error = createMockError(10, 20);
      const rl = createMockReadline();

      // 距離は遠いが信頼度が高いマッチがある
      mockSearchCodeInFileWithScopeExpansion.mockReturnValue([
        { start: 11, end: 21, confidence: 'low', expansionType: 'none', scopeType: 'unknown' }, // 近いが低信頼度
        { start: 100, end: 110, confidence: 'high', expansionType: 'ast', scopeType: 'interface' }, // 遠いが高信頼度
      ]);

      const result = await handleMultipleMatches(error, rl, mockConfig);

      expect(result).not.toBeNull();
      // 高信頼度が1つだけなので自動選択される
      expect(result?.newStartLine).toBe(100);
      expect(result?.newEndLine).toBe(110);
    });

    it('マッチが見つからない場合、nullを返す', async () => {
      const error = createMockError(10, 20);
      const rl = createMockReadline();

      mockSearchCodeInFileWithScopeExpansion.mockReturnValue([]);

      const result = await handleMultipleMatches(error, rl, mockConfig);

      expect(result).toBeNull();
    });

    it('codeBlockがない場合、nullを返す', async () => {
      const error: CodeRefError = {
        type: 'CODE_LOCATION_MISMATCH',
        message: 'Test error',
        ref: {
          fullMatch: '<!-- CODE_REF: test.ts:10-20 -->',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 20,
          docFile: 'test.md',
          // codeBlock なし
        },
      };
      const rl = createMockReadline();

      const result = await handleMultipleMatches(error, rl, mockConfig);

      expect(result).toBeNull();
      expect(mockSearchCodeInFileWithScopeExpansion).not.toHaveBeenCalled();
    });
  });
});

describe('行番号管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('applyFix() のライン delta', () => {
    it('INSERT_CODE_BLOCK で行が追加される場合、正のdeltaを返す', () => {
      const originalContent = `# Test Document

<!-- CODE_REF: test.ts:1-5 -->

Some content`;

      const newContent = `# Test Document

<!-- CODE_REF: test.ts:1-5 -->
\`\`\`typescript
const test = 'hello';
console.log(test);
\`\`\`

Some content`;

      // モック設定
      mockFs.readFileSync.mockReturnValue(originalContent as any);
      mockFs.writeFileSync.mockImplementation(() => {});
      mockMarkdownEdit.insertCodeBlockAfterComment.mockReturnValue(newContent);

      const action: FixAction = {
        type: 'INSERT_CODE_BLOCK',
        error: {
          type: 'CODE_BLOCK_MISSING',
          message: 'Test',
          ref: {
            fullMatch: '<!-- CODE_REF: test.ts:1-5 -->',
            refPath: 'test.ts',
            startLine: 1,
            endLine: 5,
            docFile: 'test.md',
          },
        },
        description: 'Insert code block',
        preview: 'Insert code block after CODE_REF comment',
        newStartLine: 1,
        newEndLine: 5,
        newCodeBlock: "const test = 'hello';\nconsole.log(test);",
      };

      const lineDelta = applyFix(action);

      expect(mockMarkdownEdit.insertCodeBlockAfterComment).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      // 元の5行 → 新しい9行 = +4行
      expect(lineDelta).toBe(4);
    });

    it('REPLACE_CODE_BLOCK で行が増加する場合、正のdeltaを返す', () => {
      const originalContent = `# Test Document

<!-- CODE_REF: test.ts:1-5 -->
\`\`\`typescript
const test = 'hello';
\`\`\`

Some content`;

      const newContent = `# Test Document

<!-- CODE_REF: test.ts:1-5 -->
\`\`\`typescript
const test = 'hello';
console.log(test);
console.log('more');
\`\`\`

Some content`;

      // モック設定
      mockFs.readFileSync.mockReturnValue(originalContent as any);
      mockFs.writeFileSync.mockImplementation(() => {});
      mockMarkdownEdit.replaceCodeBlock.mockReturnValue(newContent);

      const action: FixAction = {
        type: 'REPLACE_CODE_BLOCK',
        error: {
          type: 'CODE_CONTENT_MISMATCH',
          message: 'Test',
          ref: {
            fullMatch: '<!-- CODE_REF: test.ts:1-5 -->',
            refPath: 'test.ts',
            startLine: 1,
            endLine: 5,
            docFile: 'test.md',
            docLineNumber: 3,
            codeBlock: "const test = 'hello';",
          },
        },
        description: 'Replace code block',
        preview: 'Replace existing code block',
        newStartLine: 1,
        newEndLine: 5,
        newCodeBlock: "const test = 'hello';\nconsole.log(test);\nconsole.log('more');",
      };

      const lineDelta = applyFix(action);

      expect(mockMarkdownEdit.replaceCodeBlock).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      // 元の8行 → 新しい10行 = +2行
      expect(lineDelta).toBe(2);
    });

    it('UPDATE_LINE_NUMBERS で行数変化がない場合、0を返す', () => {
      const originalContent = `# Test Document

<!-- CODE_REF: test.ts:1-5 -->

Some content`;

      const newContent = `# Test Document

<!-- CODE_REF: test.ts:10-15 -->

Some content`;

      // モック設定
      mockFs.readFileSync.mockReturnValue(originalContent as any);
      mockFs.writeFileSync.mockImplementation(() => {});
      mockMarkdownEdit.replaceCodeRefComment.mockReturnValue(newContent);
      mockMarkdownEdit.findCodeBlockPosition.mockReturnValue(null);

      const action: FixAction = {
        type: 'UPDATE_LINE_NUMBERS',
        error: {
          type: 'CODE_LOCATION_MISMATCH',
          message: 'Test',
          ref: {
            fullMatch: '<!-- CODE_REF: test.ts:1-5 -->',
            refPath: 'test.ts',
            startLine: 1,
            endLine: 5,
            docFile: 'test.md',
          },
        },
        description: 'Update line numbers',
        preview: 'Update CODE_REF line numbers',
        newStartLine: 10,
        newEndLine: 15,
      };

      const lineDelta = applyFix(action);

      expect(mockMarkdownEdit.replaceCodeRefComment).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      // 行数変化なし（コメントのみ更新）
      expect(lineDelta).toBe(0);
    });

    it('REPLACE_CODE_BLOCK で行が減少する場合、負のdeltaを返す', () => {
      const originalContent = `# Test Document

<!-- CODE_REF: test.ts:1-5 -->
\`\`\`typescript
const test = 'hello';
console.log(test);
console.log('more');
\`\`\`

Some content`;

      const newContent = `# Test Document

<!-- CODE_REF: test.ts:1-5 -->
\`\`\`typescript
const test = 'hello';
\`\`\`

Some content`;

      // モック設定
      mockFs.readFileSync.mockReturnValue(originalContent as any);
      mockFs.writeFileSync.mockImplementation(() => {});
      mockMarkdownEdit.replaceCodeBlock.mockReturnValue(newContent);

      const action: FixAction = {
        type: 'REPLACE_CODE_BLOCK',
        error: {
          type: 'CODE_CONTENT_MISMATCH',
          message: 'Test',
          ref: {
            fullMatch: '<!-- CODE_REF: test.ts:1-5 -->',
            refPath: 'test.ts',
            startLine: 1,
            endLine: 5,
            docFile: 'test.md',
            docLineNumber: 3,
            codeBlock: "const test = 'hello';\nconsole.log(test);\nconsole.log('more');",
          },
        },
        description: 'Replace code block',
        preview: 'Replace existing code block',
        newStartLine: 1,
        newEndLine: 5,
        newCodeBlock: "const test = 'hello';",
      };

      const lineDelta = applyFix(action);

      expect(mockMarkdownEdit.replaceCodeBlock).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      // 元の10行 → 新しい8行 = -2行
      expect(lineDelta).toBe(-2);
    });
  });
});
