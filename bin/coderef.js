#!/usr/bin/env node

/**
 * CLI entry point for @cawpea/coderef
 */

const { program } = require('commander');
const packageJson = require('../package.json');

program
  .name('coderef')
  .description('Validate and fix code references in markdown documentation')
  .version(packageJson.version);

program
  .command('validate [files...]')
  .description('Validate CODE_REF references in markdown files')
  .option('-v, --verbose', 'Show detailed validation information')
  .action(async (files, options) => {
    const { main } = require('../dist/cli/validate.js');
    const args = [];
    if (options.verbose) args.push('--verbose');
    args.push(...files);
    await main(args);
  });

program
  .command('fix')
  .description('Interactively fix CODE_REF errors')
  .option('--dry-run', 'Show what would be fixed without making changes')
  .option('--auto', 'Automatically apply all fixes without confirmation')
  .option('--backup', 'Create backup files before applying fixes')
  .option('-v, --verbose', 'Show detailed fix information')
  .action(async (options) => {
    const { main } = require('../dist/cli/fix.js');
    const args = [];
    if (options.dryRun) args.push('--dry-run');
    if (options.auto) args.push('--auto');
    if (options.backup) args.push('--backup');
    if (options.verbose) args.push('--verbose');
    await main(args);
  });

program.parse();
