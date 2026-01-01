/**
 * Configuration system for @cawpea/coderef
 *
 * Supports loading configuration from:
 * - .coderefrc.json file
 * - package.json "coderef" field
 * - Environment variables (CODEREF_*)
 * - Programmatic options
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Base configuration for CODE_REF validation
 */
export interface CodeRefConfig {
  /**
   * Project root directory (default: process.cwd())
   */
  projectRoot: string;

  /**
   * Documentation directory relative to projectRoot (default: "docs")
   */
  docsDir: string;

  /**
   * Path to ignore file relative to projectRoot
   */
  ignoreFile?: string;

  /**
   * Additional ignore patterns (globs)
   */
  ignorePatterns?: string[];

  /**
   * Enable verbose logging
   */
  verbose?: boolean;

  /**
   * Specific files or directories to validate (relative to docsDir)
   */
  targets?: string[];
}

/**
 * Configuration for CODE_REF fix command
 */
export interface CodeRefFixConfig extends CodeRefConfig {
  /**
   * Dry-run mode: show what would be fixed without modifying files
   */
  dryRun?: boolean;

  /**
   * Auto-fix mode: apply fixes without prompting
   */
  auto?: boolean;

  /**
   * Create backup before fixing (default: true)
   */
  backup?: boolean;
}

/**
 * Partial configuration that can be provided by users
 */
export type PartialCodeRefConfig = Partial<CodeRefConfig>;
export type PartialCodeRefFixConfig = Partial<CodeRefFixConfig>;

/**
 * Get default configuration values
 * Note: Function to ensure process.cwd() is evaluated at call time
 */
function getDefaultConfig(): CodeRefConfig {
  return {
    projectRoot: process.cwd(),
    docsDir: 'docs',
    verbose: false,
  };
}

/**
 * Load configuration from .coderefrc.json file
 */
function loadConfigFile(projectRoot: string): PartialCodeRefConfig | null {
  const configPath = path.join(projectRoot, '.coderefrc.json');

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to load .coderefrc.json: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Load configuration from package.json "coderef" field
 */
function loadPackageJsonConfig(projectRoot: string): PartialCodeRefConfig | null {
  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);
    return packageJson.coderef || null;
  } catch (_error) {
    // Silently ignore package.json parsing errors
    return null;
  }
}

/**
 * Load configuration from environment variables
 */
function loadEnvConfig(): PartialCodeRefConfig {
  const config: PartialCodeRefConfig = {};

  if (process.env.CODEREF_PROJECT_ROOT) {
    config.projectRoot = process.env.CODEREF_PROJECT_ROOT;
  }

  if (process.env.CODEREF_DOCS_DIR) {
    config.docsDir = process.env.CODEREF_DOCS_DIR;
  }

  if (process.env.CODEREF_IGNORE_FILE) {
    config.ignoreFile = process.env.CODEREF_IGNORE_FILE;
  }

  if (process.env.CODEREF_VERBOSE) {
    config.verbose = process.env.CODEREF_VERBOSE === 'true';
  }

  return config;
}

/**
 * Merge configuration objects with proper precedence
 *
 * Precedence (highest to lowest):
 * 1. Programmatic options
 * 2. Environment variables
 * 3. .coderefrc.json
 * 4. package.json "coderef" field
 * 5. Default values
 */
function mergeConfigs(
  defaultConfig: CodeRefConfig,
  ...configs: (PartialCodeRefConfig | null)[]
): CodeRefConfig {
  const merged: Partial<CodeRefConfig> = {};

  for (const config of configs) {
    if (config) {
      Object.assign(merged, config);
    }
  }

  return {
    ...defaultConfig,
    ...merged,
  } as CodeRefConfig;
}

/**
 * Validate configuration values
 */
function validateConfig(config: CodeRefConfig): void {
  // Ensure projectRoot is an absolute path
  if (!path.isAbsolute(config.projectRoot)) {
    config.projectRoot = path.resolve(config.projectRoot);
  }

  // Validate projectRoot exists
  if (!fs.existsSync(config.projectRoot)) {
    throw new Error(`Project root does not exist: ${config.projectRoot}`);
  }

  // Validate docsDir (it's okay if it doesn't exist yet)
  if (!config.docsDir || config.docsDir.trim() === '') {
    throw new Error('docsDir cannot be empty');
  }

  // Ensure docsDir is not absolute
  if (path.isAbsolute(config.docsDir)) {
    throw new Error('docsDir must be a relative path');
  }
}

/**
 * Load and merge configuration from all sources
 *
 * @param options - Programmatic configuration options
 * @returns Complete configuration object
 */
export function loadConfig(options: PartialCodeRefConfig = {}): CodeRefConfig {
  // Get default configuration (evaluated at call time)
  const defaultConfig = getDefaultConfig();

  // Determine projectRoot first (needed for loading config files)
  const projectRoot = options.projectRoot || process.env.CODEREF_PROJECT_ROOT || process.cwd();

  // Load from all sources
  const packageJsonConfig = loadPackageJsonConfig(projectRoot);
  const fileConfig = loadConfigFile(projectRoot);
  const envConfig = loadEnvConfig();

  // Merge with proper precedence
  const config = mergeConfigs(defaultConfig, packageJsonConfig, fileConfig, envConfig, options);

  // Validate final configuration
  validateConfig(config);

  return config;
}

/**
 * Load configuration for fix command
 *
 * @param options - Programmatic configuration options for fix
 * @returns Complete fix configuration object
 */
export function loadFixConfig(options: PartialCodeRefFixConfig = {}): CodeRefFixConfig {
  const baseConfig = loadConfig(options);

  // Fix-specific defaults
  const fixDefaults = {
    dryRun: false,
    auto: false,
    backup: true,
  };

  return {
    ...baseConfig,
    ...fixDefaults,
    ...options,
  };
}

/**
 * Resolve a path relative to projectRoot
 *
 * @param config - Configuration object
 * @param relativePath - Path relative to projectRoot
 * @returns Absolute path
 */
export function resolveProjectPath(config: CodeRefConfig, relativePath: string): string {
  return path.join(config.projectRoot, relativePath);
}

/**
 * Get absolute path to docs directory
 *
 * @param config - Configuration object
 * @returns Absolute path to docs directory
 */
export function getDocsPath(config: CodeRefConfig): string {
  return resolveProjectPath(config, config.docsDir);
}

/**
 * Get absolute path to ignore file (if configured)
 *
 * @param config - Configuration object
 * @returns Absolute path to ignore file, or null if not configured
 */
export function getIgnoreFilePath(config: CodeRefConfig): string | null {
  if (!config.ignoreFile) {
    return null;
  }
  return resolveProjectPath(config, config.ignoreFile);
}
