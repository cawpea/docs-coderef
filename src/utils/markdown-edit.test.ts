import {
  findCodeBlockPosition,
  insertCodeBlockAfterComment,
  moveCodeRefCommentBeforeCodeBlock,
  replaceCodeBlock,
  replaceCodeRefComment,
} from '@/utils/markdown-edit';

describe('markdown-edit', () => {
  describe('replaceCodeRefComment', () => {
    it('CODE_REFコメントを置換すること', () => {
      const content = `# Title

<!-- CODE_REF: src/file.ts:10-20 -->

Some text`;

      const result = replaceCodeRefComment(
        content,
        '<!-- CODE_REF: src/file.ts:10-20 -->',
        '<!-- CODE_REF: src/file.ts:15-25 -->'
      );

      expect(result).toContain('<!-- CODE_REF: src/file.ts:15-25 -->');
      expect(result).not.toContain('<!-- CODE_REF: src/file.ts:10-20 -->');
    });

    it('CODE_REFコメントが見つからない場合、エラーをスローすること', () => {
      const content = `# Title

Some text`;

      expect(() => {
        replaceCodeRefComment(
          content,
          '<!-- CODE_REF: src/file.ts:10-20 -->',
          '<!-- CODE_REF: src/file.ts:15-25 -->'
        );
      }).toThrow('CODE_REF comment not found');
    });

    it('複数のCODE_REFコメントがある場合、最初のマッチを置換すること', () => {
      const content = `<!-- CODE_REF: src/file1.ts:10-20 -->

<!-- CODE_REF: src/file2.ts:30-40 -->`;

      const result = replaceCodeRefComment(
        content,
        '<!-- CODE_REF: src/file1.ts:10-20 -->',
        '<!-- CODE_REF: src/file1.ts:15-25 -->'
      );

      expect(result).toContain('<!-- CODE_REF: src/file1.ts:15-25 -->');
      expect(result).toContain('<!-- CODE_REF: src/file2.ts:30-40 -->');
    });
  });

  describe('insertCodeBlockAfterComment', () => {
    it('CODE_REFコメントの後にコードブロックを挿入すること', () => {
      const content = `# Title

<!-- CODE_REF: src/file.ts:10-20 -->

Some text`;

      const result = insertCodeBlockAfterComment(
        content,
        '<!-- CODE_REF: src/file.ts:10-20 -->',
        'const x = 1;'
      );

      expect(result).toContain('<!-- CODE_REF: src/file.ts:10-20 -->');
      expect(result).toContain('```typescript');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('```');
    });

    it('言語指定をカスタマイズできること', () => {
      const content = `<!-- CODE_REF: src/file.js:10-20 -->`;

      const result = insertCodeBlockAfterComment(
        content,
        '<!-- CODE_REF: src/file.js:10-20 -->',
        'const x = 1;',
        'javascript'
      );

      expect(result).toContain('```javascript');
      expect(result).toContain('const x = 1;');
    });

    it('CODE_REFコメントが見つからない場合、エラーをスローすること', () => {
      const content = `# Title`;

      expect(() => {
        insertCodeBlockAfterComment(
          content,
          '<!-- CODE_REF: src/file.ts:10-20 -->',
          'const x = 1;'
        );
      }).toThrow('CODE_REF comment not found');
    });

    it('CODE_REFコメントの終了タグがない場合、エラーをスローすること', () => {
      const content = `<!-- CODE_REF: src/file.ts:10-20`;

      expect(() => {
        insertCodeBlockAfterComment(content, '<!-- CODE_REF: src/file.ts:10-20', 'const x = 1;');
      }).toThrow('CODE_REF comment end tag not found');
    });

    it('コメント後にコンテンツがある場合、適切に改行を挿入すること', () => {
      const content = `<!-- CODE_REF: src/file.ts:10-20 -->
Some text`;

      const result = insertCodeBlockAfterComment(
        content,
        '<!-- CODE_REF: src/file.ts:10-20 -->',
        'const x = 1;'
      );

      expect(result).toMatch(/-->\n```typescript\nconst x = 1;\n```\n\nSome text/);
    });
  });

  describe('replaceCodeBlock', () => {
    it('コードブロックを置換すること', () => {
      const content = `# Title

\`\`\`typescript
const x = 1;
\`\`\`

Some text`;

      const result = replaceCodeBlock(content, 'const x = 1;', 'const y = 2;');

      expect(result).toContain('const y = 2;');
      expect(result).not.toContain('const x = 1;');
      expect(result).toContain('```typescript');
    });

    it('正規化して比較し、コードブロックを置換すること', () => {
      const content = `\`\`\`typescript
  const   x   =   1;
\`\`\``;

      const result = replaceCodeBlock(content, 'const x = 1;', 'const y = 2;');

      expect(result).toContain('const y = 2;');
    });

    it('一致するコードブロックが見つからない場合、エラーをスローすること', () => {
      const content = `\`\`\`typescript
const x = 1;
\`\`\``;

      expect(() => {
        replaceCodeBlock(content, 'const z = 3;', 'const y = 2;');
      }).toThrow('No matching code block found');
    });

    it('言語識別子を保持すること', () => {
      const content = `\`\`\`javascript
const x = 1;
\`\`\``;

      const result = replaceCodeBlock(content, 'const x = 1;', 'const y = 2;');

      expect(result).toContain('```javascript');
      expect(result).toContain('const y = 2;');
    });

    it('言語識別子がない場合も処理できること', () => {
      const content = `\`\`\`
const x = 1;
\`\`\``;

      const result = replaceCodeBlock(content, 'const x = 1;', 'const y = 2;');

      expect(result).toContain('```');
      expect(result).toContain('const y = 2;');
    });

    it('複数のコードブロックがある場合、最初のマッチを置換すること', () => {
      const content = `\`\`\`typescript
const x = 1;
\`\`\`

\`\`\`typescript
const z = 3;
\`\`\``;

      const result = replaceCodeBlock(content, 'const x = 1;', 'const y = 2;');

      expect(result).toContain('const y = 2;');
      expect(result).toContain('const z = 3;');
      expect(result).not.toContain('const x = 1;');
    });
  });

  describe('findCodeBlockPosition', () => {
    it('CODE_REFコメント後のコードブロック位置を検索すること', () => {
      const content = `# Title

<!-- CODE_REF: src/file.ts:10-20 -->

\`\`\`typescript
const x = 1;
\`\`\``;

      const result = findCodeBlockPosition(content, '<!-- CODE_REF: src/file.ts:10-20 -->');

      expect(result).not.toBeNull();
      expect(result?.language).toBe('typescript');
    });

    it('CODE_REFコメントが見つからない場合、nullを返すこと', () => {
      const content = `# Title`;

      const result = findCodeBlockPosition(content, '<!-- CODE_REF: src/file.ts:10-20 -->');

      expect(result).toBeNull();
    });

    it('CODE_REFコメントの終了タグがない場合、nullを返すこと', () => {
      const content = `<!-- CODE_REF: src/file.ts:10-20`;

      const result = findCodeBlockPosition(content, '<!-- CODE_REF: src/file.ts:10-20');

      expect(result).toBeNull();
    });

    it('コードブロックが見つからない場合、nullを返すこと', () => {
      const content = `<!-- CODE_REF: src/file.ts:10-20 -->

Some text without code block`;

      const result = findCodeBlockPosition(content, '<!-- CODE_REF: src/file.ts:10-20 -->');

      expect(result).toBeNull();
    });

    it('言語識別子がないコードブロックも検索できること', () => {
      const content = `<!-- CODE_REF: src/file.ts:10-20 -->

\`\`\`
const x = 1;
\`\`\``;

      const result = findCodeBlockPosition(content, '<!-- CODE_REF: src/file.ts:10-20 -->');

      expect(result).not.toBeNull();
      expect(result?.language).toBe('typescript'); // デフォルト
    });
  });

  describe('moveCodeRefCommentBeforeCodeBlock', () => {
    it('CODE_REFコメントをコードブロックの直前に移動すること', () => {
      const content = `# Title

<!-- CODE_REF: src/file.ts:10-20 -->

Some text

\`\`\`typescript
const x = 1;
\`\`\``;

      const codeBlockStart = content.indexOf('```typescript');
      const result = moveCodeRefCommentBeforeCodeBlock(
        content,
        '<!-- CODE_REF: src/file.ts:10-20 -->',
        codeBlockStart
      );

      expect(result).toContain('<!-- CODE_REF: src/file.ts:10-20 -->\n```typescript');
      expect(result).not.toMatch(/<!-- CODE_REF.*-->\s+Some text/);
    });

    it('CODE_REFコメントが見つからない場合、エラーをスローすること', () => {
      const content = `# Title

\`\`\`typescript
const x = 1;
\`\`\``;

      expect(() => {
        moveCodeRefCommentBeforeCodeBlock(content, '<!-- CODE_REF: src/file.ts:10-20 -->', 10);
      }).toThrow('CODE_REF comment not found');
    });

    it('CODE_REFコメントの終了タグがない場合、エラーをスローすること', () => {
      const content = `<!-- CODE_REF: src/file.ts:10-20

\`\`\`typescript
const x = 1;
\`\`\``;

      expect(() => {
        moveCodeRefCommentBeforeCodeBlock(content, '<!-- CODE_REF: src/file.ts:10-20', 50);
      }).toThrow('CODE_REF comment end tag not found');
    });

    it('コメントがコードブロックの直前にある場合も正しく処理すること', () => {
      const content = `<!-- CODE_REF: src/file.ts:10-20 -->
\`\`\`typescript
const x = 1;
\`\`\``;

      const codeBlockStart = content.indexOf('```typescript');
      const result = moveCodeRefCommentBeforeCodeBlock(
        content,
        '<!-- CODE_REF: src/file.ts:10-20 -->',
        codeBlockStart
      );

      expect(result).toContain('<!-- CODE_REF: src/file.ts:10-20 -->\n```typescript');
    });

    it('コメントの前後の改行を適切に処理すること', () => {
      const content = `Some text

<!-- CODE_REF: src/file.ts:10-20 -->


More text

\`\`\`typescript
const x = 1;
\`\`\``;

      const codeBlockStart = content.indexOf('```typescript');
      const result = moveCodeRefCommentBeforeCodeBlock(
        content,
        '<!-- CODE_REF: src/file.ts:10-20 -->',
        codeBlockStart
      );

      expect(result).toContain('More text');
      expect(result).toContain('<!-- CODE_REF: src/file.ts:10-20 -->\n```typescript');
    });
  });
});
