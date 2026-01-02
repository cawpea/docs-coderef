/**
 * Backup management utilities
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Create a backup of a file
 * @param filePath Path to the file to backup
 * @returns Path to the backup file
 */
export function createBackup(filePath: string): string {
  let backupPath = `${filePath}.backup`;
  let counter = 1;

  // Find a unique backup filename
  while (fs.existsSync(backupPath)) {
    backupPath = `${filePath}.backup.${counter}`;
    counter++;
  }

  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

/**
 * Restore a file from backup
 * @param backupPath Path to the backup file
 * @param originalPath Path where the file should be restored
 */
export function restoreBackup(backupPath: string, originalPath: string): void {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  fs.copyFileSync(backupPath, originalPath);
}

/**
 * Delete a backup file
 * @param backupPath Path to the backup file to delete
 */
export function deleteBackup(backupPath: string): void {
  if (fs.existsSync(backupPath)) {
    fs.unlinkSync(backupPath);
  }
}

/**
 * List all backup files for a given file
 * @param filePath Path to the original file
 * @returns Array of backup file paths
 */
export function listBackups(filePath: string): string[] {
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath);

  const files = fs.readdirSync(dir);
  const backupPattern = new RegExp(`^${filename}\\.backup(\\.\\d+)?$`);

  return files.filter((f) => backupPattern.test(f)).map((f) => path.join(dir, f));
}
