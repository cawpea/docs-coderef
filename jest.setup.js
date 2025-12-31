/**
 * Jest setup file to configure test environment
 */

// Disable chalk colors in tests to make string matching easier
process.env.NO_COLOR = '1';
process.env.FORCE_COLOR = '0';

// Force chalk to disable colors by setting level to 0
const chalk = require('chalk');
chalk.level = 0;
