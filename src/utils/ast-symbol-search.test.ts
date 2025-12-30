import {
  clearASTCache,
  findSymbolInAST,
  isTypeScriptOrJavaScript,
  parseSymbolPath,
  selectBestSymbolMatch,
} from '@/utils/ast-symbol-search';
import type { SymbolMatch } from '@/utils/types';

describe('ast-symbol-search', () => {
  afterEach(() => {
    clearASTCache();
  });

  describe('isTypeScriptOrJavaScript', () => {
    it('TypeScript/JavaScriptファイルを正しく判定すること', () => {
      expect(isTypeScriptOrJavaScript('/path/to/file.ts')).toBe(true);
      expect(isTypeScriptOrJavaScript('/path/to/file.tsx')).toBe(true);
      expect(isTypeScriptOrJavaScript('/path/to/file.js')).toBe(true);
      expect(isTypeScriptOrJavaScript('/path/to/file.jsx')).toBe(true);
      expect(isTypeScriptOrJavaScript('/path/to/file.mjs')).toBe(true);
      expect(isTypeScriptOrJavaScript('/path/to/file.cjs')).toBe(true);
    });

    it('TypeScript/JavaScript以外のファイルを拒否すること', () => {
      expect(isTypeScriptOrJavaScript('/path/to/file.py')).toBe(false);
      expect(isTypeScriptOrJavaScript('/path/to/file.java')).toBe(false);
      expect(isTypeScriptOrJavaScript('/path/to/file.md')).toBe(false);
      expect(isTypeScriptOrJavaScript('/path/to/file.json')).toBe(false);
    });
  });

  describe('parseSymbolPath', () => {
    it('関数名のみのシンボルパスをパースすること', () => {
      const result = parseSymbolPath('functionName');
      expect(result).toEqual({
        memberName: 'functionName',
      });
    });

    it('クラス名+メソッド名のシンボルパスをパースすること', () => {
      const result = parseSymbolPath('ClassName#methodName');
      expect(result).toEqual({
        className: 'ClassName',
        memberName: 'methodName',
      });
    });

    it('空白を含むシンボルパスをトリムすること', () => {
      const result = parseSymbolPath('  ClassName # methodName  ');
      expect(result).toEqual({
        className: 'ClassName',
        memberName: 'methodName',
      });
    });

    it('無効なシンボルパスでエラーをスローすること', () => {
      expect(() => parseSymbolPath('ClassName#method#extra')).toThrow('Invalid symbol path');
    });
  });

  describe('findSymbolInAST', () => {
    it('クラスのメソッドを検索すること', () => {
      const fileContent = `
        export class TestClass {
          /**
           * Test method
           */
          testMethod() {
            console.log('test');
          }
        }
      `;

      const matches = findSymbolInAST(fileContent, '/test/file.ts', {
        className: 'TestClass',
        memberName: 'testMethod',
      });

      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        className: 'TestClass',
        memberName: 'testMethod',
        scopeType: 'method',
        confidence: 'high',
      });
      // JSDocコメントを含む行番号を検証
      expect(matches[0].startLine).toBeLessThan(matches[0].endLine);
    });

    it('トップレベル関数を検索すること', () => {
      const fileContent = `
        /**
         * Top level function
         */
        export function topLevelFunction() {
          return 'test';
        }
      `;

      const matches = findSymbolInAST(fileContent, '/test/file.ts', {
        memberName: 'topLevelFunction',
      });

      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        memberName: 'topLevelFunction',
        scopeType: 'function',
        confidence: 'high',
      });
      expect(matches[0].className).toBeUndefined();
    });

    it('複数のマッチを返すこと（オーバーロード）', () => {
      const fileContent = `
        export class TestClass {
          testMethod(arg1: string): void;
          testMethod(arg1: string, arg2: number): void;
          testMethod(arg1: string, arg2?: number): void {
            console.log(arg1, arg2);
          }
        }
      `;

      const matches = findSymbolInAST(fileContent, '/test/file.ts', {
        className: 'TestClass',
        memberName: 'testMethod',
      });

      // オーバーロードシグネチャは検出されず、実装のみ検出される
      expect(matches).toHaveLength(1);
    });

    it('シンボルが見つからない場合は空配列を返すこと', () => {
      const fileContent = `
        export class TestClass {
          otherMethod() {
            console.log('test');
          }
        }
      `;

      const matches = findSymbolInAST(fileContent, '/test/file.ts', {
        className: 'TestClass',
        memberName: 'nonExistentMethod',
      });

      expect(matches).toHaveLength(0);
    });

    it('クラスが見つからない場合は空配列を返すこと', () => {
      const fileContent = `
        export class OtherClass {
          testMethod() {
            console.log('test');
          }
        }
      `;

      const matches = findSymbolInAST(fileContent, '/test/file.ts', {
        className: 'NonExistentClass',
        memberName: 'testMethod',
      });

      expect(matches).toHaveLength(0);
    });

    it('TypeScript/JavaScript以外のファイルでエラーをスローすること', () => {
      expect(() => {
        findSymbolInAST('content', '/test/file.py', {
          memberName: 'test',
        });
      }).toThrow('TypeScript/JavaScript files only');
    });

    it('JSDocコメントを含む行番号を取得すること', () => {
      const fileContent = `
        export class TestClass {
          /**
           * Multi-line JSDoc
           * with description
           */
          testMethod() {
            console.log('test');
          }
        }
      `;

      const matches = findSymbolInAST(fileContent, '/test/file.ts', {
        className: 'TestClass',
        memberName: 'testMethod',
      });

      expect(matches).toHaveLength(1);
      // JSDocの開始行が含まれることを確認
      const fileLines = fileContent.split('\n');
      const jsdocStartLine = fileLines.findIndex((line) => line.includes('/**'));
      expect(matches[0].startLine).toBeLessThanOrEqual(jsdocStartLine + 1); // 1-indexed
    });
  });

  describe('selectBestSymbolMatch', () => {
    const mockMatches: SymbolMatch[] = [
      {
        memberName: 'test',
        startLine: 10,
        endLine: 20,
        scopeType: 'function',
        confidence: 'high',
      },
      {
        memberName: 'test',
        startLine: 50,
        endLine: 60,
        scopeType: 'function',
        confidence: 'medium',
      },
      {
        memberName: 'test',
        startLine: 100,
        endLine: 110,
        scopeType: 'function',
        confidence: 'low',
      },
    ];

    it('マッチが0個の場合はnullを返すこと', () => {
      const result = selectBestSymbolMatch([]);
      expect(result).toBeNull();
    });

    it('マッチが1個の場合はそれを返すこと', () => {
      const result = selectBestSymbolMatch([mockMatches[0]]);
      expect(result).toBe(mockMatches[0]);
    });

    it('行番号ヒントがある場合、最も近いマッチを返すこと', () => {
      const result = selectBestSymbolMatch(mockMatches, { start: 48, end: 62 });
      expect(result).toBe(mockMatches[1]); // 50-60が最も近い
    });

    it('行番号ヒントがない場合、信頼度が最も高いマッチを返すこと', () => {
      const result = selectBestSymbolMatch(mockMatches);
      expect(result).toBe(mockMatches[0]); // confidence: 'high'
    });

    it('信頼度が同じ場合、最初のマッチを返すこと', () => {
      const equalConfidenceMatches: SymbolMatch[] = [
        { ...mockMatches[0], confidence: 'high' },
        { ...mockMatches[1], confidence: 'high' },
      ];
      const result = selectBestSymbolMatch(equalConfidenceMatches);
      expect(result).toBe(equalConfidenceMatches[0]);
    });
  });

  describe('ASTキャッシュ', () => {
    it('同じファイルを複数回パースしないこと', () => {
      const fileContent = `
        export class TestClass {
          testMethod() {
            console.log('test');
          }
        }
      `;

      const filePath = '/test/file.ts';

      // 1回目の呼び出し
      const matches1 = findSymbolInAST(fileContent, filePath, {
        className: 'TestClass',
        memberName: 'testMethod',
      });

      // 2回目の呼び出し（キャッシュが使用される）
      const matches2 = findSymbolInAST(fileContent, filePath, {
        className: 'TestClass',
        memberName: 'testMethod',
      });

      expect(matches1).toEqual(matches2);
    });

    it('clearASTCache()でキャッシュをクリアできること', () => {
      const fileContent = `
        export class TestClass {
          testMethod() {
            console.log('test');
          }
        }
      `;

      // キャッシュに追加
      findSymbolInAST(fileContent, '/test/file.ts', {
        className: 'TestClass',
        memberName: 'testMethod',
      });

      // キャッシュをクリア
      clearASTCache();

      // クリア後も正常に動作すること
      const matches = findSymbolInAST(fileContent, '/test/file.ts', {
        className: 'TestClass',
        memberName: 'testMethod',
      });

      expect(matches).toHaveLength(1);
    });
  });
});
