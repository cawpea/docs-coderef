import * as fs from 'fs';
import * as readline from 'readline';

import { jest } from '@jest/globals';

import {
  askQuestion,
  askSelectOption,
  askYesNo,
  createPromptInterface,
  displayFixPreview,
} from '@/utils/prompt';
import type { FixAction } from '@/utils/types';

// モジュールをモック
jest.mock('fs');
jest.mock('readline');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedReadline = readline as jest.Mocked<typeof readline>;

describe('prompt', () => {
  let mockRl: jest.Mocked<readline.Interface>;

  beforeEach(() => {
    jest.clearAllMocks();

    // readline.Interface のモックを作成
    mockRl = {
      question: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    } as any;
  });

  describe('createPromptInterface', () => {
    it('readline.Interfaceを作成すること', () => {
      mockedReadline.createInterface.mockReturnValue(mockRl as any);

      const result = createPromptInterface();

      expect(result).toBe(mockRl);
      expect(mockedReadline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout,
      });
    });
  });

  describe('askQuestion', () => {
    it('質問して回答を取得すること', async () => {
      const answer = 'test answer';
      mockRl.question.mockImplementation((_q, callback) => {
        (callback as any)(answer);
      });

      const result = await askQuestion(mockRl, 'What is your name?');

      expect(result).toBe(answer);
      expect(mockRl.question).toHaveBeenCalledWith('What is your name?', expect.any(Function));
    });

    it('空の回答も正しく処理すること', async () => {
      mockRl.question.mockImplementation((_q, callback) => {
        (callback as any)('');
      });

      const result = await askQuestion(mockRl, 'Optional question?');

      expect(result).toBe('');
    });
  });

  describe('askYesNo', () => {
    it('yesの回答でtrueを返すこと', async () => {
      mockRl.question.mockImplementation((_q, callback) => {
        (callback as any)('y');
      });

      const result = await askYesNo(mockRl, 'Continue?');

      expect(result).toBe(true);
    });

    it('Yesの回答でtrueを返すこと（大文字小文字を区別しない）', async () => {
      mockRl.question.mockImplementation((_q, callback) => {
        (callback as any)('Yes');
      });

      const result = await askYesNo(mockRl, 'Continue?');

      expect(result).toBe(true);
    });

    it('noの回答でfalseを返すこと', async () => {
      mockRl.question.mockImplementation((_q, callback) => {
        (callback as any)('n');
      });

      const result = await askYesNo(mockRl, 'Continue?');

      expect(result).toBe(false);
    });

    it('空の回答でデフォルト値を返すこと（デフォルトfalse）', async () => {
      mockRl.question.mockImplementation((_q, callback) => {
        (callback as any)('');
      });

      const result = await askYesNo(mockRl, 'Continue?', false);

      expect(result).toBe(false);
    });

    it('空の回答でデフォルト値を返すこと（デフォルトtrue）', async () => {
      mockRl.question.mockImplementation((_q, callback) => {
        (callback as any)('');
      });

      const result = await askYesNo(mockRl, 'Continue?', true);

      expect(result).toBe(true);
    });

    it('質問文にデフォルト値が含まれること（デフォルトfalse）', async () => {
      mockRl.question.mockImplementation((_q, callback) => {
        (callback as any)('y');
      });

      await askYesNo(mockRl, 'Continue?', false);

      expect(mockRl.question).toHaveBeenCalledWith('Continue? (y/N): ', expect.any(Function));
    });

    it('質問文にデフォルト値が含まれること（デフォルトtrue）', async () => {
      mockRl.question.mockImplementation((_q, callback) => {
        (callback as any)('n');
      });

      await askYesNo(mockRl, 'Continue?', true);

      expect(mockRl.question).toHaveBeenCalledWith('Continue? (Y/n): ', expect.any(Function));
    });
  });

  describe('askSelectOption', () => {
    it('有効なオプションを選択できること', async () => {
      const options = ['Option 1', 'Option 2', 'Option 3'];
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      mockRl.question.mockImplementation((_q, callback) => {
        (callback as any)('2');
      });

      const result = await askSelectOption(mockRl, options, 'Choose an option:');

      expect(result).toBe(1); // 0-based index
      expect(consoleLogSpy).toHaveBeenCalledWith('\nChoose an option:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  1) Option 1');
      expect(consoleLogSpy).toHaveBeenCalledWith('  2) Option 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('  3) Option 3');

      consoleLogSpy.mockRestore();
    });

    it('無効な選択の後、有効な選択ができること', async () => {
      const options = ['Option 1', 'Option 2'];
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      let callCount = 0;
      mockRl.question.mockImplementation((_q, callback) => {
        callCount++;
        if (callCount === 1) {
          (callback as any)('5'); // 無効な選択
        } else {
          (callback as any)('1'); // 有効な選択
        }
      });

      const result = await askSelectOption(mockRl, options, 'Choose:');

      expect(result).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Invalid selection. Please try again.');

      consoleLogSpy.mockRestore();
    });

    it('0を入力した場合、再入力を求めること', async () => {
      const options = ['Option 1', 'Option 2'];
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      let callCount = 0;
      mockRl.question.mockImplementation((_q, callback) => {
        callCount++;
        if (callCount === 1) {
          (callback as any)('0'); // 無効
        } else {
          (callback as any)('1'); // 有効
        }
      });

      const result = await askSelectOption(mockRl, options, 'Choose:');

      expect(result).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Invalid selection. Please try again.');

      consoleLogSpy.mockRestore();
    });
  });

  describe('displayFixPreview', () => {
    let consoleLogSpy: any;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('UPDATE_LINE_NUMBERSタイプの修正プレビューを表示すること', () => {
      const action: FixAction = {
        type: 'UPDATE_LINE_NUMBERS',
        error: {
          type: 'CODE_LOCATION_MISMATCH',
          message: 'Code location mismatch',
          ref: {
            fullMatch: '<!-- CODE_REF: src/test.ts:10-20 -->',
            refPath: 'src/test.ts',
            startLine: 10,
            endLine: 20,
            docFile: 'test.md',
          },
        },
        description: 'Update line numbers',
        preview: 'Preview text',
        newStartLine: 15,
        newEndLine: 25,
      };

      displayFixPreview(action);

      expect(consoleLogSpy).toHaveBeenCalledWith('\nChanges:');
      expect(consoleLogSpy).toHaveBeenCalledWith('- Description: Update line numbers');
    });

    it('INSERT_CODE_BLOCKタイプの修正プレビューを表示すること', () => {
      const action: FixAction = {
        type: 'INSERT_CODE_BLOCK',
        error: {
          type: 'INSERT_CODE_BLOCK',
          message: 'Insert code block',
          ref: {
            fullMatch: '<!-- CODE_REF: src/test.ts:10-20 -->',
            refPath: 'src/test.ts',
            startLine: 10,
            endLine: 20,
            docFile: 'test.md',
          },
        },
        description: 'Insert code block',
        preview: 'Preview text',
        newCodeBlock: 'const x = 1;',
      };

      displayFixPreview(action);

      expect(consoleLogSpy).toHaveBeenCalledWith('\nChanges:');
      expect(consoleLogSpy).toHaveBeenCalledWith('- Description: Insert code block');
      expect(consoleLogSpy).toHaveBeenCalledWith('\x1b[32m+ Insert code block:\x1b[0m');
    });

    it('CODE_CONTENT_MISMATCHタイプの修正プレビューを表示すること', () => {
      const action: FixAction = {
        type: 'REPLACE_CODE_BLOCK',
        error: {
          type: 'CODE_CONTENT_MISMATCH',
          message: 'Code content mismatch',
          ref: {
            fullMatch: '<!-- CODE_REF: src/test.ts:10-20 -->',
            refPath: 'src/test.ts',
            startLine: 10,
            endLine: 20,
            docFile: 'test.md',
          },
          expectedCode: 'const x = 1;',
          actualCode: 'const y = 2;',
        },
        description: 'Replace code block',
        preview: 'Preview text',
        newCodeBlock: 'const y = 2;',
      };

      displayFixPreview(action);

      expect(consoleLogSpy).toHaveBeenCalledWith('\nChanges:');
      expect(consoleLogSpy).toHaveBeenCalledWith('- Description: Replace code block');
    });

    it('CODE_LOCATION_MISMATCHタイプの修正プレビューを表示すること（コードブロックなし）', () => {
      const action: FixAction = {
        type: 'UPDATE_LINE_NUMBERS',
        error: {
          type: 'CODE_LOCATION_MISMATCH',
          message: 'Code location mismatch',
          ref: {
            fullMatch: '<!-- CODE_REF: src/test.ts:10-20 -->',
            refPath: 'src/test.ts',
            startLine: 10,
            endLine: 20,
            docFile: 'test.md',
          },
        },
        description: 'Update line numbers',
        preview: 'Simple preview text',
      };

      displayFixPreview(action);

      expect(consoleLogSpy).toHaveBeenCalledWith('\nChanges:');
      expect(consoleLogSpy).toHaveBeenCalledWith('- Description: Update line numbers');
      expect(consoleLogSpy).toHaveBeenCalledWith('Simple preview text');
    });

    it('REPLACE_CODE_BLOCKタイプの修正プレビューを表示すること', () => {
      const action: FixAction = {
        type: 'REPLACE_CODE_BLOCK',
        error: {
          type: 'REPLACE_CODE_BLOCK',
          message: 'Replace code block',
          ref: {
            fullMatch: '<!-- CODE_REF: src/test.ts:10-20 -->',
            refPath: 'src/test.ts',
            startLine: 10,
            endLine: 20,
            docFile: 'test.md',
          },
          expectedCode: 'old code',
          actualCode: 'new code',
        },
        description: 'Replace code block',
        preview: 'Preview text',
        newCodeBlock: 'new code',
      };

      displayFixPreview(action);

      expect(consoleLogSpy).toHaveBeenCalledWith('\nChanges:');
      expect(consoleLogSpy).toHaveBeenCalledWith('- Description: Replace code block');
    });

    it('UPDATE_END_LINEタイプの修正プレビューを表示すること', () => {
      mockedFs.existsSync.mockReturnValue(true);

      const action: FixAction = {
        type: 'UPDATE_END_LINE',
        error: {
          type: 'UPDATE_END_LINE',
          message: 'Update end line',
          ref: {
            fullMatch: '<!-- CODE_REF: src/test.ts:10-20 -->',
            refPath: 'src/test.ts',
            startLine: 10,
            endLine: 20,
            docFile: 'test.md',
          },
        },
        description: 'Update end line number',
        preview: 'Preview text',
        newStartLine: 10,
        newEndLine: 25,
        newCodeBlock: 'const x = 1;\nconst y = 2;\nconst z = 3;',
      };

      displayFixPreview(action);

      expect(consoleLogSpy).toHaveBeenCalledWith('\nChanges:');
      expect(consoleLogSpy).toHaveBeenCalledWith('- Description: Update end line number');
    });
  });
});
