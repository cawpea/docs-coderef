import * as fs from 'fs';
import * as path from 'path';

/**
 * ファイルパスがパターンにマッチするかチェック（シンプルなグロブマッチング）
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  // ディレクトリパターン（末尾が/）
  if (pattern.endsWith('/')) {
    return filePath.startsWith(pattern) || filePath.startsWith(`${pattern.slice(0, -1)}/`);
  }

  // **/ パターン（任意のディレクトリ階層）
  if (pattern.startsWith('**/')) {
    const suffix = pattern.slice(3);
    // ワイルドカード処理
    if (suffix.includes('*') || suffix.includes('?')) {
      const regex = new RegExp(
        suffix.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.')
      );
      // ファイル名全体またはパスの各部分でマッチングを試みる
      const basename = path.basename(filePath);
      const pathParts = filePath.split('/');
      return regex.test(basename) || pathParts.some((part) => regex.test(part));
    }
    return filePath.endsWith(suffix) || filePath.includes(`/${suffix}`);
  }

  // * または ? ワイルドカード（パスセパレーター無しの場合のみベース名でマッチング）
  if (pattern.includes('*') || pattern.includes('?')) {
    const regex = new RegExp(
      `^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.')}$`
    );
    // パスセパレーターが無いパターンの場合はベース名のみでマッチング
    if (!pattern.includes('/')) {
      return regex.test(path.basename(filePath));
    }
    // パスセパレーターがある場合はフルパスでマッチング
    return regex.test(filePath);
  }

  // 完全一致またはプレフィックスマッチ
  return filePath === pattern || filePath.startsWith(`${pattern}/`);
}

/**
 * ファイルが指定されたパターンで除外されるかチェック
 */
export function isIgnored(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesPattern(filePath, pattern));
}

/**
 * .docsignoreファイルを読み込んでパターンを取得
 */
export function loadDocsignorePatterns(docsignoreFile: string): string[] {
  if (!fs.existsSync(docsignoreFile)) {
    return [];
  }

  const content = fs.readFileSync(docsignoreFile, 'utf-8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')); // コメントと空行を除外
}
