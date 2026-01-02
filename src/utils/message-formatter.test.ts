/**
 * Tests for message formatting utilities
 */

import { MessageFormatter, msg, COLOR_SCHEMES } from './message-formatter';

describe('MessageFormatter', () => {
  describe('basic message formatting methods', () => {
    describe('error', () => {
      it('should format error message with emoji and color', () => {
        const result = MessageFormatter.error('Something went wrong');
        expect(result).toContain('❌');
        expect(result).toContain('Something went wrong');
      });

      it('should handle empty string', () => {
        const result = MessageFormatter.error('');
        expect(result).toContain('❌');
      });
    });

    describe('warning', () => {
      it('should format warning message with emoji and color', () => {
        const result = MessageFormatter.warning('Be careful');
        expect(result).toContain('⚠️');
        expect(result).toContain('Be careful');
      });
    });

    describe('info', () => {
      it('should format info message with emoji and color', () => {
        const result = MessageFormatter.info('Here is some information');
        expect(result).toContain('ℹ️');
        expect(result).toContain('Here is some information');
      });
    });

    describe('success', () => {
      it('should format success message with emoji and color', () => {
        const result = MessageFormatter.success('Operation completed');
        expect(result).toContain('✅');
        expect(result).toContain('Operation completed');
      });
    });

    describe('neutral', () => {
      it('should format neutral message without emoji', () => {
        const result = MessageFormatter.neutral('Plain text message');
        expect(result).toContain('Plain text message');
        // Should not contain any emoji
        expect(result).not.toContain('❌');
        expect(result).not.toContain('⚠️');
        expect(result).not.toContain('✅');
        expect(result).not.toContain('ℹ️');
      });
    });
  });

  describe('debug method with verbose mode', () => {
    beforeEach(() => {
      // Reset verbose mode before each test
      MessageFormatter.setVerbose(false);
    });

    it('should return empty string when verbose mode is disabled', () => {
      MessageFormatter.setVerbose(false);
      const result = MessageFormatter.debug('Debug message');
      expect(result).toBe('');
    });

    it('should return formatted message when verbose mode is enabled', () => {
      MessageFormatter.setVerbose(true);
      const result = MessageFormatter.debug('Debug message');
      expect(result).toContain('Debug message');
      expect(result).toBeTruthy();
    });

    it('should toggle verbose mode correctly', () => {
      MessageFormatter.setVerbose(false);
      expect(MessageFormatter.debug('test')).toBe('');

      MessageFormatter.setVerbose(true);
      expect(MessageFormatter.debug('test')).toBeTruthy();

      MessageFormatter.setVerbose(false);
      expect(MessageFormatter.debug('test')).toBe('');
    });
  });

  describe('errorDetail', () => {
    it('should format error detail with type and message', () => {
      const result = MessageFormatter.errorDetail(
        'CODE_CONTENT_MISMATCH',
        'The code content does not match'
      );
      expect(result).toContain('❌');
      expect(result).toContain('CODE_CONTENT_MISMATCH');
      expect(result).toContain('The code content does not match');
    });

    it('should include location when provided', () => {
      const result = MessageFormatter.errorDetail(
        'CODE_CONTENT_MISMATCH',
        'The code content does not match',
        'src/utils/test.ts:10-20'
      );
      expect(result).toContain('CODE_CONTENT_MISMATCH');
      expect(result).toContain('The code content does not match');
      expect(result).toContain('Reference: src/utils/test.ts:10-20');
    });

    it('should handle error detail without location', () => {
      const result = MessageFormatter.errorDetail('VALIDATION_ERROR', 'Invalid input');
      expect(result).toContain('VALIDATION_ERROR');
      expect(result).toContain('Invalid input');
      expect(result).not.toContain('Reference:');
    });
  });

  describe('summary', () => {
    it('should format summary with successful and failed counts', () => {
      const result = MessageFormatter.summary(5, 2, []);
      expect(result).toContain('Fix Results Summary');
      expect(result).toContain('📊');
      expect(result).toContain('Successful: 5');
      expect(result).toContain('Failed: 2');
      expect(result).toContain('✅');
      expect(result).toContain('❌');
    });

    it('should include backup paths when provided', () => {
      const backupPaths = ['/path/to/backup1.bak', '/path/to/backup2.bak', '/path/to/backup3.bak'];
      const result = MessageFormatter.summary(3, 0, backupPaths);
      expect(result).toContain('Backup files: 3');
      expect(result).toContain('💾');
      expect(result).toContain('/path/to/backup1.bak');
      expect(result).toContain('/path/to/backup2.bak');
      expect(result).toContain('/path/to/backup3.bak');
    });

    it('should not show backup section when no backups', () => {
      const result = MessageFormatter.summary(10, 0, []);
      expect(result).not.toContain('Backup files');
      expect(result).toContain('Successful: 10');
      expect(result).toContain('Failed: 0');
    });

    it('should include separator lines', () => {
      const result = MessageFormatter.summary(1, 1, []);
      expect(result).toContain('━');
    });
  });

  describe('specialized message methods', () => {
    describe('startFix', () => {
      it('should format start fix message with fix emoji', () => {
        const result = MessageFormatter.startFix('Starting auto-fix process');
        expect(result).toContain('🔧');
        expect(result).toContain('Starting auto-fix process');
      });
    });

    describe('startValidation', () => {
      it('should format start validation message with search emoji', () => {
        const result = MessageFormatter.startValidation('Starting validation');
        expect(result).toContain('🔍');
        expect(result).toContain('Starting validation');
      });
    });

    describe('file', () => {
      it('should format file reference with file emoji', () => {
        const result = MessageFormatter.file('src/utils/test.ts');
        expect(result).toContain('📄');
        expect(result).toContain('src/utils/test.ts');
      });
    });

    describe('backup', () => {
      it('should format backup notification with backup emoji', () => {
        const result = MessageFormatter.backup('Backup created');
        expect(result).toContain('💾');
        expect(result).toContain('Backup created');
      });
    });

    describe('skip', () => {
      it('should format skip notification with skip emoji', () => {
        const result = MessageFormatter.skip('Skipping file');
        expect(result).toContain('⏭️');
        expect(result).toContain('Skipping file');
      });
    });

    describe('context', () => {
      it('should format context line with indentation', () => {
        const result = MessageFormatter.context('Additional context');
        expect(result).toContain('Additional context');
        // Should start with 3 spaces
        expect(result.startsWith('   ')).toBe(true);
      });

      it('should apply dim styling to context', () => {
        const result = MessageFormatter.context('Context text');
        expect(result).toContain('Context text');
      });
    });
  });

  describe('msg convenience export', () => {
    beforeEach(() => {
      MessageFormatter.setVerbose(false);
    });

    it('should provide error method', () => {
      const result = msg.error('Error text');
      expect(result).toContain('❌');
      expect(result).toContain('Error text');
    });

    it('should provide warning method', () => {
      const result = msg.warning('Warning text');
      expect(result).toContain('⚠️');
      expect(result).toContain('Warning text');
    });

    it('should provide info method', () => {
      const result = msg.info('Info text');
      expect(result).toContain('ℹ️');
      expect(result).toContain('Info text');
    });

    it('should provide success method', () => {
      const result = msg.success('Success text');
      expect(result).toContain('✅');
      expect(result).toContain('Success text');
    });

    it('should provide debug method', () => {
      const result = msg.debug('Debug text');
      expect(result).toBe('');

      msg.setVerbose(true);
      const verboseResult = msg.debug('Debug text');
      expect(verboseResult).toContain('Debug text');
    });

    it('should provide neutral method', () => {
      const result = msg.neutral('Neutral text');
      expect(result).toContain('Neutral text');
    });

    it('should provide errorDetail method', () => {
      const result = msg.errorDetail('ERROR_TYPE', 'Error message', 'location.ts:10');
      expect(result).toContain('ERROR_TYPE');
      expect(result).toContain('Error message');
      expect(result).toContain('location.ts:10');
    });

    it('should provide summary method', () => {
      const result = msg.summary(3, 1, ['/backup.bak']);
      expect(result).toContain('Successful: 3');
      expect(result).toContain('Failed: 1');
      expect(result).toContain('/backup.bak');
    });

    it('should provide startFix method', () => {
      const result = msg.startFix('Fix started');
      expect(result).toContain('🔧');
      expect(result).toContain('Fix started');
    });

    it('should provide startValidation method', () => {
      const result = msg.startValidation('Validation started');
      expect(result).toContain('🔍');
      expect(result).toContain('Validation started');
    });

    it('should provide file method', () => {
      const result = msg.file('test.ts');
      expect(result).toContain('📄');
      expect(result).toContain('test.ts');
    });

    it('should provide backup method', () => {
      const result = msg.backup('Backup message');
      expect(result).toContain('💾');
      expect(result).toContain('Backup message');
    });

    it('should provide skip method', () => {
      const result = msg.skip('Skip message');
      expect(result).toContain('⏭️');
      expect(result).toContain('Skip message');
    });

    it('should provide context method', () => {
      const result = msg.context('Context message');
      expect(result).toContain('Context message');
      expect(result.startsWith('   ')).toBe(true);
    });

    it('should provide setVerbose method', () => {
      msg.setVerbose(true);
      expect(msg.debug('test')).toBeTruthy();

      msg.setVerbose(false);
      expect(msg.debug('test')).toBe('');
    });
  });

  describe('COLOR_SCHEMES', () => {
    it('should export color schemes', () => {
      expect(COLOR_SCHEMES).toBeDefined();
      expect(COLOR_SCHEMES.error).toBeDefined();
      expect(COLOR_SCHEMES.warning).toBeDefined();
      expect(COLOR_SCHEMES.info).toBeDefined();
      expect(COLOR_SCHEMES.success).toBeDefined();
      expect(COLOR_SCHEMES.debug).toBeDefined();
      expect(COLOR_SCHEMES.neutral).toBeDefined();
      expect(COLOR_SCHEMES.highlight).toBeDefined();
      expect(COLOR_SCHEMES.dim).toBeDefined();
      expect(COLOR_SCHEMES.code).toBeDefined();
    });

    it('should apply colors correctly', () => {
      const coloredText = COLOR_SCHEMES.error('test');
      expect(coloredText).toBeTruthy();
      expect(typeof coloredText).toBe('string');
    });
  });

  describe('special characters handling', () => {
    it('should handle special characters in error messages', () => {
      const result = MessageFormatter.error('Error: <html> & "quotes"');
      expect(result).toContain('Error: <html> & "quotes"');
    });

    it('should handle newlines in messages', () => {
      const result = MessageFormatter.info('Line 1\nLine 2\nLine 3');
      expect(result).toContain('Line 1\nLine 2\nLine 3');
    });

    it('should handle unicode characters', () => {
      const result = MessageFormatter.success('成功しました 🎉');
      expect(result).toContain('成功しました 🎉');
    });
  });

  describe('edge cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(1000);
      const result = MessageFormatter.error(longMessage);
      expect(result).toContain(longMessage);
    });

    it('should handle messages with only whitespace', () => {
      const result = MessageFormatter.info('   ');
      expect(result).toBeTruthy();
    });

    it('should handle zero counts in summary', () => {
      const result = MessageFormatter.summary(0, 0, []);
      expect(result).toContain('Successful: 0');
      expect(result).toContain('Failed: 0');
    });

    it('should handle large numbers in summary', () => {
      const result = MessageFormatter.summary(999999, 888888, []);
      expect(result).toContain('Successful: 999999');
      expect(result).toContain('Failed: 888888');
    });

    it('should handle many backup paths', () => {
      const manyBackups = Array.from({ length: 100 }, (_, i) => `/backup${i}.bak`);
      const result = MessageFormatter.summary(1, 0, manyBackups);
      expect(result).toContain('Backup files: 100');
      expect(result).toContain('/backup0.bak');
      expect(result).toContain('/backup99.bak');
    });
  });
});
