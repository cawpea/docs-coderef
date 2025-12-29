/**
 * バックアップ管理ユーティリティ
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * ファイルのバックアップを作成
 * @returns バックアップファイルのパス
 */
export function createBackup(filePath: string): string {
  let backupPath = `${filePath}.backup`;
  let counter = 1;

  // ユニークなバックアップファイル名を検索
  while (fs.existsSync(backupPath)) {
    backupPath = `${filePath}.backup.${counter}`;
    counter++;
  }

  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

/**
 * バックアップから復元
 */
export function restoreBackup(backupPath: string, originalPath: string): void {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`バックアップファイルが見つかりません: ${backupPath}`);
  }

  fs.copyFileSync(backupPath, originalPath);
}

/**
 * バックアップファイルを削除
 */
export function deleteBackup(backupPath: string): void {
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }
}

/**
 * 指定ファイルの全バックアップファイルをリスト
 */
export function listBackups(filePath: string): string[] {
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath);

  const files = fs.readdirSync(dir);
  const backupPattern = new RegExp(`^${filename}\\.backup(\\.\\d+)?$`);

  return files.filter((f) => backupPattern.test(f)).map((f) => path.join(dir, f));
}
