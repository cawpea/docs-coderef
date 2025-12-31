import { spawnSync } from 'child_process';
import { execGit, detectBaseBranch, getChangedFiles } from './git-diff';

// Mock child_process
jest.mock('child_process');

const mockedSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>;

describe('git-diff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execGit', () => {
    it('should execute git command successfully', () => {
      mockedSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'output\n',
        stderr: '',
      } as any);

      const result = execGit(['status']);

      expect(result).toBe('output');
      expect(mockedSpawnSync).toHaveBeenCalledWith('git', ['status'], {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should trim whitespace from git command output', () => {
      mockedSpawnSync.mockReturnValue({
        status: 0,
        stdout: '  output  \n',
        stderr: '',
      } as any);

      const result = execGit(['log']);

      expect(result).toBe('output');
    });

    it('should throw error when git command fails', () => {
      mockedSpawnSync.mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'Command failed',
      } as any);

      expect(() => execGit(['invalid'])).toThrow('Git command failed');
    });

    it('should handle multiple arguments', () => {
      mockedSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'result',
        stderr: '',
      } as any);

      execGit(['diff', '--name-status', 'main...HEAD']);

      expect(mockedSpawnSync).toHaveBeenCalledWith(
        'git',
        ['diff', '--name-status', 'main...HEAD'],
        {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
    });
  });

  describe('detectBaseBranch', () => {
    it('should throw error when on main branch', () => {
      mockedSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: 'main', stderr: '' } as any) // getCurrentBranch
        .mockReturnValue({ status: 0, stdout: 'dummy', stderr: '' } as any);

      expect(() => detectBaseBranch()).toThrow(
        'Cannot validate from main branch. Please run this from a feature branch.'
      );
    });

    it('should throw error when on develop branch', () => {
      mockedSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: 'develop', stderr: '' } as any) // getCurrentBranch
        .mockReturnValue({ status: 0, stdout: 'dummy', stderr: '' } as any);

      expect(() => detectBaseBranch()).toThrow(
        'Cannot validate from develop branch. Please run this from a feature branch.'
      );
    });

    it('should throw error when neither main nor develop exists', () => {
      mockedSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: 'feature-branch', stderr: '' } as any) // getCurrentBranch
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'Branch not found' } as any) // branchExists(main)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'Branch not found' } as any); // branchExists(develop)

      expect(() => detectBaseBranch()).toThrow('Neither main nor develop branch exists');
    });

    it('should return develop when only develop exists', () => {
      mockedSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: 'feature-branch', stderr: '' } as any) // getCurrentBranch
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'Branch not found' } as any) // branchExists(main)
        .mockReturnValueOnce({ status: 0, stdout: 'dummy', stderr: '' } as any); // branchExists(develop)

      const result = detectBaseBranch();

      expect(result).toBe('develop');
    });

    it('should return main when only main exists', () => {
      mockedSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: 'feature-branch', stderr: '' } as any) // getCurrentBranch
        .mockReturnValueOnce({ status: 0, stdout: 'dummy', stderr: '' } as any) // branchExists(main)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'Branch not found' } as any); // branchExists(develop)

      const result = detectBaseBranch();

      expect(result).toBe('main');
    });

    it('should return develop when it has fewer commits', () => {
      mockedSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: 'feature-branch', stderr: '' } as any) // getCurrentBranch
        .mockReturnValueOnce({ status: 0, stdout: 'dummy', stderr: '' } as any) // branchExists(main)
        .mockReturnValueOnce({ status: 0, stdout: 'dummy', stderr: '' } as any) // branchExists(develop)
        .mockReturnValueOnce({ status: 0, stdout: 'abc123', stderr: '' } as any) // merge-base main
        .mockReturnValueOnce({ status: 0, stdout: 'def456', stderr: '' } as any) // merge-base develop
        .mockReturnValueOnce({ status: 0, stdout: '5', stderr: '' } as any) // countCommits from main
        .mockReturnValueOnce({ status: 0, stdout: '3', stderr: '' } as any); // countCommits from develop

      const result = detectBaseBranch();

      expect(result).toBe('develop');
    });

    it('should return main when it has fewer commits', () => {
      mockedSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: 'feature-branch', stderr: '' } as any) // getCurrentBranch
        .mockReturnValueOnce({ status: 0, stdout: 'dummy', stderr: '' } as any) // branchExists(main)
        .mockReturnValueOnce({ status: 0, stdout: 'dummy', stderr: '' } as any) // branchExists(develop)
        .mockReturnValueOnce({ status: 0, stdout: 'abc123', stderr: '' } as any) // merge-base main
        .mockReturnValueOnce({ status: 0, stdout: 'def456', stderr: '' } as any) // merge-base develop
        .mockReturnValueOnce({ status: 0, stdout: '2', stderr: '' } as any) // countCommits from main
        .mockReturnValueOnce({ status: 0, stdout: '5', stderr: '' } as any); // countCommits from develop

      const result = detectBaseBranch();

      expect(result).toBe('main');
    });

    it('should fallback to develop when merge-base fails', () => {
      mockedSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: 'feature-branch', stderr: '' } as any) // getCurrentBranch
        .mockReturnValueOnce({ status: 0, stdout: 'dummy', stderr: '' } as any) // branchExists(main)
        .mockReturnValueOnce({ status: 0, stdout: 'dummy', stderr: '' } as any) // branchExists(develop)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'merge-base failed' } as any);

      const result = detectBaseBranch();

      expect(result).toBe('develop');
    });
  });

  describe('getChangedFiles', () => {
    it('should return empty result when no changes detected', () => {
      mockedSpawnSync.mockReturnValue({ status: 0, stdout: '', stderr: '' } as any);

      const result = getChangedFiles('main');

      expect(result).toEqual({
        files: [],
        stats: { added: 0, modified: 0, deleted: 0 },
      });
    });

    it('should parse added files correctly', () => {
      mockedSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'A\tsrc/new-file.ts\n',
        stderr: '',
      } as any);

      const result = getChangedFiles('main');

      expect(result.files).toEqual([{ path: 'src/new-file.ts', status: 'A' }]);
      expect(result.stats).toEqual({ added: 1, modified: 0, deleted: 0 });
    });

    it('should parse modified files correctly', () => {
      mockedSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'M\tsrc/existing-file.ts\n',
        stderr: '',
      } as any);

      const result = getChangedFiles('main');

      expect(result.files).toEqual([{ path: 'src/existing-file.ts', status: 'M' }]);
      expect(result.stats).toEqual({ added: 0, modified: 1, deleted: 0 });
    });

    it('should parse deleted files correctly', () => {
      mockedSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'D\tsrc/removed-file.ts\n',
        stderr: '',
      } as any);

      const result = getChangedFiles('main');

      expect(result.files).toEqual([{ path: 'src/removed-file.ts', status: 'D' }]);
      expect(result.stats).toEqual({ added: 0, modified: 0, deleted: 1 });
    });

    it('should parse renamed files correctly', () => {
      mockedSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'R\tsrc/renamed-file.ts\n',
        stderr: '',
      } as any);

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

      mockedSpawnSync.mockReturnValue({ status: 0, stdout: diffOutput, stderr: '' } as any);

      const result = getChangedFiles('main');

      expect(result.files).toHaveLength(4);
      expect(result.files).toContainEqual({ path: 'src/new.ts', status: 'A' });
      expect(result.files).toContainEqual({ path: 'src/modified.ts', status: 'M' });
      expect(result.files).toContainEqual({ path: 'src/deleted.ts', status: 'D' });
      expect(result.files).toContainEqual({ path: 'docs/README.md', status: 'A' });
      expect(result.stats).toEqual({ added: 2, modified: 1, deleted: 1 });
    });

    it('should handle file paths with tabs', () => {
      mockedSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'A\tpath\twith\ttabs.ts\n',
        stderr: '',
      } as any);

      const result = getChangedFiles('main');

      expect(result.files).toEqual([{ path: 'path\twith\ttabs.ts', status: 'A' }]);
    });

    it('should ignore empty lines', () => {
      const diffOutput = 'A\tsrc/file1.ts\n\n\nM\tsrc/file2.ts\n';
      mockedSpawnSync.mockReturnValue({ status: 0, stdout: diffOutput, stderr: '' } as any);

      const result = getChangedFiles('main');

      expect(result.files).toHaveLength(2);
    });

    it('should use detectBaseBranch when baseBranch is not provided', () => {
      mockedSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: 'feature-branch', stderr: '' } as any) // getCurrentBranch
        .mockReturnValueOnce({ status: 0, stdout: 'dummy', stderr: '' } as any) // branchExists(main)
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: 'Branch not found' } as any) // branchExists(develop)
        .mockReturnValueOnce({ status: 0, stdout: 'A\tsrc/file.ts\n', stderr: '' } as any); // git diff

      const result = getChangedFiles();

      expect(result.files).toHaveLength(1);
      expect(mockedSpawnSync).toHaveBeenCalledWith(
        'git',
        ['diff', '--name-status', 'main...HEAD'],
        expect.any(Object)
      );
    });

    it('should throw error when git command fails', () => {
      mockedSpawnSync.mockReturnValue({ status: 1, stdout: '', stderr: 'Git error' } as any);

      expect(() => getChangedFiles('main')).toThrow('Failed to get changed files');
    });

    it('should skip lines without proper format', () => {
      const diffOutput = ['A\tsrc/valid.ts', 'INVALID_LINE', 'M\tsrc/another.ts'].join('\n');

      mockedSpawnSync.mockReturnValue({ status: 0, stdout: diffOutput, stderr: '' } as any);

      const result = getChangedFiles('main');

      expect(result.files).toHaveLength(2);
      expect(result.files).toContainEqual({ path: 'src/valid.ts', status: 'A' });
      expect(result.files).toContainEqual({ path: 'src/another.ts', status: 'M' });
    });
  });
});
