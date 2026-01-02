#!/usr/bin/env node

/**
 * CLI for validating CODE_REF references in markdown documentation
 *
 * Usage:
 *   docs-coderef validate                    # Validate all files
 *   docs-coderef validate --verbose          # Verbose output
 *   docs-coderef validate docs/README.md     # Specific file
 *   docs-coderef validate docs/backend/      # Specific directory
 */

import * as fs from 'fs';
import * as path from 'path';

import { loadConfig, getDocsPath, getIgnoreFilePath } from '@/config';
import { findMarkdownFiles, extractCodeRefs, validateCodeRef } from '@/core/validate';
import { isIgnored, loadDocsignorePatterns } from '@/utils/ignore-pattern';
import { displayLineRangeDiff } from '@/utils/diff-display';
import { extractLinesFromFile } from '@/utils/code-comparison';
import { msg } from '@/utils/message-formatter';

/**
 * CLI options
 */
interface CliOptions {
  verbose: boolean;
  files: string[];
}

/**
 * Parse command line arguments
 */
function parseCliArgs(args: string[]): CliOptions {
  const verbose = args.includes('--verbose') || args.includes('-v');
  const files = args.filter((arg) => !arg.startsWith('-'));

  return { verbose, files };
}

/**
 * Check if path is a directory
 */
function isDirectory(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Resolve target files from CLI arguments
 */
function resolveTargetFiles(targets: string[], projectRoot: string, docsPath: string): string[] {
  if (targets.length === 0) {
    // No files specified, validate all files
    return findMarkdownFiles(docsPath);
  }

  const resolvedFiles = new Set<string>();

  for (const target of targets) {
    // Convert relative path to absolute path
    const absolutePath = path.isAbsolute(target) ? target : path.join(projectRoot, target);

    if (isDirectory(absolutePath)) {
      // Directory: recursively find markdown files
      const files = findMarkdownFiles(absolutePath);
      files.forEach((file) => resolvedFiles.add(file));
    } else if (fs.existsSync(absolutePath)) {
      // File: add directly
      if (absolutePath.endsWith('.md')) {
        resolvedFiles.add(absolutePath);
      }
    } else {
      console.warn(msg.warning(`File not found: ${target}`));
    }
  }

  return Array.from(resolvedFiles);
}

/**
 * Main CLI function
 */
export async function main(args: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseCliArgs(args);

  msg.setVerbose(options.verbose);

  console.log(`${msg.startValidation('Validating CODE_REF references in documentation...')}\n`);

  // Load configuration
  const config = loadConfig({
    targets: options.files.length > 0 ? options.files : undefined,
    verbose: options.verbose,
  });

  // Resolve target files
  const docsPath = getDocsPath(config);
  const allMarkdownFiles = resolveTargetFiles(options.files, config.projectRoot, docsPath);

  if (options.files.length > 0 && options.verbose) {
    console.log(`${msg.debug(`Specified files/directories: ${options.files.join(', ')}`)}\n`);
  }

  // Load ignore patterns
  const ignoreFilePath = getIgnoreFilePath(config);
  const ignorePatterns = ignoreFilePath ? loadDocsignorePatterns(ignoreFilePath) : [];
  if (options.verbose) {
    console.log(`${msg.debug(`Loaded ${ignorePatterns.length} ignore patterns`)}\n`);
  }

  // Filter files not excluded by ignore patterns
  const markdownFiles = allMarkdownFiles.filter((file) => {
    const relativePath = path.relative(config.projectRoot, file);
    return !isIgnored(relativePath, ignorePatterns);
  });

  if (options.verbose && allMarkdownFiles.length > markdownFiles.length) {
    console.log(
      `${msg.debug(`${allMarkdownFiles.length - markdownFiles.length} files excluded by ignore patterns`)}\n`
    );
  }

  console.log(`${msg.file(`Found ${markdownFiles.length} markdown files`)}\n`);

  // Extract all CODE_REF references
  let totalRefs = 0;
  const allRefs: { ref: any; file: string }[] = [];

  for (const file of markdownFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const refs = extractCodeRefs(content, file);

    if (refs.length > 0) {
      totalRefs += refs.length;
      refs.forEach((ref) => allRefs.push({ ref, file }));

      if (options.verbose) {
        console.log(msg.debug(`  ${path.relative(docsPath, file)}: ${refs.length} references`));
      }
    }
  }

  console.log(`\n${msg.info(`Found ${totalRefs} CODE_REF references`)}\n`);

  if (totalRefs === 0) {
    console.log(msg.success('No CODE_REF references found (no validation needed)'));
    process.exit(0);
  }

  // Validate each reference
  const allErrors = await Promise.all(allRefs.map(({ ref }) => validateCodeRef(ref, config))).then(
    (results) => results.flat()
  );

  // Display results
  if (allErrors.length === 0) {
    console.log(msg.success('All CODE_REF references are valid!'));
    process.exit(0);
  } else {
    console.log(`${msg.error(`Found ${allErrors.length} errors:`)}\n`);

    // Group errors by document
    const errorsByDoc: Record<string, any[]> = {};

    for (const error of allErrors) {
      const docFile = path.relative(config.projectRoot, error.ref.docFile);

      if (!errorsByDoc[docFile]) {
        errorsByDoc[docFile] = [];
      }

      errorsByDoc[docFile].push(error);
    }

    // Display error details
    for (const [docFile, errors] of Object.entries(errorsByDoc)) {
      console.log(`${msg.file(docFile)}:`);

      for (const error of errors) {
        console.log(`   ${msg.error(`${error.type}: ${error.message}`)}`);

        // Display line number in document
        const filePath = path.relative(config.projectRoot, error.ref.docFile);
        const lineInfo = error.ref.docLineNumber ? `:${error.ref.docLineNumber}` : '';
        console.log(msg.context(`   ${filePath}${lineInfo}: ${error.ref.fullMatch}`));

        // Display diff for CODE_LOCATION_MISMATCH in verbose mode
        if (error.type === 'CODE_LOCATION_MISMATCH' && error.suggestedLines && options.verbose) {
          const filePath = path.join(config.projectRoot, error.ref.refPath);
          const actualCode = extractLinesFromFile(
            filePath,
            error.suggestedLines.start,
            error.suggestedLines.end
          );
          const diff = displayLineRangeDiff(
            actualCode,
            { start: error.ref.startLine!, end: error.ref.endLine! },
            error.suggestedLines
          );
          console.log(diff);
        }
      }
      console.log('');
    }

    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(msg.error(`Error: ${error}`));
    process.exit(1);
  });
}
