import * as fs from 'fs';

import { jest } from '@jest/globals';

import { createBackup, deleteBackup, listBackups, restoreBackup } from '@/utils/backup';

// fsモジュールをモック
jest.mock('fs');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('backup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBackup', () => {
    it('バックアップファイルを作成すること', () => {
      const filePath = '/test/file.txt';
      mockedFs.existsSync.mockReturnValue(false);

      const result = createBackup(filePath);

      expect(result).toBe('/test/file.txt.backup');
      expect(mockedFs.copyFileSync).toHaveBeenCalledWith(filePath, '/test/file.txt.backup');
    });

    it('バックアップファイルが既に存在する場合、番号付きのバックアップを作成すること', () => {
      const filePath = '/test/file.txt';
      mockedFs.existsSync
        .mockReturnValueOnce(true) // .backup が存在
        .mockReturnValueOnce(false); // .backup.1 が存在しない

      const result = createBackup(filePath);

      expect(result).toBe('/test/file.txt.backup.1');
      expect(mockedFs.copyFileSync).toHaveBeenCalledWith(filePath, '/test/file.txt.backup.1');
    });

    it('複数のバックアップファイルが既に存在する場合、次の番号のバックアップを作成すること', () => {
      const filePath = '/test/file.txt';
      mockedFs.existsSync
        .mockReturnValueOnce(true) // .backup が存在
        .mockReturnValueOnce(true) // .backup.1 が存在
        .mockReturnValueOnce(true) // .backup.2 が存在
        .mockReturnValueOnce(false); // .backup.3 が存在しない

      const result = createBackup(filePath);

      expect(result).toBe('/test/file.txt.backup.3');
      expect(mockedFs.copyFileSync).toHaveBeenCalledWith(filePath, '/test/file.txt.backup.3');
    });
  });

  describe('restoreBackup', () => {
    it('バックアップファイルから元のファイルを復元すること', () => {
      const backupPath = '/test/file.txt.backup';
      const originalPath = '/test/file.txt';
      mockedFs.existsSync.mockReturnValue(true);

      restoreBackup(backupPath, originalPath);

      expect(mockedFs.copyFileSync).toHaveBeenCalledWith(backupPath, originalPath);
    });

    it('バックアップファイルが存在しない場合、エラーをスローすること', () => {
      const backupPath = '/test/file.txt.backup';
      const originalPath = '/test/file.txt';
      mockedFs.existsSync.mockReturnValue(false);

      expect(() => restoreBackup(backupPath, originalPath)).toThrow(
        'Backup file not found: /test/file.txt.backup'
      );
    });
  });

  describe('deleteBackup', () => {
    it('バックアップファイルを削除すること', () => {
      const backupPath = '/test/file.txt.backup';
      mockedFs.existsSync.mockReturnValue(true);

      deleteBackup(backupPath);

      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(backupPath);
    });

    it('バックアップファイルが存在しない場合、何もしないこと', () => {
      const backupPath = '/test/file.txt.backup';
      mockedFs.existsSync.mockReturnValue(false);

      deleteBackup(backupPath);

      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('listBackups', () => {
    it('指定ファイルのバックアップファイルをリストすること', () => {
      const filePath = '/test/dir/file.txt';
      mockedFs.readdirSync.mockReturnValue([
        'file.txt',
        'file.txt.backup',
        'file.txt.backup.1',
        'file.txt.backup.2',
        'other.txt',
        'other.txt.backup',
      ] as any);

      const result = listBackups(filePath);

      expect(result).toEqual([
        '/test/dir/file.txt.backup',
        '/test/dir/file.txt.backup.1',
        '/test/dir/file.txt.backup.2',
      ]);
      expect(mockedFs.readdirSync).toHaveBeenCalledWith('/test/dir');
    });

    it('バックアップファイルがない場合、空配列を返すこと', () => {
      const filePath = '/test/dir/file.txt';
      mockedFs.readdirSync.mockReturnValue(['file.txt', 'other.txt'] as any);

      const result = listBackups(filePath);

      expect(result).toEqual([]);
    });

    it('ルートディレクトリのファイルのバックアップをリストすること', () => {
      const filePath = '/file.txt';
      mockedFs.readdirSync.mockReturnValue(['file.txt', 'file.txt.backup'] as any);

      const result = listBackups(filePath);

      expect(result).toEqual(['/file.txt.backup']);
      expect(mockedFs.readdirSync).toHaveBeenCalledWith('/');
    });

    it('拡張子付きファイル名のバックアップを正しくフィルタリングすること', () => {
      const filePath = '/test/dir/app.config.js';
      mockedFs.readdirSync.mockReturnValue([
        'app.config.js',
        'app.config.js.backup',
        'app.config.js.backup.1',
        'app.js',
        'app.js.backup',
      ] as any);

      const result = listBackups(filePath);

      expect(result).toEqual([
        '/test/dir/app.config.js.backup',
        '/test/dir/app.config.js.backup.1',
      ]);
    });
  });
});
