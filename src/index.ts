/**
 * @cawpea/coderef - Validate and fix code references in markdown documentation
 *
 * This is the main entry point for programmatic usage.
 * For CLI usage, use the `coderef` command.
 *
 * @example
 * ```typescript
 * import { validateCodeRef, extractCodeRefs, loadConfig } from '@cawpea/coderef';
 *
 * const config = loadConfig();
 * const refs = extractCodeRefs(markdownContent, 'docs/README.md');
 * const errors = validateCodeRef(refs[0], config);
 * ```
 */

// Core validation functions
export {
  findMarkdownFiles,
  extractCodeRefs,
  validateCodeRef,
  validateCodeContent,
  validateSymbolRef,
} from '@/core/validate';

// Configuration
export {
  loadConfig,
  loadFixConfig,
  resolveProjectPath,
  getDocsPath,
  getIgnoreFilePath,
  type CodeRefConfig,
  type CodeRefFixConfig,
  type PartialCodeRefConfig,
  type PartialCodeRefFixConfig,
} from '@/config';

// Types
export type {
  CodeRef,
  CodeRefError,
  SymbolMatch,
  FixAction,
  FixOptions,
  FixResult,
  ExpandedMatch,
  GitExecOptions,
} from '@/utils/types';

// Utility functions
export {
  isTypeScriptOrJavaScript,
  findSymbolInAST,
  parseSymbolPath,
  selectBestSymbolMatch,
} from '@/utils/ast-symbol-search';

export {
  compareCodeContent,
  extractLinesFromFile,
  searchCodeInFile,
} from '@/utils/code-comparison';

export { isIgnored, loadDocsignorePatterns } from '@/utils/ignore-pattern';
