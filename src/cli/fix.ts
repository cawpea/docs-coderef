#!/usr/bin/env tsx

/**
 * Interactive script to fix errors detected by validate:docs:code
 *
 * Usage:
 *   tsx scripts/coderef/fix.ts                # Default: no backup
 *   tsx scripts/coderef/fix.ts --dry-run
 *   tsx scripts/coderef/fix.ts --auto --backup  # With backup
 *   npm run coderef:fix
 */

import * as fs from 'fs';
import * as path from 'path';

import { createBackup } from '@/utils/backup';
import { applyFix, createFixAction, handleMultipleMatches, isFixableError } from '@/utils/fix';
import { askYesNo, createPromptInterface, displayFixPreview } from '@/utils/prompt';
import type { CodeRefError, FixOptions, FixResult } from '@/utils/types';
import { extractCodeRefs, findMarkdownFiles, validateCodeRef } from '@/core/validate';
import { loadFixConfig, getDocsPath, type CodeRefFixConfig } from '@/config';

// Parse command line arguments
function parseArgs(): FixOptions {
  const args = process.argv.slice(2);

  return {
    dryRun: args.includes('--dry-run'),
    auto: args.includes('--auto'),
    noBackup: !args.includes('--backup'), // Default: no backup (enabled with --backup)
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

/**
 * Grouped errors
 */
interface ErrorGroup {
  docFile: string;
  errors: CodeRefError[];
}

/**
 * Collect errors
 */
function collectErrors(config: CodeRefFixConfig): ErrorGroup[] {
  const docsPath = getDocsPath(config);
  const markdownFiles = findMarkdownFiles(docsPath);
  const errorsByDoc: Record<string, CodeRefError[]> = {};

  for (const file of markdownFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const refs = extractCodeRefs(content, file);

    for (const ref of refs) {
      const errors = validateCodeRef(ref, config);
      const fixableErrors = errors.filter(isFixableError);

      if (fixableErrors.length > 0) {
        if (!errorsByDoc[file]) {
          errorsByDoc[file] = [];
        }
        errorsByDoc[file].push(...fixableErrors);
      }
    }
  }

  return Object.entries(errorsByDoc).map(([docFile, errors]) => ({
    docFile,
    errors,
  }));
}

/**
 * Main process
 */
export async function main(): Promise<void> {
  const options = parseArgs();

  // Load configuration
  const config = loadFixConfig({
    dryRun: options.dryRun,
    auto: options.auto,
    backup: !options.noBackup,
    verbose: options.verbose,
  });

  console.log('🔧 Starting CODE_REF error fixes...\n');

  if (options.dryRun) {
    console.log('⚠️  DRY RUN mode: No actual changes will be made\n');
  }

  // Collect errors
  const errorGroups = collectErrors(config);

  if (errorGroups.length === 0) {
    console.log('✅ No fixable errors found');
    process.exit(0);
  }

  // Statistics
  const totalErrors = errorGroups.reduce((sum, g) => sum + g.errors.length, 0);
  console.log(`📊 Detected ${totalErrors} fixable error(s) in ${errorGroups.length} file(s)\n`);

  // Interactive interface
  const rl = createPromptInterface();
  const fixResults: FixResult[] = [];
  const backupFiles = new Set<string>();

  try {
    for (const group of errorGroups) {
      console.log(`\n📄 ${path.relative(config.projectRoot, group.docFile)}`);
      console.log(`   ${group.errors.length} error(s)\n`);

      // Sort errors in descending order by docLineNumber (bottom to top)
      // To prevent fixes at the bottom from affecting line numbers at the top
      const sortedErrors = group.errors.sort((a, b) => {
        const lineA = a.ref.docLineNumber ?? Infinity;
        const lineB = b.ref.docLineNumber ?? Infinity;
        return lineB - lineA; // descending
      });

      let _lineOffset = 0; // Track cumulative offset (for future edge case handling)

      for (const error of sortedErrors) {
        console.log(`\n❌ ${error.type}: ${error.message}`);
        console.log(
          `   Reference: ${path.relative(config.projectRoot, error.ref.docFile)}${error.ref.docLineNumber ? `:${error.ref.docLineNumber}` : ''}`
        );

        // Create fix action
        let action;

        if (error.type === 'CODE_LOCATION_MISMATCH') {
          // Handle multiple matches
          action = await handleMultipleMatches(error, rl, config);
        } else {
          const fixActionResult = await createFixAction(error, config, rl);

          // If there are multiple options, let the user choose
          if (Array.isArray(fixActionResult)) {
            console.log('\n🛠️ Please select a fix method:\n');

            fixActionResult.forEach((opt, index) => {
              console.log(`  ${index + 1}. ${opt.description}`);
              const previewLines = opt.preview.split('\n');
              previewLines.forEach((line) => {
                console.log(`     ${line}`);
              });
              console.log('');
            });

            if (options.auto) {
              // Auto-select first option in auto mode
              console.log('   ℹ️  Auto-selecting option 1 in auto mode\n');
              action = fixActionResult[0];
            } else {
              // Let user choose
              const selection = await new Promise<number>((resolve) => {
                rl.question(`Select fix method (1-${fixActionResult.length}): `, (answer) => {
                  const num = parseInt(answer, 10);
                  if (num >= 1 && num <= fixActionResult.length) {
                    resolve(num - 1);
                  } else {
                    console.log('   ⚠️  Invalid selection. Skipping.');
                    resolve(-1);
                  }
                });
              });

              if (selection === -1) {
                console.log('   ⏭️  Skipped');
                continue;
              }

              action = fixActionResult[selection];
            }
          } else {
            action = fixActionResult;
          }
        }

        if (!action) {
          console.log('   ⚠️  This error cannot be fixed');
          continue;
        }

        // Display preview (only for single option)
        if (!Array.isArray(action)) {
          displayFixPreview(action, config.projectRoot);
        }

        // Confirmation
        let shouldFix = options.auto;
        if (!options.auto) {
          shouldFix = await askYesNo(rl, '\nApply this fix?', false);
        }

        if (!shouldFix) {
          console.log('   ⏭️  Skipped');
          continue;
        }

        // Dry run check
        if (options.dryRun) {
          console.log('   ✅ [DRY RUN] Simulated fix');
          fixResults.push({ success: true, action });
          continue;
        }

        // Create backup (once per file)
        let backupPath: string | undefined;
        if (!options.noBackup && !backupFiles.has(group.docFile)) {
          backupPath = createBackup(group.docFile);
          backupFiles.add(group.docFile);
          console.log(`   💾 Backup created: ${path.basename(backupPath)}`);
        }

        // Apply fix
        try {
          const lineDelta = applyFix(action);
          _lineOffset += lineDelta; // Accumulate offset

          // Debug log
          if (lineDelta !== 0) {
            console.log(`   📊 Line delta: ${lineDelta > 0 ? '+' : ''}${lineDelta}`);
          }

          console.log('   ✅ Fix applied');
          fixResults.push({ success: true, action, backupPath });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.log(`   ❌ Fix failed: ${errorMsg}`);
          fixResults.push({ success: false, action, error: errorMsg, backupPath });
        }
      }
    }
  } finally {
    rl.close();
  }

  // Result summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Fix Results Summary\n');

  const successful = fixResults.filter((r) => r.success).length;
  const failed = fixResults.filter((r) => !r.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (backupFiles.size > 0 && !options.noBackup) {
    console.log(`\n💾 Backup files: ${backupFiles.size}`);
    for (const file of backupFiles) {
      const backupPath = `${file}.backup`;
      console.log(`   ${path.relative(config.projectRoot, backupPath)}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

// When executed as a script
if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ An error occurred:', error);
    process.exit(1);
  });
}
