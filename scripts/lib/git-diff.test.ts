import { execSync } from 'child_process';
import { execGit, detectBaseBranch, getChangedFiles } from './git-diff';

// Mock child_process
jest.mock('child_process');

const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('git-diff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execGit', () => {
    it('should execute git command successfully', () => {
      mockedExecSync.mockReturnValue('output\n' as any);

      const result = execGit(['status']);

      expect(result).toBe('output');
      expect(mockedExecSync).toHaveBeenCalledWith('git status', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should trim whitespace from git command output', () => {
      mockedExecSync.mockReturnValue('  output  \n' as any);

      const result = execGit(['log']);

      expect(result).toBe('output');
    });

    it('should throw error when git command fails', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      expect(() => execGit(['invalid'])).toThrow('Git command failed');
    });

    it('should handle multiple arguments', () => {
      mockedExecSync.mockReturnValue('result' as any);

      execGit(['diff', '--name-status', 'main...HEAD']);

      expect(mockedExecSync).toHaveBeenCalledWith('git diff --name-status main...HEAD', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });
  });

  describe('detectBaseBranch', () => {
    it('should throw error when on main branch', () => {
      mockedExecSync
        .mockReturnValueOnce('main' as any) // getCurrentBranch
        .mockReturnValue('dummy' as any);

      expect(() => detectBaseBranch()).toThrow(
        'Cannot validate from main branch. Please run this from a feature branch.'
      );
    });

    it('should throw error when on develop branch', () => {
      mockedExecSync
        .mockReturnValueOnce('develop' as any) // getCurrentBranch
        .mockReturnValue('dummy' as any);

      expect(() => detectBaseBranch()).toThrow(
        'Cannot validate from develop branch. Please run this from a feature branch.'
      );
    });

    it('should throw error when neither main nor develop exists', () => {
      mockedExecSync
        .mockReturnValueOnce('feature-branch' as any) // getCurrentBranch
        .mockImplementationOnce(() => {
          throw new Error('Branch not found');
        }) // branchExists(main)
        .mockImplementationOnce(() => {
          throw new Error('Branch not found');
        }); // branchExists(develop)

      expect(() => detectBaseBranch()).toThrow('Neither main nor develop branch exists');
    });

    it('should return develop when only develop exists', () => {
      mockedExecSync
        .mockReturnValueOnce('feature-branch' as any) // getCurrentBranch
        .mockImplementationOnce(() => {
          throw new Error('Branch not found');
        }) // branchExists(main)
        .mockReturnValueOnce('dummy' as any); // branchExists(develop)

      const result = detectBaseBranch();

      expect(result).toBe('develop');
    });

    it('should return main when only main exists', () => {
      mockedExecSync
        .mockReturnValueOnce('feature-branch' as any) // getCurrentBranch
        .mockReturnValueOnce('dummy' as any) // branchExists(main)
        .mockImplementationOnce(() => {
          throw new Error('Branch not found');
        }); // branchExists(develop)

      const result = detectBaseBranch();

      expect(result).toBe('main');
    });

    it('should return develop when it has fewer commits', () => {
      mockedExecSync
        .mockReturnValueOnce('feature-branch' as any) // getCurrentBranch
        .mockReturnValueOnce('dummy' as any) // branchExists(main)
        .mockReturnValueOnce('dummy' as any) // branchExists(develop)
        .mockReturnValueOnce('abc123' as any) // merge-base main
        .mockReturnValueOnce('def456' as any) // merge-base develop
        .mockReturnValueOnce('5' as any) // countCommits from main
        .mockReturnValueOnce('3' as any); // countCommits from develop

      const result = detectBaseBranch();

      expect(result).toBe('develop');
    });

    it('should return main when it has fewer commits', () => {
      mockedExecSync
        .mockReturnValueOnce('feature-branch' as any) // getCurrentBranch
        .mockReturnValueOnce('dummy' as any) // branchExists(main)
        .mockReturnValueOnce('dummy' as any) // branchExists(develop)
        .mockReturnValueOnce('abc123' as any) // merge-base main
        .mockReturnValueOnce('def456' as any) // merge-base develop
        .mockReturnValueOnce('2' as any) // countCommits from main
        .mockReturnValueOnce('5' as any); // countCommits from develop

      const result = detectBaseBranch();

      expect(result).toBe('main');
    });

    it('should fallback to develop when merge-base fails', () => {
      mockedExecSync
        .mockReturnValueOnce('feature-branch' as any) // getCurrentBranch
        .mockReturnValueOnce('dummy' as any) // branchExists(main)
        .mockReturnValueOnce('dummy' as any) // branchExists(develop)
        .mockImplementationOnce(() => {
          throw new Error('merge-base failed');
        });

      const result = detectBaseBranch();

      expect(result).toBe('develop');
    });
  });

  describe('getChangedFiles', () => {
    it('should return empty result when no changes detected', () => {
      mockedExecSync.mockReturnValue('' as any);

      const result = getChangedFiles('main');

      expect(result).toEqual({
        files: [],
        stats: { added: 0, modified: 0, deleted: 0 },
      });
    });

    it('should parse added files correctly', () => {
      mockedExecSync.mockReturnValue('A\tsrc/new-file.ts\n' as any);

      const result = getChangedFiles('main');

      expect(result.files).toEqual([{ path: 'src/new-file.ts', status: 'A' }]);
      expect(result.stats).toEqual({ added: 1, modified: 0, deleted: 0 });
    });

    it('should parse modified files correctly', () => {
      mockedExecSync.mockReturnValue('M\tsrc/existing-file.ts\n' as any);

      const result = getChangedFiles('main');

      expect(result.files).toEqual([{ path: 'src/existing-file.ts', status: 'M' }]);
      expect(result.stats).toEqual({ added: 0, modified: 1, deleted: 0 });
    });

    it('should parse deleted files correctly', () => {
      mockedExecSync.mockReturnValue('D\tsrc/removed-file.ts\n' as any);

      const result = getChangedFiles('main');

      expect(result.files).toEqual([{ path: 'src/removed-file.ts', status: 'D' }]);
      expect(result.stats).toEqual({ added: 0, modified: 0, deleted: 1 });
    });

    it('should parse renamed files correctly', () => {
      mockedExecSync.mockReturnValue('R\tsrc/renamed-file.ts\n' as any);

      const result = getChangedFiles('main');

      expect(result.files).toEqual([{ path: 'src/renamed-file.ts', status: 'R' }]);
      expect(result.stats).toEqual({ added: 0, modified: 0, deleted: 0 });
    });

    it('should handle multiple files with different statuses', () => {
      const diffOutput = [
        'A\tsrc/new.ts',
        'M\tsrc/modified.ts',
        'D\tsrc/deleted.ts',
        'A\tdocs/README.md',
      ].join('\n');

      mockedExecSync.mockReturnValue(diffOutput as any);

      const result = getChangedFiles('main');

      expect(result.files).toHaveLength(4);
      expect(result.files).toContainEqual({ path: 'src/new.ts', status: 'A' });
      expect(result.files).toContainEqual({ path: 'src/modified.ts', status: 'M' });
      expect(result.files).toContainEqual({ path: 'src/deleted.ts', status: 'D' });
      expect(result.files).toContainEqual({ path: 'docs/README.md', status: 'A' });
      expect(result.stats).toEqual({ added: 2, modified: 1, deleted: 1 });
    });

    it('should handle file paths with tabs', () => {
      mockedExecSync.mockReturnValue('A\tpath\twith\ttabs.ts\n' as any);

      const result = getChangedFiles('main');

      expect(result.files).toEqual([{ path: 'path\twith\ttabs.ts', status: 'A' }]);
    });

    it('should ignore empty lines', () => {
      const diffOutput = 'A\tsrc/file1.ts\n\n\nM\tsrc/file2.ts\n';
      mockedExecSync.mockReturnValue(diffOutput as any);

      const result = getChangedFiles('main');

      expect(result.files).toHaveLength(2);
    });

    it('should use detectBaseBranch when baseBranch is not provided', () => {
      mockedExecSync
        .mockReturnValueOnce('feature-branch' as any) // getCurrentBranch
        .mockReturnValueOnce('dummy' as any) // branchExists(main)
        .mockImplementationOnce(() => {
          throw new Error('Branch not found');
        }) // branchExists(develop)
        .mockReturnValueOnce('A\tsrc/file.ts\n' as any); // git diff

      const result = getChangedFiles();

      expect(result.files).toHaveLength(1);
      expect(mockedExecSync).toHaveBeenCalledWith(
        'git diff --name-status main...HEAD',
        expect.any(Object)
      );
    });

    it('should throw error when git command fails', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Git error');
      });

      expect(() => getChangedFiles('main')).toThrow('Failed to get changed files');
    });

    it('should skip lines without proper format', () => {
      const diffOutput = ['A\tsrc/valid.ts', 'INVALID_LINE', 'M\tsrc/another.ts'].join('\n');

      mockedExecSync.mockReturnValue(diffOutput as any);

      const result = getChangedFiles('main');

      expect(result.files).toHaveLength(2);
      expect(result.files).toContainEqual({ path: 'src/valid.ts', status: 'A' });
      expect(result.files).toContainEqual({ path: 'src/another.ts', status: 'M' });
    });
  });
});
