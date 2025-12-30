import { describe, expect, it } from '@jest/globals';

import {
  associateCodeBlocksWithRefs,
  extractCodeBlockAfterComment,
  normalizeCode,
} from '@/utils/markdown';
import type { CodeRef } from '@/utils/types';

describe('markdown.utils', () => {
  describe('extractCodeBlockAfterComment', () => {
    it('CODE_REFの直後にコードブロックがある場合、正しく抽出できること', () => {
      const content = `<!-- CODE_REF: src/example.ts:10-20 -->

\`\`\`typescript
export function example() {
  return 'test';
}
\`\`\``;

      const commentIndex = content.indexOf('<!-- CODE_REF');
      const result = extractCodeBlockAfterComment(content, commentIndex);

      expect(result).toBe(`export function example() {
  return 'test';
}
`);
    });

    it('CODE_REFとコードブロックの間にテキストがある場合、nullを返すこと（厳格なルール）', () => {
      const content = `<!-- CODE_REF: src/example.ts:10-20 -->

これは説明文です。

\`\`\`typescript
const x = 1;
\`\`\``;

      const commentIndex = content.indexOf('<!-- CODE_REF');
      const result = extractCodeBlockAfterComment(content, commentIndex);

      expect(result).toBe(null);
    });

    it('CODE_REFの後にコードブロックがない場合、nullを返すこと', () => {
      const content = `<!-- CODE_REF: src/example.ts:10-20 -->

これは説明文だけです。`;

      const commentIndex = content.indexOf('<!-- CODE_REF');
      const result = extractCodeBlockAfterComment(content, commentIndex);

      expect(result).toBeNull();
    });

    it('言語識別子がない場合でもコードブロックを抽出できること', () => {
      const content = `<!-- CODE_REF: src/example.ts:10-20 -->

\`\`\`
const y = 2;
\`\`\``;

      const commentIndex = content.indexOf('<!-- CODE_REF');
      const result = extractCodeBlockAfterComment(content, commentIndex);

      expect(result).toBe('const y = 2;\n');
    });

    it('異なる言語識別子でもコードブロックを抽出できること', () => {
      const content = `<!-- CODE_REF: src/example.js:10-20 -->

\`\`\`javascript
const z = 3;
\`\`\``;

      const commentIndex = content.indexOf('<!-- CODE_REF');
      const result = extractCodeBlockAfterComment(content, commentIndex);

      expect(result).toBe('const z = 3;\n');
    });

    it('空のコードブロックの場合、空文字列を返すこと', () => {
      const content = `<!-- CODE_REF: src/example.ts:10-20 -->

\`\`\`typescript
\`\`\``;

      const commentIndex = content.indexOf('<!-- CODE_REF');
      const result = extractCodeBlockAfterComment(content, commentIndex);

      expect(result).toBe('');
    });

    it('5000文字を超えた位置のコードブロックは検出しないこと', () => {
      const filler = 'a'.repeat(5001);
      const content = `<!-- CODE_REF: src/example.ts:10-20 -->${filler}\`\`\`typescript
const x = 1;
\`\`\``;

      const commentIndex = content.indexOf('<!-- CODE_REF');
      const result = extractCodeBlockAfterComment(content, commentIndex);

      expect(result).toBeNull();
    });
  });

  describe('associateCodeBlocksWithRefs', () => {
    it('各CODE_REFにコードブロックを関連付けること', () => {
      const content = `# ドキュメント

<!-- CODE_REF: src/a.ts:1-5 -->

\`\`\`typescript
const a = 1;
\`\`\`

<!-- CODE_REF: src/b.ts:10-15 -->

\`\`\`typescript
const b = 2;
\`\`\``;

      const refs: CodeRef[] = [
        {
          fullMatch: '<!-- CODE_REF: src/a.ts:1-5 -->',
          refPath: 'src/a.ts',
          startLine: 1,
          endLine: 5,
          docFile: 'test.md',
          docLineNumber: 3,
        },
        {
          fullMatch: '<!-- CODE_REF: src/b.ts:10-15 -->',
          refPath: 'src/b.ts',
          startLine: 10,
          endLine: 15,
          docFile: 'test.md',
          docLineNumber: 7,
        },
      ];

      const result = associateCodeBlocksWithRefs(content, refs);

      expect(result).toHaveLength(2);
      expect(result[0].codeBlock).toBe('const a = 1;\n');
      expect(result[0].docLineNumber).toBe(3);
      expect(result[0].codeBlockStartOffset).toBe(
        content.indexOf('<!-- CODE_REF: src/a.ts:1-5 -->')
      );
      expect(result[1].codeBlock).toBe('const b = 2;\n');
      expect(result[1].docLineNumber).toBe(7);
      expect(result[1].codeBlockStartOffset).toBe(
        content.indexOf('<!-- CODE_REF: src/b.ts:10-15 -->')
      );
    });

    it('コードブロックがない場合、codeBlockプロパティが追加されないこと', () => {
      const content = `<!-- CODE_REF: src/a.ts:1-5 -->

これは説明文だけです。`;

      const refs: CodeRef[] = [
        {
          fullMatch: '<!-- CODE_REF: src/a.ts:1-5 -->',
          refPath: 'src/a.ts',
          startLine: 1,
          endLine: 5,
          docFile: 'test.md',
        },
      ];

      const result = associateCodeBlocksWithRefs(content, refs);

      expect(result).toHaveLength(1);
      expect(result[0].codeBlock).toBeUndefined();
      expect(result[0].codeBlockStartOffset).toBeUndefined();
    });

    it('fullMatchが見つからない場合、元のrefをそのまま返すこと', () => {
      const content = `<!-- CODE_REF: src/other.ts:1-5 -->

\`\`\`typescript
const other = 1;
\`\`\``;

      const refs: CodeRef[] = [
        {
          fullMatch: '<!-- CODE_REF: src/a.ts:1-5 -->', // contentに存在しない
          refPath: 'src/a.ts',
          startLine: 1,
          endLine: 5,
          docFile: 'test.md',
        },
      ];

      const result = associateCodeBlocksWithRefs(content, refs);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(refs[0]); // 変更されていない
    });

    it('CODE_REFとコードブロックの間に見出しがある場合、codeBlockプロパティが追加されないこと', () => {
      const content = `<!-- CODE_REF: src/a.ts:1-5 -->

#### これは見出しです

\`\`\`typescript
const a = 1;
\`\`\``;

      const refs: CodeRef[] = [
        {
          fullMatch: '<!-- CODE_REF: src/a.ts:1-5 -->',
          refPath: 'src/a.ts',
          startLine: 1,
          endLine: 5,
          docFile: 'test.md',
        },
      ];

      const result = associateCodeBlocksWithRefs(content, refs);

      expect(result).toHaveLength(1);
      expect(result[0].codeBlock).toBeUndefined();
      expect(result[0].codeBlockStartOffset).toBeUndefined();
    });

    it('CODE_REFとコードブロックの間に段落がある場合、codeBlockプロパティが追加されないこと', () => {
      const content = `<!-- CODE_REF: src/a.ts:1-5 -->

これは説明文です。

\`\`\`typescript
const a = 1;
\`\`\``;

      const refs: CodeRef[] = [
        {
          fullMatch: '<!-- CODE_REF: src/a.ts:1-5 -->',
          refPath: 'src/a.ts',
          startLine: 1,
          endLine: 5,
          docFile: 'test.md',
        },
      ];

      const result = associateCodeBlocksWithRefs(content, refs);

      expect(result).toHaveLength(1);
      expect(result[0].codeBlock).toBeUndefined();
      expect(result[0].codeBlockStartOffset).toBeUndefined();
    });

    it('CODE_REFの直後（空行のみ）にコードブロックがある場合、codeBlockプロパティが追加されること', () => {
      const content = `<!-- CODE_REF: src/a.ts:1-5 -->

\`\`\`typescript
const a = 1;
\`\`\``;

      const refs: CodeRef[] = [
        {
          fullMatch: '<!-- CODE_REF: src/a.ts:1-5 -->',
          refPath: 'src/a.ts',
          startLine: 1,
          endLine: 5,
          docFile: 'test.md',
        },
      ];

      const result = associateCodeBlocksWithRefs(content, refs);

      expect(result).toHaveLength(1);
      expect(result[0].codeBlock).toBe('const a = 1;\n');
    });

    it('CODE_REFの直後（空行なし）にコードブロックがある場合、codeBlockプロパティが追加されること', () => {
      const content = `<!-- CODE_REF: src/a.ts:1-5 -->
\`\`\`typescript
const a = 1;
\`\`\``;

      const refs: CodeRef[] = [
        {
          fullMatch: '<!-- CODE_REF: src/a.ts:1-5 -->',
          refPath: 'src/a.ts',
          startLine: 1,
          endLine: 5,
          docFile: 'test.md',
        },
      ];

      const result = associateCodeBlocksWithRefs(content, refs);

      expect(result).toHaveLength(1);
      expect(result[0].codeBlock).toBe('const a = 1;\n');
    });
  });

  describe('normalizeCode', () => {
    it('空白のみが異なるコードを正規化できること', () => {
      const code1 = '  const x = 1;  ';
      const code2 = 'const x = 1;';

      expect(normalizeCode(code1)).toBe(normalizeCode(code2));
      expect(normalizeCode(code1)).toBe('constx=1;');
    });

    it('Windows改行とUnix改行を統一すること', () => {
      const codeWindows = 'line1\r\nline2\r\nline3';
      const codeUnix = 'line1\nline2\nline3';

      expect(normalizeCode(codeWindows)).toBe(normalizeCode(codeUnix));
      expect(normalizeCode(codeUnix)).toBe('line1line2line3');
    });

    it('改行とインデントをすべて削除すること', () => {
      const code = `  line1
  line2
  line3  `;

      const result = normalizeCode(code);
      expect(result).toBe('line1line2line3');
    });

    it('連続する空白をすべて削除すること', () => {
      const code = 'const   x   =   1;';
      const expected = 'constx=1;';

      expect(normalizeCode(code)).toBe(expected);
    });

    it('すべての空白を削除すること', () => {
      const code = '\n\nconst x = 1;\n\n';
      const expected = 'constx=1;';

      expect(normalizeCode(code)).toBe(expected);
    });

    it('空行もすべて削除すること', () => {
      const code = `line1

line3`;
      const result = normalizeCode(code);

      expect(result).toBe('line1line3');
    });

    it('タブとスペースの違いを吸収すること', () => {
      const codeWithTabs = '\tconst\tx\t=\t1;';
      const codeWithSpaces = '  const  x  =  1;';

      expect(normalizeCode(codeWithTabs)).toBe(normalizeCode(codeWithSpaces));
      expect(normalizeCode(codeWithTabs)).toBe('constx=1;');
    });

    it('空文字列の場合、空文字列を返すこと', () => {
      expect(normalizeCode('')).toBe('');
    });

    it('空行のみの場合、空文字列を返すこと', () => {
      expect(normalizeCode('\n\n\n')).toBe('');
    });

    it('括弧の内側の改行も削除すること', () => {
      const code1 = 'func(\n  arg1,\n  arg2\n)';
      const code2 = 'func(arg1,arg2)';

      expect(normalizeCode(code1)).toBe(normalizeCode(code2));
      expect(normalizeCode(code1)).toBe('func(arg1,arg2)');
    });
  });
});
