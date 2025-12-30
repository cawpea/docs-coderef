import * as fs from 'fs';
import * as path from 'path';
import {
  loadConfig,
  loadFixConfig,
  resolveProjectPath,
  getDocsPath,
  getIgnoreFilePath,
  type CodeRefConfig,
} from '@/config';

describe('Config System', () => {
  const originalCwd = process.cwd();
  const originalEnv = { ...process.env };
  let testDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(__dirname, 'tmp-config-test-'));
    process.chdir(testDir);
  });

  afterEach(() => {
    // Restore original state
    process.chdir(originalCwd);
    process.env = { ...originalEnv };

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('loadConfig', () => {
    describe('Default configuration', () => {
      it('should return default values when no config files exist', () => {
        const config = loadConfig();

        expect(config).toEqual({
          projectRoot: testDir,
          docsDir: 'docs',
          ignoreFile: '.docsignore',
          verbose: false,
        });
      });

      it('should use process.cwd() as default projectRoot', () => {
        const config = loadConfig();
        expect(config.projectRoot).toBe(testDir);
      });
    });

    describe('.coderefrc.json support', () => {
      it('should load configuration from .coderefrc.json', () => {
        const configContent = {
          docsDir: 'documentation',
          ignoreFile: '.docignore',
          verbose: true,
        };

        fs.writeFileSync(
          path.join(testDir, '.coderefrc.json'),
          JSON.stringify(configContent, null, 2)
        );

        const config = loadConfig();

        expect(config.docsDir).toBe('documentation');
        expect(config.ignoreFile).toBe('.docignore');
        expect(config.verbose).toBe(true);
      });

      it('should throw error for invalid .coderefrc.json', () => {
        fs.writeFileSync(path.join(testDir, '.coderefrc.json'), 'invalid json{');

        expect(() => loadConfig()).toThrow('Failed to load .coderefrc.json');
      });
    });

    describe('package.json support', () => {
      it('should load configuration from package.json "coderef" field', () => {
        const packageJson = {
          name: 'test-package',
          version: '1.0.0',
          coderef: {
            docsDir: 'doc',
            verbose: true,
          },
        };

        fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

        const config = loadConfig();

        expect(config.docsDir).toBe('doc');
        expect(config.verbose).toBe(true);
      });

      it('should ignore package.json without coderef field', () => {
        const packageJson = {
          name: 'test-package',
          version: '1.0.0',
        };

        fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

        const config = loadConfig();

        expect(config.docsDir).toBe('docs'); // default value
      });

      it('should silently ignore invalid package.json', () => {
        fs.writeFileSync(path.join(testDir, 'package.json'), 'invalid json{');

        const config = loadConfig();

        expect(config.docsDir).toBe('docs'); // default value
      });
    });

    describe('Environment variable support', () => {
      it('should load configuration from environment variables', () => {
        process.env.CODEREF_DOCS_DIR = 'envdocs';
        process.env.CODEREF_IGNORE_FILE = '.envignore';
        process.env.CODEREF_VERBOSE = 'true';

        const config = loadConfig();

        expect(config.docsDir).toBe('envdocs');
        expect(config.ignoreFile).toBe('.envignore');
        expect(config.verbose).toBe(true);
      });

      it('should handle CODEREF_PROJECT_ROOT', () => {
        const customRoot = path.join(testDir, 'custom');
        fs.mkdirSync(customRoot);
        process.env.CODEREF_PROJECT_ROOT = customRoot;

        const config = loadConfig();

        expect(config.projectRoot).toBe(customRoot);
      });

      it('should parse verbose as boolean', () => {
        process.env.CODEREF_VERBOSE = 'false';
        const config = loadConfig();
        expect(config.verbose).toBe(false);
      });
    });

    describe('Configuration precedence', () => {
      beforeEach(() => {
        // Set up all config sources
        fs.writeFileSync(
          path.join(testDir, 'package.json'),
          JSON.stringify({
            name: 'test',
            coderef: { docsDir: 'package-docs', verbose: false },
          })
        );

        fs.writeFileSync(
          path.join(testDir, '.coderefrc.json'),
          JSON.stringify({ docsDir: 'rc-docs', ignoreFile: '.rcignore' })
        );

        process.env.CODEREF_DOCS_DIR = 'env-docs';
      });

      it('should prioritize programmatic options over all other sources', () => {
        const config = loadConfig({ docsDir: 'programmatic-docs' });
        expect(config.docsDir).toBe('programmatic-docs');
      });

      it('should prioritize env vars over config files', () => {
        const config = loadConfig();
        expect(config.docsDir).toBe('env-docs');
      });

      it('should prioritize .coderefrc.json over package.json', () => {
        delete process.env.CODEREF_DOCS_DIR;
        const config = loadConfig();
        expect(config.docsDir).toBe('rc-docs');
        expect(config.ignoreFile).toBe('.rcignore');
      });

      it('should use package.json when higher priority sources dont specify a field', () => {
        delete process.env.CODEREF_DOCS_DIR;
        delete process.env.CODEREF_VERBOSE;

        fs.writeFileSync(
          path.join(testDir, '.coderefrc.json'),
          JSON.stringify({ ignoreFile: '.rcignore' })
        );

        const config = loadConfig();
        expect(config.verbose).toBe(false); // from package.json
      });
    });

    describe('Programmatic options', () => {
      it('should accept programmatic options', () => {
        const config = loadConfig({
          projectRoot: testDir,
          docsDir: 'custom-docs',
          verbose: true,
          targets: ['file1.md', 'file2.md'],
        });

        expect(config.docsDir).toBe('custom-docs');
        expect(config.verbose).toBe(true);
        expect(config.targets).toEqual(['file1.md', 'file2.md']);
      });

      it('should merge programmatic options with defaults', () => {
        const config = loadConfig({
          docsDir: 'custom-docs',
        });

        expect(config.docsDir).toBe('custom-docs');
        expect(config.projectRoot).toBe(testDir);
        expect(config.ignoreFile).toBe('.docsignore');
      });
    });

    describe('Configuration validation', () => {
      it('should resolve relative projectRoot to absolute path', () => {
        const config = loadConfig({ projectRoot: '.' });
        expect(path.isAbsolute(config.projectRoot)).toBe(true);
      });

      it('should throw error if projectRoot does not exist', () => {
        const nonExistentPath = path.join(testDir, 'nonexistent');

        expect(() => loadConfig({ projectRoot: nonExistentPath })).toThrow(
          'Project root does not exist'
        );
      });

      it('should throw error if docsDir is empty', () => {
        expect(() => loadConfig({ docsDir: '' })).toThrow('docsDir cannot be empty');
      });

      it('should throw error if docsDir is absolute path', () => {
        expect(() => loadConfig({ docsDir: '/absolute/path' })).toThrow(
          'docsDir must be a relative path'
        );
      });
    });
  });

  describe('loadFixConfig', () => {
    it('should return fix-specific defaults', () => {
      const config = loadFixConfig();

      expect(config.dryRun).toBe(false);
      expect(config.auto).toBe(false);
      expect(config.backup).toBe(true);
    });

    it('should merge fix options with base config', () => {
      const config = loadFixConfig({
        docsDir: 'custom-docs',
        dryRun: true,
        auto: true,
        backup: false,
      });

      expect(config.docsDir).toBe('custom-docs');
      expect(config.dryRun).toBe(true);
      expect(config.auto).toBe(true);
      expect(config.backup).toBe(false);
    });

    it('should inherit all base configuration options', () => {
      fs.writeFileSync(
        path.join(testDir, '.coderefrc.json'),
        JSON.stringify({ docsDir: 'documentation', verbose: true })
      );

      const config = loadFixConfig({ dryRun: true });

      expect(config.docsDir).toBe('documentation');
      expect(config.verbose).toBe(true);
      expect(config.dryRun).toBe(true);
    });
  });

  describe('Helper functions', () => {
    let config: CodeRefConfig;

    beforeEach(() => {
      config = loadConfig();
    });

    describe('resolveProjectPath', () => {
      it('should resolve relative path to absolute path', () => {
        const resolved = resolveProjectPath(config, 'src/index.ts');
        expect(resolved).toBe(path.join(testDir, 'src/index.ts'));
      });

      it('should handle paths with ..', () => {
        const resolved = resolveProjectPath(config, '../parent/file.ts');
        expect(resolved).toBe(path.join(testDir, '../parent/file.ts'));
      });
    });

    describe('getDocsPath', () => {
      it('should return absolute path to docs directory', () => {
        const docsPath = getDocsPath(config);
        expect(docsPath).toBe(path.join(testDir, 'docs'));
      });

      it('should use configured docsDir', () => {
        const customConfig = loadConfig({ docsDir: 'documentation' });
        const docsPath = getDocsPath(customConfig);
        expect(docsPath).toBe(path.join(testDir, 'documentation'));
      });
    });

    describe('getIgnoreFilePath', () => {
      it('should return absolute path to ignore file when configured', () => {
        const ignorePath = getIgnoreFilePath(config);
        expect(ignorePath).toBe(path.join(testDir, '.docsignore'));
      });

      it('should return null when ignoreFile is not configured', () => {
        const customConfig = loadConfig({ ignoreFile: undefined });
        const ignorePath = getIgnoreFilePath(customConfig);
        expect(ignorePath).toBe(null);
      });

      it('should use custom ignoreFile path', () => {
        const customConfig = loadConfig({ ignoreFile: '.customignore' });
        const ignorePath = getIgnoreFilePath(customConfig);
        expect(ignorePath).toBe(path.join(testDir, '.customignore'));
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should work with a typical project setup', () => {
      const docsDir = path.join(testDir, 'docs');
      fs.mkdirSync(docsDir);
      fs.writeFileSync(path.join(docsDir, 'README.md'), '# Documentation');
      fs.writeFileSync(path.join(testDir, '.docsignore'), '*.tmp.md');

      const config = loadConfig();

      expect(config.projectRoot).toBe(testDir);
      expect(getDocsPath(config)).toBe(docsDir);
      expect(getIgnoreFilePath(config)).toBe(path.join(testDir, '.docsignore'));
    });

    it('should handle monorepo structure with custom docsDir', () => {
      const packagesDir = path.join(testDir, 'packages/mypackage');
      fs.mkdirSync(packagesDir, { recursive: true });

      fs.writeFileSync(
        path.join(packagesDir, '.coderefrc.json'),
        JSON.stringify({ docsDir: '../../docs' })
      );

      process.chdir(packagesDir);
      const config = loadConfig();

      expect(config.docsDir).toBe('../../docs');
      expect(getDocsPath(config)).toBe(path.join(packagesDir, '../../docs'));
    });
  });
});
