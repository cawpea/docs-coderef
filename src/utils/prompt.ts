/**
 * Interactive CLI prompt utility
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

import { displayCodeDiff } from '@/utils/diff-display';
import type { FixAction } from '@/utils/types';
import { msg, COLOR_SCHEMES } from '@/utils/message-formatter';

/**
 * Create readline interface
 */
export function createPromptInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Yes/No question
 */
export async function askYesNo(
  rl: readline.Interface,
  question: string,
  defaultValue = false
): Promise<boolean> {
  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  const answer = await askQuestion(rl, `${question} (${defaultText}): `);

  if (!answer.trim()) {
    return defaultValue;
  }

  return answer.toLowerCase().startsWith('y');
}

/**
 * Ask question and get answer
 */
export function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Select from multiple options
 * @returns Index of selected option (0-based)
 */
export async function askSelectOption(
  rl: readline.Interface,
  options: string[],
  message: string
): Promise<number> {
  console.log(`\n${message}`);
  options.forEach((opt, idx) => {
    console.log(`  ${idx + 1}) ${opt}`);
  });

  while (true) {
    const answer = await askQuestion(rl, `Select (1-${options.length}): `);

    const selection = parseInt(answer.trim(), 10);
    if (selection >= 1 && selection <= options.length) {
      return selection - 1;
    }

    console.log(msg.error('Invalid selection. Please try again.'));
  }
}

/**
 * Display markdown code block with syntax highlighting
 */
function displayColoredCodeBlock(preview: string): void {
  // Extract code block from markdown (```language\ncode\n```)
  const codeBlockMatch = /```(\w*)\n([\s\S]*?)\n```/.exec(preview);

  if (codeBlockMatch) {
    const language = codeBlockMatch[1] || '';
    const code = codeBlockMatch[2];

    // Display with color
    console.log(COLOR_SCHEMES.dim(`\`\`\`${language}`));
    const lines = code.split('\n');
    lines.forEach((line) => {
      console.log(COLOR_SCHEMES.success(`+ ${line}`));
    });
    console.log(COLOR_SCHEMES.dim('```'));
  } else {
    // No code block found, display as-is
    console.log(preview);
  }
}

/**
 * Display fix preview
 */
export function displayFixPreview(action: FixAction, projectRoot: string): void {
  console.log(`\nChanges: ${action.description}`);

  // Display colored diff based on action type
  const { error } = action;
  const absolutePath = path.resolve(projectRoot, error.ref.refPath);

  switch (action.type) {
    case 'INSERT_CODE_BLOCK': {
      // For new insertion, simply display the code to be inserted
      if (action.newCodeBlock) {
        console.log(COLOR_SCHEMES.success('+ Insert code block:'));
        console.log(COLOR_SCHEMES.dim('━'.repeat(64)));
        const lines = action.newCodeBlock.split('\n');
        lines.forEach((line) => {
          console.log(COLOR_SCHEMES.success(`+ ${line}`));
        });
        console.log(COLOR_SCHEMES.dim('━'.repeat(64)));
      } else {
        displayColoredCodeBlock(action.preview);
      }
      break;
    }

    case 'REPLACE_CODE_BLOCK': {
      // For code block replacement, show diff between expected and new code
      if (error.expectedCode && action.newCodeBlock) {
        const diff = displayCodeDiff(error.expectedCode, action.newCodeBlock);
        console.log(diff);
      } else {
        console.log(action.preview);
      }
      break;
    }

    case 'UPDATE_LINE_NUMBERS':
    case 'UPDATE_END_LINE': {
      // For CODE_LOCATION_MISMATCH without code block, show simple preview
      if (error.type === 'CODE_LOCATION_MISMATCH' && !error.ref.codeBlock) {
        console.log(action.preview);
        break;
      }

      // For line number update, display comment change
      const oldComment = error.ref.fullMatch;
      const newComment = `<!-- CODE_REF: ${error.ref.refPath}:${action.newStartLine}-${action.newEndLine} -->`;

      console.log(COLOR_SCHEMES.dim('━'.repeat(64)));
      console.log(COLOR_SCHEMES.error(`- ${oldComment}`));
      console.log(COLOR_SCHEMES.success(`+ ${newComment}`));
      console.log(COLOR_SCHEMES.dim('━'.repeat(64)));

      // Note for CODE_CONTENT_MISMATCH: code block will remain unchanged
      if (error.type === 'CODE_CONTENT_MISMATCH') {
        console.log(
          COLOR_SCHEMES.warning(
            '\n⚠️  Note: Code block will remain unchanged. Please manually adjust if needed.'
          )
        );
      } else if (action.newCodeBlock && fs.existsSync(absolutePath)) {
        // For other cases, just display the code block content
        console.log('\nCode block content:');
        const lines = action.newCodeBlock.split('\n').slice(0, 10); // First 10 lines
        lines.forEach((line) => {
          console.log(`  ${line}`);
        });
        if (action.newCodeBlock.split('\n').length > 10) {
          console.log('  ...');
        }
      }
      break;
    }

    default: {
      // For other cases, display default preview
      if (action.preview) {
        displayColoredCodeBlock(action.preview);
      }
      break;
    }
  }
}
