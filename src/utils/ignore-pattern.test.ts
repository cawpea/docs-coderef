import * as fs from 'fs';

import { isIgnored, loadDocsignorePatterns, matchesPattern } from '@/utils/ignore-pattern';

// fsをモック
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ignore-pattern.utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('matchesPattern', () => {
    describe('ディレクトリパターン（末尾が/）', () => {
      it('ディレクトリ配下のファイルにマッチする', () => {
        expect(matchesPattern('node_modules/package.json', 'node_modules/')).toBe(true);
        expect(matchesPattern('node_modules/nested/file.js', 'node_modules/')).toBe(true);
      });

      it('末尾のスラッシュなしでもマッチする', () => {
        expect(matchesPattern('node_modules/package.json', 'node_modules/')).toBe(true);
      });

      it('異なるディレクトリにはマッチしない', () => {
        expect(matchesPattern('src/index.ts', 'node_modules/')).toBe(false);
      });
    });

    describe('**/パターン（任意のディレクトリ階層）', () => {
      it('任意の階層の指定ファイルにマッチする', () => {
        expect(matchesPattern('src/test.log', '**/*.log')).toBe(true);
        expect(matchesPattern('nested/deep/test.log', '**/*.log')).toBe(true);
      });

      it('ファイル名が含まれる場合にマッチする', () => {
        expect(matchesPattern('logs/debug-file.json', '**/debug-*.json')).toBe(true);
        expect(matchesPattern('src/logs/debug-2024.json', '**/debug-*.json')).toBe(true);
      });

      it('パス内のディレクトリ名にマッチする', () => {
        expect(matchesPattern('node_modules/package/index.js', 'node_modules/')).toBe(true);
        expect(matchesPattern('src/node_modules/index.js', 'node_modules/')).toBe(false);
      });

      it('サフィックスマッチング', () => {
        expect(matchesPattern('path/to/config.json', '**/config.json')).toBe(true);
        expect(matchesPattern('config.json', '**/config.json')).toBe(true);
      });

      it('マッチしないファイル', () => {
        expect(matchesPattern('src/index.ts', '**/*.log')).toBe(false);
      });
    });

    describe('*ワイルドカード', () => {
      it('ワイルドカードパターンにマッチする', () => {
        expect(matchesPattern('test.config.js', '*.config.js')).toBe(true);
        expect(matchesPattern('eslint.config.js', '*.config.js')).toBe(true);
      });

      it('拡張子のみのワイルドカード', () => {
        expect(matchesPattern('file.log', '*.log')).toBe(true);
        expect(matchesPattern('debug.log', '*.log')).toBe(true);
      });

      it('マッチしないファイル', () => {
        expect(matchesPattern('test.js', '*.config.js')).toBe(false);
      });
    });

    describe('完全一致またはプレフィックスマッチ', () => {
      it('完全一致する', () => {
        expect(matchesPattern('README.md', 'README.md')).toBe(true);
      });

      it('プレフィックスマッチする', () => {
        expect(matchesPattern('src/index.ts', 'src')).toBe(true);
        expect(matchesPattern('src/nested/file.ts', 'src')).toBe(true);
      });

      it('マッチしないパス', () => {
        expect(matchesPattern('source/index.ts', 'src')).toBe(false);
        expect(matchesPattern('README.txt', 'README.md')).toBe(false);
      });
    });

    describe('エッジケース', () => {
      it('ドットで始まるファイル', () => {
        expect(matchesPattern('.env', '.env')).toBe(true);
        expect(matchesPattern('.env.local', '.env*')).toBe(true);
      });

      it('複数のワイルドカード', () => {
        expect(matchesPattern('test.spec.ts', '*.spec.*')).toBe(true);
      });

      it('疑問符ワイルドカード', () => {
        expect(matchesPattern('file1.ts', 'file?.ts')).toBe(true);
        expect(matchesPattern('file12.ts', 'file?.ts')).toBe(false);
      });
    });
  });

  describe('isIgnored', () => {
    it('いずれかのパターンにマッチする場合はtrueを返す', () => {
      const patterns = ['node_modules/', '*.log', 'dist/'];

      expect(isIgnored('node_modules/package.json', patterns)).toBe(true);
      expect(isIgnored('debug.log', patterns)).toBe(true);
      expect(isIgnored('dist/bundle.js', patterns)).toBe(true);
    });

    it('どのパターンにもマッチしない場合はfalseを返す', () => {
      const patterns = ['node_modules/', '*.log', 'dist/'];

      expect(isIgnored('src/index.ts', patterns)).toBe(false);
      expect(isIgnored('README.md', patterns)).toBe(false);
    });

    it('空のパターン配列の場合はfalseを返す', () => {
      expect(isIgnored('any/file.ts', [])).toBe(false);
    });

    it('複数パターンの組み合わせ', () => {
      const patterns = ['**/*.test.ts', 'coverage/', '.env*'];

      expect(isIgnored('src/utils/helper.test.ts', patterns)).toBe(true);
      expect(isIgnored('coverage/lcov.info', patterns)).toBe(true);
      expect(isIgnored('.env.local', patterns)).toBe(true);
      expect(isIgnored('src/index.ts', patterns)).toBe(false);
    });
  });

  describe('loadDocsignorePatterns', () => {
    it('.docsignoreファイルが存在する場合はパターンを読み込む', () => {
      const mockContent = `# Comment
node_modules/
*.log

# Another comment
dist/
coverage/`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(mockContent);

      const result = loadDocsignorePatterns('/path/to/.docsignore');

      expect(result).toEqual(['node_modules/', '*.log', 'dist/', 'coverage/']);
      expect(mockedFs.existsSync).toHaveBeenCalledWith('/path/to/.docsignore');
      expect(mockedFs.readFileSync).toHaveBeenCalledWith('/path/to/.docsignore', 'utf-8');
    });

    it('空行を除外する', () => {
      const mockContent = `node_modules/


*.log

`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(mockContent);

      const result = loadDocsignorePatterns('/path/to/.docsignore');

      expect(result).toEqual(['node_modules/', '*.log']);
    });

    it('コメント行を除外する', () => {
      const mockContent = `# This is a comment
node_modules/
# Another comment
*.log`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(mockContent);

      const result = loadDocsignorePatterns('/path/to/.docsignore');

      expect(result).toEqual(['node_modules/', '*.log']);
    });

    it('前後の空白をトリムする', () => {
      const mockContent = `  node_modules/  
  *.log  
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(mockContent);

      const result = loadDocsignorePatterns('/path/to/.docsignore');

      expect(result).toEqual(['node_modules/', '*.log']);
    });

    it('.docsignoreファイルが存在しない場合は空配列を返す', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = loadDocsignorePatterns('/path/to/.docsignore');

      expect(result).toEqual([]);
      expect(mockedFs.existsSync).toHaveBeenCalledWith('/path/to/.docsignore');
      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
    });

    it('空のファイルの場合は空配列を返す', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('');

      const result = loadDocsignorePatterns('/path/to/.docsignore');

      expect(result).toEqual([]);
    });

    it('コメントと空行のみの場合は空配列を返す', () => {
      const mockContent = `# Comment only

# Another comment

`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(mockContent);

      const result = loadDocsignorePatterns('/path/to/.docsignore');

      expect(result).toEqual([]);
    });
  });
});
