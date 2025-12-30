import * as fs from 'fs';

import { jest } from '@jest/globals';

import { insertEllipsis, removeEllipsis } from '@/utils/code-ellipsis';

// fsモジュールをモック
jest.mock('fs');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('code-ellipsis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('insertEllipsis', () => {
    it('クラス内の特定メソッドのみを表示し、他を省略すること', () => {
      const fileContent = `export class TestClass {
  methodA() {
    console.log('A');
  }

  /**
   * Target method
   */
  targetMethod() {
    console.log('target');
  }

  methodB() {
    console.log('B');
  }
}`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = insertEllipsis('/test/file.ts', {
        className: 'TestClass',
        memberName: 'targetMethod',
      });

      expect(result).toContain('export class TestClass {');
      expect(result).toContain('targetMethod()');
      expect(result).not.toContain('methodA()');
      expect(result).not.toContain('methodB()');
      expect(result).toContain("console.log('target')");
    });

    it('JSDocコメントを含めてメソッドを表示すること', () => {
      const fileContent = `export class TestClass {
  /**
   * Target method with JSDoc
   * @returns void
   */
  targetMethod() {
    console.log('target');
  }

  otherMethod() {
    console.log('other');
  }
}`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = insertEllipsis('/test/file.ts', {
        className: 'TestClass',
        memberName: 'targetMethod',
      });

      expect(result).toContain('/**');
      expect(result).toContain('* Target method with JSDoc');
      expect(result).toContain('* @returns void');
      expect(result).toContain('*/');
      expect(result).toContain('targetMethod()');
    });

    it('クラスが見つからない場合、元のファイル内容を返すこと', () => {
      const fileContent = `export class OtherClass {
  method() {
    console.log('test');
  }
}`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = insertEllipsis('/test/file.ts', {
        className: 'NonExistentClass',
        memberName: 'method',
      });

      expect(result).toBe(fileContent);
    });

    it('メソッドが見つからない場合、クラス宣言と閉じ括弧のみを表示すること', () => {
      const fileContent = `export class TestClass {
  methodA() {
    console.log('A');
  }

  methodB() {
    console.log('B');
  }
}`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = insertEllipsis('/test/file.ts', {
        className: 'TestClass',
        memberName: 'nonExistentMethod',
      });

      expect(result).toContain('export class TestClass {');
      expect(result).not.toContain('methodA()');
      expect(result).not.toContain('methodB()');
    });

    it('TypeScript/JavaScript以外のファイルでエラーをスローすること', () => {
      expect(() => {
        insertEllipsis('/test/file.py', {
          className: 'TestClass',
          memberName: 'method',
        });
      }).toThrow('TypeScript/JavaScript files only');
    });

    it('複数のメソッドがある場合、ターゲットメソッドのみを表示すること', () => {
      const fileContent = `export class TestClass {
  methodA() {
    console.log('A');
  }

  methodB() {
    console.log('B');
  }

  targetMethod() {
    console.log('target');
  }

  methodC() {
    console.log('C');
  }
}`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = insertEllipsis('/test/file.ts', {
        className: 'TestClass',
        memberName: 'targetMethod',
      });

      expect(result).toContain('export class TestClass {');
      expect(result).toContain('targetMethod()');
      expect(result).toContain("console.log('target')");
      expect(result).not.toContain('methodA()');
      expect(result).not.toContain('methodB()');
      expect(result).not.toContain('methodC()');
    });

    it('コンストラクタを表示できること', () => {
      const fileContent = `export class TestClass {
  private value: number;

  constructor(value: number) {
    this.value = value;
  }

  getValue() {
    return this.value;
  }
}`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = insertEllipsis('/test/file.ts', {
        className: 'TestClass',
        memberName: 'constructor',
      });

      expect(result).toContain('constructor(value: number)');
      expect(result).toContain('this.value = value');
      expect(result).not.toContain('getValue()');
    });

    it('プロパティを表示できること', () => {
      const fileContent = `export class TestClass {
  /**
   * Class property
   */
  public name: string = 'test';

  getValue() {
    return this.name;
  }
}`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = insertEllipsis('/test/file.ts', {
        className: 'TestClass',
        memberName: 'name',
      });

      expect(result).toContain('/**');
      expect(result).toContain('* Class property');
      expect(result).toContain("public name: string = 'test';");
      expect(result).not.toContain('getValue()');
    });

    it('className がない場合、元のファイル内容を返すこと', () => {
      const fileContent = `function testFunction() {
  console.log('test');
}`;

      mockedFs.readFileSync.mockReturnValue(fileContent);

      const result = insertEllipsis('/test/file.ts', {
        memberName: 'testFunction',
      });

      expect(result).toBe(fileContent);
    });
  });

  describe('removeEllipsis', () => {
    it('省略記号を含む行を削除すること', () => {
      const code = `export class TestClass {

  // ... (omitted) ...

  targetMethod() {
    console.log('target');
  }

  // ... (omitted) ...

}`;

      const result = removeEllipsis(code);

      expect(result).not.toContain('// ... (omitted) ...');
      expect(result).toContain('targetMethod()');
      expect(result).toContain('export class TestClass {');
    });

    it('省略記号がない場合、元のコードをそのまま返すこと', () => {
      const code = `export class TestClass {
  targetMethod() {
    console.log('target');
  }
}`;

      const result = removeEllipsis(code);

      expect(result).toBe(code);
    });

    it('複数の省略記号を削除すること', () => {
      const code = `class A {
  // ... (省略) ...
  method1() {}
  // ... (省略) ...
  method2() {}
  // ... (省略) ...
}`;

      const result = removeEllipsis(code);

      expect(result).not.toContain('// ... (omitted) ...');
      expect(result).toContain('method1()');
      expect(result).toContain('method2()');
    });

    it('空文字列を処理できること', () => {
      const result = removeEllipsis('');
      expect(result).toBe('');
    });
  });
});
