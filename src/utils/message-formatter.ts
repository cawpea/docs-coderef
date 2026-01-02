/**
 * Centralized message formatting and styling for CLI output
 * Provides consistent color schemes, emoji usage, and message formats
 */

import chalk from 'chalk';

/**
 * Message type definitions
 */
export type MessageType = 'error' | 'warning' | 'info' | 'success' | 'debug' | 'neutral';

/**
 * Color schemes by message type
 */
export const COLOR_SCHEMES = {
  error: chalk.redBright,
  warning: chalk.yellow,
  info: chalk.cyan,
  success: chalk.green,
  debug: chalk.gray,
  neutral: chalk.white,
  // Accent colors
  highlight: chalk.cyan.bold,
  dim: chalk.dim,
  code: chalk.yellow,
} as const;

/**
 * Emoji standards by context
 */
const EMOJIS = {
  error: '❌',
  warning: '⚠️',
  success: '✅',
  info: 'ℹ️',
  search: '🔍',
  fix: '🔧',
  file: '📄',
  stats: '📊',
  backup: '💾',
  skip: '⏭️',
} as const;

/**
 * Message formatter class
 */
export class MessageFormatter {
  private static verboseMode = false;

  /**
   * Set verbose mode
   * @param enabled Whether verbose mode is enabled
   */
  static setVerbose(enabled: boolean): void {
    this.verboseMode = enabled;
  }

  /**
   * Format error message
   * @param text Error message text
   * @returns Formatted error message with emoji and color
   */
  static error(text: string): string {
    return `${COLOR_SCHEMES.error(`${EMOJIS.error} ${text}`)}`;
  }

  /**
   * Format warning message
   * @param text Warning message text
   * @returns Formatted warning message with emoji and color
   */
  static warning(text: string): string {
    return `${COLOR_SCHEMES.warning(`${EMOJIS.warning} ${text}`)}`;
  }

  /**
   * Format info message
   * @param text Info message text
   * @returns Formatted info message with emoji and color
   */
  static info(text: string): string {
    return `${COLOR_SCHEMES.info(`${EMOJIS.info} ${text}`)}`;
  }

  /**
   * Format success message
   * @param text Success message text
   * @returns Formatted success message with emoji and color
   */
  static success(text: string): string {
    return `${COLOR_SCHEMES.success(`${EMOJIS.success} ${text}`)}`;
  }

  /**
   * Format debug message (only shown in verbose mode)
   * @param text Debug message text
   * @returns Formatted debug message if verbose mode is enabled, empty string otherwise
   */
  static debug(text: string): string {
    if (!this.verboseMode) {
      return '';
    }
    return COLOR_SCHEMES.debug(text);
  }

  /**
   * Format neutral message (no emoji, white color)
   * @param text Neutral message text
   * @returns Formatted neutral message
   */
  static neutral(text: string): string {
    return COLOR_SCHEMES.neutral(text);
  }

  /**
   * Format error detail with type, message, and optional location
   * @param type Error type (e.g., 'CODE_CONTENT_MISMATCH')
   * @param message Error message
   * @param location Optional file location
   * @returns Formatted error detail
   */
  static errorDetail(type: string, message: string, location?: string): string {
    const lines: string[] = [];
    lines.push(this.error(`${type}: ${message}`));
    if (location) {
      lines.push(`   ${COLOR_SCHEMES.dim(`Reference: ${location}`)}`);
    }
    return lines.join('\n');
  }

  /**
   * Format summary section
   * @param successful Number of successful operations
   * @param failed Number of failed operations
   * @param backupPaths Array of backup file paths
   * @returns Formatted summary section
   */
  static summary(successful: number, failed: number, backupPaths: string[]): string {
    const lines: string[] = [];
    const separator = COLOR_SCHEMES.dim('━'.repeat(60));

    lines.push('');
    lines.push(separator);
    lines.push(`${EMOJIS.stats} Fix Results Summary`);
    lines.push('');
    lines.push(COLOR_SCHEMES.success(`${EMOJIS.success} Successful: ${successful}`));
    lines.push(COLOR_SCHEMES.error(`${EMOJIS.error} Failed: ${failed}`));

    if (backupPaths.length > 0) {
      lines.push('');
      lines.push(`${EMOJIS.backup} Backup files: ${backupPaths.length}`);
      backupPaths.forEach((path) => {
        lines.push(`   ${COLOR_SCHEMES.dim(path)}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Format start message for fix operation
   * @param text Start message text
   * @returns Formatted start message with fix emoji
   */
  static startFix(text: string): string {
    return `${COLOR_SCHEMES.info(`${EMOJIS.fix} ${text}`)}`;
  }

  /**
   * Format start message for validation operation
   * @param text Start message text
   * @returns Formatted start message with search emoji
   */
  static startValidation(text: string): string {
    return `${COLOR_SCHEMES.info(`${EMOJIS.search} ${text}`)}`;
  }

  /**
   * Format file reference
   * @param text File path or reference
   * @returns Formatted file reference with emoji
   */
  static file(text: string): string {
    return `${EMOJIS.file} ${COLOR_SCHEMES.neutral(text)}`;
  }

  /**
   * Format backup notification
   * @param text Backup message text
   * @returns Formatted backup message with emoji
   */
  static backup(text: string): string {
    return `${COLOR_SCHEMES.info(`${EMOJIS.backup} ${text}`)}`;
  }

  /**
   * Format skip notification
   * @param text Skip message text
   * @returns Formatted skip message with emoji
   */
  static skip(text: string): string {
    return `${COLOR_SCHEMES.neutral(`${EMOJIS.skip} ${text}`)}`;
  }

  /**
   * Format context line (indented with dim color)
   * @param text Context text
   * @returns Formatted context line with 3 spaces indentation
   */
  static context(text: string): string {
    return `   ${COLOR_SCHEMES.dim(text)}`;
  }
}

/**
 * Convenience export for message formatting
 */
export const msg = {
  error: (text: string) => MessageFormatter.error(text),
  warning: (text: string) => MessageFormatter.warning(text),
  info: (text: string) => MessageFormatter.info(text),
  success: (text: string) => MessageFormatter.success(text),
  debug: (text: string) => MessageFormatter.debug(text),
  neutral: (text: string) => MessageFormatter.neutral(text),
  errorDetail: (type: string, message: string, location?: string) =>
    MessageFormatter.errorDetail(type, message, location),
  summary: (successful: number, failed: number, backupPaths: string[]) =>
    MessageFormatter.summary(successful, failed, backupPaths),
  startFix: (text: string) => MessageFormatter.startFix(text),
  startValidation: (text: string) => MessageFormatter.startValidation(text),
  file: (text: string) => MessageFormatter.file(text),
  backup: (text: string) => MessageFormatter.backup(text),
  skip: (text: string) => MessageFormatter.skip(text),
  context: (text: string) => MessageFormatter.context(text),
  setVerbose: (enabled: boolean) => MessageFormatter.setVerbose(enabled),
};
