import { expandMatchToScope } from '@/utils/ast-scope-expansion';

describe('ast-scope-expansion', () => {
  describe('expandMatchToScope', () => {
    it('関数全体にマッチを拡張すること', () => {
      const fileContent = `
/**
 * Test function
 */
function testFunction() {
  const x = 1;
  return x;
}
      `.trim();

      const result = expandMatchToScope({
        filePath: '/test/file.ts',
        originalMatch: { start: 5, end: 5 }, // const x = 1;
        fileContent,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        start: 1, // JSDocコメントを含む
        end: 7,
        confidence: 'high',
        expansionType: 'ast',
        scopeType: 'function',
      });
    });

    it('クラスメソッド全体にマッチを拡張すること', () => {
      const fileContent = `
export class TestClass {
  /**
   * Test method
   */
  testMethod() {
    const x = 1;
    return x;
  }
}
      `.trim();

      const result = expandMatchToScope({
        filePath: '/test/file.ts',
        originalMatch: { start: 7, end: 7 }, // const x = 1;
        fileContent,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        start: 2, // JSDocコメントを含む
        confidence: 'high',
        expansionType: 'ast',
        scopeType: 'function',
      });
    });

    it('JSDocコメントがない場合、関数の開始行から拡張すること', () => {
      const fileContent = `
function testFunction() {
  const x = 1;
  return x;
}
      `.trim();

      const result = expandMatchToScope({
        filePath: '/test/file.ts',
        originalMatch: { start: 2, end: 2 }, // const x = 1;
        fileContent,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        start: 1, // 関数の開始行
        end: 4,
        confidence: 'high',
        expansionType: 'ast',
        scopeType: 'function',
      });
    });

    it('TypeScript/JavaScript以外のファイルの場合、元のマッチを返すこと', () => {
      const fileContent = 'some python code';

      const result = expandMatchToScope({
        filePath: '/test/file.py',
        originalMatch: { start: 1, end: 1 },
        fileContent,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        start: 1,
        end: 1,
        confidence: 'low',
        expansionType: 'none',
        scopeType: 'unknown',
      });
    });

    it('構文エラーのあるファイルの場合、元のマッチを返すこと', () => {
      const fileContent = 'function broken(((';

      const result = expandMatchToScope({
        filePath: '/test/file.ts',
        originalMatch: { start: 1, end: 1 },
        fileContent,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        start: 1,
        end: 1,
        confidence: 'low',
        expansionType: 'none',
        scopeType: 'unknown',
      });
    });

    it('親スコープが見つからない場合、元のマッチを返すこと', () => {
      const fileContent = `
// トップレベルのコメント
const x = 1;
      `.trim();

      const result = expandMatchToScope({
        filePath: '/test/file.ts',
        originalMatch: { start: 2, end: 2 }, // const x = 1;
        fileContent,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        start: 2,
        end: 2,
        confidence: 'low',
        expansionType: 'none',
        scopeType: 'unknown',
      });
    });

    it('アロー関数全体にマッチを拡張すること', () => {
      const fileContent = `
/**
 * Arrow function
 */
const arrowFunc = () => {
  const x = 1;
  return x;
};
      `.trim();

      const result = expandMatchToScope({
        filePath: '/test/file.ts',
        originalMatch: { start: 6, end: 6 }, // const x = 1;
        fileContent,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        confidence: 'high',
        expansionType: 'ast',
        scopeType: 'function',
      });
    });

    it('クラス全体にマッチを拡張すること', () => {
      const fileContent = `
/**
 * Test class
 */
export class TestClass {
  private x: number;

  constructor() {
    this.x = 1;
  }
}
      `.trim();

      const result = expandMatchToScope({
        filePath: '/test/file.ts',
        originalMatch: { start: 9, end: 9 }, // this.x = 1;
        fileContent,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        confidence: 'high',
        expansionType: 'ast',
      });
    });

    it('インターフェース全体にマッチを拡張すること', () => {
      const fileContent = `
/**
 * Test interface
 */
interface TestInterface {
  name: string;
  age: number;
}
      `.trim();

      const result = expandMatchToScope({
        filePath: '/test/file.ts',
        originalMatch: { start: 6, end: 6 }, // name: string;
        fileContent,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        start: 1, // JSDocコメントを含む
        confidence: 'high',
        expansionType: 'ast',
        scopeType: 'interface',
      });
    });

    it('型エイリアス全体にマッチを拡張すること', () => {
      const fileContent = `
/**
 * Test type alias
 */
type TestType = {
  name: string;
  age: number;
};
      `.trim();

      const result = expandMatchToScope({
        filePath: '/test/file.ts',
        originalMatch: { start: 6, end: 6 }, // name: string;
        fileContent,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        start: 1, // JSDocコメントを含む
        confidence: 'high',
        expansionType: 'ast',
        scopeType: 'type',
      });
    });

    it('複数行のJSDocコメントを含む場合', () => {
      const fileContent = `
/**
 * Multi-line JSDoc comment
 * with multiple lines
 * and descriptions
 * @param x - parameter
 * @returns result
 */
function testFunction(x: number): number {
  return x * 2;
}
      `.trim();

      const result = expandMatchToScope({
        filePath: '/test/file.ts',
        originalMatch: { start: 10, end: 10 }, // return x * 2;
        fileContent,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        start: 1, // 複数行JSDocの開始行
        end: 10,
        confidence: 'high',
        expansionType: 'ast',
        scopeType: 'function',
      });
    });
  });
});
