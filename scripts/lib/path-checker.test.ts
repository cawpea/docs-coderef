import { requiresDocsUpdate, hasDocsChanges, suggestDocsToUpdate } from './path-checker';

describe('path-checker', () => {
  describe('requiresDocsUpdate', () => {
    it('should return false when no user-facing code changes are detected', () => {
      const changedFiles = ['README.md', 'package.json', 'tsconfig.json'];

      const result = requiresDocsUpdate(changedFiles);

      expect(result.required).toBe(false);
      expect(result.reason).toBe('No user-facing code changes detected');
      expect(result.affectedPaths).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should return true when src/cli/ files are changed', () => {
      const changedFiles = ['src/cli/validate.ts', 'src/cli/fix.ts'];

      const result = requiresDocsUpdate(changedFiles);

      expect(result.required).toBe(true);
      expect(result.reason).toContain('src/cli/');
      expect(result.affectedPaths).toContain('src/cli/');
      expect(result.suggestions).toContain('docs/user-guide/cli-usage.md');
    });

    it('should return true when src/index.ts is changed', () => {
      const changedFiles = ['src/index.ts'];

      const result = requiresDocsUpdate(changedFiles);

      expect(result.required).toBe(true);
      expect(result.reason).toContain('src/index.ts');
      expect(result.affectedPaths).toContain('src/index.ts');
      expect(result.suggestions).toContain('docs/user-guide/');
      expect(result.suggestions).toContain('docs/architecture/overview.md');
    });

    it('should return true when bin/ files are changed', () => {
      const changedFiles = ['bin/coderef.js'];

      const result = requiresDocsUpdate(changedFiles);

      expect(result.required).toBe(true);
      expect(result.reason).toContain('bin/');
      expect(result.affectedPaths).toContain('bin/');
      expect(result.suggestions).toContain('docs/user-guide/installation.md');
    });

    it('should return true when src/core/ files are changed', () => {
      const changedFiles = ['src/core/validate.ts'];

      const result = requiresDocsUpdate(changedFiles);

      expect(result.required).toBe(true);
      expect(result.reason).toContain('src/core/');
      expect(result.affectedPaths).toContain('src/core/');
      expect(result.suggestions).toContain('docs/architecture/overview.md');
    });

    it('should handle multiple changed files with different requirements', () => {
      const changedFiles = ['src/cli/validate.ts', 'src/index.ts', 'README.md'];

      const result = requiresDocsUpdate(changedFiles);

      expect(result.required).toBe(true);
      expect(result.affectedPaths).toContain('src/cli/');
      expect(result.affectedPaths).toContain('src/index.ts');
      expect(result.suggestions).toContain('docs/user-guide/cli-usage.md');
      expect(result.suggestions).toContain('docs/user-guide/');
    });

    it('should not duplicate affected paths', () => {
      const changedFiles = ['src/cli/validate.ts', 'src/cli/fix.ts'];

      const result = requiresDocsUpdate(changedFiles);

      expect(result.affectedPaths).toEqual(['src/cli/']);
      expect(result.affectedPaths.length).toBe(1);
    });

    it('should not duplicate suggestions', () => {
      const changedFiles = ['src/cli/validate.ts', 'src/cli/fix.ts'];

      const result = requiresDocsUpdate(changedFiles);

      expect(result.suggestions).toEqual(['docs/user-guide/cli-usage.md']);
      expect(result.suggestions.length).toBe(1);
    });

    it('should ignore nested paths that do not match required paths', () => {
      const changedFiles = ['src/utils/helper.ts', 'src/types/index.ts'];

      const result = requiresDocsUpdate(changedFiles);

      expect(result.required).toBe(false);
    });
  });

  describe('hasDocsChanges', () => {
    it('should return true when docs files are changed', () => {
      const changedFiles = ['docs/README.md', 'src/index.ts'];

      const result = hasDocsChanges(changedFiles);

      expect(result).toBe(true);
    });

    it('should return false when no docs files are changed', () => {
      const changedFiles = ['src/index.ts', 'README.md'];

      const result = hasDocsChanges(changedFiles);

      expect(result).toBe(false);
    });

    it('should return true for nested docs files', () => {
      const changedFiles = ['docs/user-guide/cli-usage.md'];

      const result = hasDocsChanges(changedFiles);

      expect(result).toBe(true);
    });

    it('should return false for empty file list', () => {
      const changedFiles: string[] = [];

      const result = hasDocsChanges(changedFiles);

      expect(result).toBe(false);
    });
  });

  describe('suggestDocsToUpdate', () => {
    it('should return empty array for files that do not require docs updates', () => {
      const changedFiles = ['README.md', 'package.json'];

      const result = suggestDocsToUpdate(changedFiles);

      expect(result).toEqual([]);
    });

    it('should suggest docs for src/cli/ changes', () => {
      const changedFiles = ['src/cli/validate.ts'];

      const result = suggestDocsToUpdate(changedFiles);

      expect(result).toContain('docs/user-guide/cli-usage.md');
    });

    it('should suggest docs for src/index.ts changes', () => {
      const changedFiles = ['src/index.ts'];

      const result = suggestDocsToUpdate(changedFiles);

      expect(result).toContain('docs/user-guide/');
      expect(result).toContain('docs/architecture/overview.md');
    });

    it('should suggest docs for bin/ changes', () => {
      const changedFiles = ['bin/coderef.js'];

      const result = suggestDocsToUpdate(changedFiles);

      expect(result).toContain('docs/user-guide/installation.md');
    });

    it('should suggest docs for src/core/ changes', () => {
      const changedFiles = ['src/core/validate.ts'];

      const result = suggestDocsToUpdate(changedFiles);

      expect(result).toContain('docs/architecture/overview.md');
    });

    it('should not duplicate suggestions', () => {
      const changedFiles = ['src/cli/validate.ts', 'src/cli/fix.ts'];

      const result = suggestDocsToUpdate(changedFiles);

      expect(result).toEqual(['docs/user-guide/cli-usage.md']);
      expect(result.length).toBe(1);
    });

    it('should combine suggestions from multiple files', () => {
      const changedFiles = ['src/cli/validate.ts', 'src/index.ts'];

      const result = suggestDocsToUpdate(changedFiles);

      expect(result).toContain('docs/user-guide/cli-usage.md');
      expect(result).toContain('docs/user-guide/');
      expect(result).toContain('docs/architecture/overview.md');
    });
  });
});
