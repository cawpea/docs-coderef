import { execSync } from 'child_process';

import type { GitDiff, GitFileChange } from './types';

/**
 * Execute a git command
 */
export function execGit(args: string[]): string {
  try {
    const result = execSync(`git ${args.join(' ')}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (error: any) {
    throw new Error(`Git command failed: ${error.message}`, { cause: error });
  }
}

/**
 * Check if a branch exists
 */
function branchExists(branchName: string): boolean {
  try {
    execGit(['rev-parse', '--verify', branchName]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current branch name
 */
function getCurrentBranch(): string {
  try {
    return execGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  } catch {
    throw new Error('Failed to get current branch');
  }
}

/**
 * Count commits between two refs
 */
function countCommits(from: string, to: string): number {
  try {
    const result = execGit(['rev-list', '--count', `${from}..${to}`]);
    return parseInt(result, 10);
  } catch {
    return Infinity;
  }
}

/**
 * Detect base branch (develop or main) based on merge-base
 */
export function detectBaseBranch(): string {
  const currentBranch = getCurrentBranch();

  // Skip validation if we're on main or develop
  if (currentBranch === 'main' || currentBranch === 'develop') {
    throw new Error(
      `Cannot validate from ${currentBranch} branch. Please run this from a feature branch.`
    );
  }

  // Check which branches exist
  const mainExists = branchExists('main');
  const developExists = branchExists('develop');

  if (!mainExists && !developExists) {
    throw new Error('Neither main nor develop branch exists');
  }

  // If only one exists, use that
  if (!mainExists) return 'develop';
  if (!developExists) return 'main';

  // Both exist - find merge base for each and count commits
  try {
    const mainMergeBase = execGit(['merge-base', 'HEAD', 'main']);
    const developMergeBase = execGit(['merge-base', 'HEAD', 'develop']);

    const commitsFromMain = countCommits(mainMergeBase, 'HEAD');
    const commitsFromDevelop = countCommits(developMergeBase, 'HEAD');

    // Return the branch with fewer commits (more recent fork point)
    return commitsFromDevelop <= commitsFromMain ? 'develop' : 'main';
  } catch (error: any) {
    // Fallback to develop if merge-base fails
    return 'develop';
  }
}

/**
 * Get changed files between base branch and HEAD
 */
export function getChangedFiles(baseBranch?: string): GitDiff {
  const base = baseBranch || detectBaseBranch();

  try {
    // Get diff between base branch and HEAD
    const diffOutput = execGit(['diff', '--name-status', `${base}...HEAD`]);

    if (!diffOutput) {
      return {
        files: [],
        stats: { added: 0, modified: 0, deleted: 0 },
      };
    }

    const files: GitFileChange[] = [];
    const stats = { added: 0, modified: 0, deleted: 0 };

    // Parse diff output
    const lines = diffOutput.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const [status, ...pathParts] = line.split('\t');
      const path = pathParts.join('\t'); // Handle paths with tabs

      if (!status || !path) continue;

      const fileStatus = status.charAt(0) as 'A' | 'M' | 'D' | 'R';
      files.push({ path, status: fileStatus });

      // Update stats
      if (fileStatus === 'A') stats.added++;
      else if (fileStatus === 'M') stats.modified++;
      else if (fileStatus === 'D') stats.deleted++;
    }

    return { files, stats };
  } catch (error: any) {
    throw new Error(`Failed to get changed files: ${error.message}`, { cause: error });
  }
}
