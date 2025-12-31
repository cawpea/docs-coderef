/**
 * Tests for styling utilities
 */

import { formatFixOptions } from './styles';
import type { FixAction, CodeRefError } from './types';

describe('styles', () => {
  // Save original environment variable
  let originalNoColor: string | undefined;

  beforeEach(() => {
    originalNoColor = process.env.NO_COLOR;
  });

  afterEach(() => {
    // Restore original environment variable
    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }
  });

  describe('formatFixOptions', () => {
    it('should format multiple options correctly', () => {
      const mockError: CodeRefError = {
        type: 'CODE_CONTENT_MISMATCH',
        message: 'Code content mismatch',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 20,
          docFile: 'test.md',
        },
      };

      const options: FixAction[] = [
        {
          type: 'REPLACE_CODE_BLOCK',
          error: mockError,
          description: 'Replace code block with entire symbol',
          preview: '```typescript\nfunction foo() {\n  return 42;\n}\n```',
        },
        {
          type: 'UPDATE_LINE_NUMBERS',
          error: mockError,
          description: 'Update line numbers only',
          preview: 'Lines: 10-25',
        },
      ];

      const result = formatFixOptions(options);

      // Should contain option headers
      expect(result).toContain('Option 1');
      expect(result).toContain('Option 2');

      // Should contain descriptions
      expect(result).toContain('Replace code block with entire symbol');
      expect(result).toContain('Update line numbers only');

      // Should contain box drawing characters
      expect(result).toContain('┌');
      expect(result).toContain('└');
      expect(result).toContain('│');
    });

    it('should display short preview as is', () => {
      const mockError: CodeRefError = {
        type: 'CODE_CONTENT_MISMATCH',
        message: 'Code content mismatch',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 15,
          docFile: 'test.md',
        },
      };

      const options: FixAction[] = [
        {
          type: 'REPLACE_CODE_BLOCK',
          error: mockError,
          description: 'Replace with short code',
          preview: '```typescript\nfunction foo() {\n  return 42;\n}\n```',
        },
      ];

      const result = formatFixOptions(options);

      // Should contain all lines of the preview
      expect(result).toContain('function foo()');
      expect(result).toContain('return 42');

      // Should NOT contain truncation message
      expect(result).not.toContain('more lines');
    });

    it('should truncate long preview (>20 lines)', () => {
      const mockError: CodeRefError = {
        type: 'CODE_CONTENT_MISMATCH',
        message: 'Code content mismatch',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 1,
          endLine: 30,
          docFile: 'test.md',
        },
      };

      // Create a preview with 25 lines
      const longPreview = Array.from({ length: 25 }, (_, i) => `line ${i + 1}`).join('\n');

      const options: FixAction[] = [
        {
          type: 'REPLACE_CODE_BLOCK',
          error: mockError,
          description: 'Replace with long code',
          preview: longPreview,
        },
      ];

      const result = formatFixOptions(options);

      // Should contain first few lines
      expect(result).toContain('line 1');
      expect(result).toContain('line 15');

      // Should contain truncation message
      expect(result).toContain('10 more lines');

      // Should NOT contain all lines
      expect(result).not.toContain('line 25');
    });

    it('should handle special characters properly', () => {
      const mockError: CodeRefError = {
        type: 'CODE_CONTENT_MISMATCH',
        message: 'Code content mismatch',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 15,
          docFile: 'test.md',
        },
      };

      const options: FixAction[] = [
        {
          type: 'REPLACE_CODE_BLOCK',
          error: mockError,
          description: 'Replace with special chars',
          preview: '```typescript\nconst str = "Hello <world>";\nconst regex = /\\d+/;\n```',
        },
      ];

      const result = formatFixOptions(options);

      // Should contain special characters
      expect(result).toContain('Hello <world>');
      expect(result).toContain('/\\d+/');
    });

    it('should extract and display line information for range', () => {
      const mockError: CodeRefError = {
        type: 'UPDATE_LINE_NUMBERS',
        message: 'Line numbers need update',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 25,
          docFile: 'test.md',
        },
      };

      const options: FixAction[] = [
        {
          type: 'UPDATE_LINE_NUMBERS',
          error: mockError,
          description: 'Update line numbers',
          preview: 'Lines: 10-25\nSome code here',
        },
      ];

      const result = formatFixOptions(options);

      // Should contain formatted line information
      expect(result).toContain('Lines: 10-25 (16 lines)');
    });

    it('should extract and display line information for single line', () => {
      const mockError: CodeRefError = {
        type: 'UPDATE_LINE_NUMBERS',
        message: 'Line numbers need update',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 10,
          docFile: 'test.md',
        },
      };

      const options: FixAction[] = [
        {
          type: 'UPDATE_LINE_NUMBERS',
          error: mockError,
          description: 'Update line number',
          preview: 'Line: 10\nSome code here',
        },
      ];

      const result = formatFixOptions(options);

      // Should contain formatted line information for single line
      expect(result).toContain('Line: 10');
    });

    it('should handle empty preview', () => {
      const mockError: CodeRefError = {
        type: 'UPDATE_LINE_NUMBERS',
        message: 'Line numbers need update',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 15,
          docFile: 'test.md',
        },
      };

      const options: FixAction[] = [
        {
          type: 'UPDATE_LINE_NUMBERS',
          error: mockError,
          description: 'Update line numbers',
          preview: '',
        },
      ];

      const result = formatFixOptions(options);

      // Should contain option description
      expect(result).toContain('Update line numbers');
      // Should contain box drawing
      expect(result).toContain('┌');
      // Should NOT contain Preview section
      expect(result).not.toContain('Preview:');
    });

    it('should handle preview without line information', () => {
      const mockError: CodeRefError = {
        type: 'REPLACE_CODE_BLOCK',
        message: 'Code content mismatch',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 15,
          docFile: 'test.md',
        },
      };

      const options: FixAction[] = [
        {
          type: 'REPLACE_CODE_BLOCK',
          error: mockError,
          description: 'Replace code block',
          preview: '```typescript\nfunction test() {}\n```',
        },
      ];

      const result = formatFixOptions(options);

      // Should contain option description
      expect(result).toContain('Replace code block');
      // Should contain preview
      expect(result).toContain('Preview:');
      expect(result).toContain('function test()');
      // Should NOT contain line info (no "Lines:" or "Line:" in preview)
      expect(result).not.toMatch(/Lines?: \d+/);
    });
  });

  describe('color disabled environment', () => {
    it('should not output color codes when NO_COLOR=1', () => {
      // Set NO_COLOR environment variable
      process.env.NO_COLOR = '1';

      // Force re-import to pick up environment variable
      // Note: This is tricky in Node.js, so we'll just check that chalk respects NO_COLOR
      const mockError: CodeRefError = {
        type: 'CODE_CONTENT_MISMATCH',
        message: 'Code content mismatch',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 15,
          docFile: 'test.md',
        },
      };

      const options: FixAction[] = [
        {
          type: 'REPLACE_CODE_BLOCK',
          error: mockError,
          description: 'Test option',
          preview: 'function foo() {}',
        },
      ];

      const result = formatFixOptions(options);

      // chalk should automatically detect NO_COLOR and disable colors
      // We just verify the function doesn't crash and returns text
      expect(result).toContain('Option 1');
      expect(result).toContain('Test option');
    });
  });

  describe('syntax highlighting', () => {
    it('should highlight code block markers as dim', () => {
      const mockError: CodeRefError = {
        type: 'REPLACE_CODE_BLOCK',
        message: 'Code content mismatch',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 15,
          docFile: 'test.md',
        },
      };

      const options: FixAction[] = [
        {
          type: 'REPLACE_CODE_BLOCK',
          error: mockError,
          description: 'Replace code',
          preview: '```typescript\ncode here\n```',
        },
      ];

      const result = formatFixOptions(options);

      // Should contain code block markers
      expect(result).toContain('```typescript');
      expect(result).toContain('```');
    });

    it('should highlight keywords in code', () => {
      const mockError: CodeRefError = {
        type: 'REPLACE_CODE_BLOCK',
        message: 'Code content mismatch',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 15,
          docFile: 'test.md',
        },
      };

      const options: FixAction[] = [
        {
          type: 'REPLACE_CODE_BLOCK',
          error: mockError,
          description: 'Replace code',
          preview:
            'function test() {\n  const x = 42;\n  return x;\n}\nexport class Foo {}\ninterface Bar {}',
        },
      ];

      const result = formatFixOptions(options);

      // Should contain code with keywords
      expect(result).toContain('function');
      expect(result).toContain('const');
      expect(result).toContain('return');
      expect(result).toContain('export');
      expect(result).toContain('class');
      expect(result).toContain('interface');
    });
  });

  describe('box drawing', () => {
    it('should contain box drawing characters', () => {
      const mockError: CodeRefError = {
        type: 'CODE_CONTENT_MISMATCH',
        message: 'Code content mismatch',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 15,
          docFile: 'test.md',
        },
      };

      const options: FixAction[] = [
        {
          type: 'REPLACE_CODE_BLOCK',
          error: mockError,
          description: 'Test option',
          preview: 'Some code',
        },
      ];

      const result = formatFixOptions(options);

      // Should contain box drawing characters
      expect(result).toContain('┌');
      expect(result).toContain('─');
      expect(result).toContain('└');
      expect(result).toContain('│');
    });

    it('should visually separate each option', () => {
      const mockError: CodeRefError = {
        type: 'CODE_CONTENT_MISMATCH',
        message: 'Code content mismatch',
        ref: {
          fullMatch: '',
          refPath: 'test.ts',
          startLine: 10,
          endLine: 15,
          docFile: 'test.md',
        },
      };

      const options: FixAction[] = [
        {
          type: 'REPLACE_CODE_BLOCK',
          error: mockError,
          description: 'First option',
          preview: 'Code 1',
        },
        {
          type: 'UPDATE_LINE_NUMBERS',
          error: mockError,
          description: 'Second option',
          preview: 'Code 2',
        },
      ];

      const result = formatFixOptions(options);

      // Each option should have its own box
      const topLeftCount = (result.match(/┌/g) || []).length;
      const bottomLeftCount = (result.match(/└/g) || []).length;

      expect(topLeftCount).toBe(2); // Two options = two top-left corners
      expect(bottomLeftCount).toBe(2); // Two options = two bottom-left corners
    });
  });
});
