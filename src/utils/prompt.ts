/**
 * 対話的CLIプロンプトユーティリティ
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

import { extractLinesFromFile } from './code-comparison';
import { displayCodeDiff, displayLineRangeDiff } from './diff-display';
import type { FixAction } from './types';

/**
 * Readlineインターフェースを作成
 */
export function createPromptInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Yes/No質問
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
 * 質問して回答を取得
 */
export function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * 複数のオプションから選択
 * @returns 選択されたオプションのインデックス（0-based）
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
    const answer = await askQuestion(rl, `選択してください (1-${options.length}): `);

    const selection = parseInt(answer.trim(), 10);
    if (selection >= 1 && selection <= options.length) {
      return selection - 1;
    }

    console.log('❌ 無効な選択です。もう一度入力してください。');
  }
}

/**
 * 修正プレビューを表示
 */
export function displayFixPreview(action: FixAction): void {
  console.log('\n変更内容:');
  console.log(`- 説明: ${action.description}`);

  // エラータイプに応じて色付き差分を表示
  const { error } = action;
  const projectRoot = path.resolve(__dirname, '../../..');
  const absolutePath = path.resolve(projectRoot, error.ref.refPath);

  switch (error.type) {
    case 'CODE_LOCATION_MISMATCH': {
      // 行番号の差分を表示
      if (error.ref.codeBlock && action.newStartLine && action.newEndLine) {
        // コードブロックが存在する場合、実際のコードを取得
        const actualCode = extractLinesFromFile(
          absolutePath,
          action.newStartLine,
          action.newEndLine
        );

        const diff = displayLineRangeDiff(
          actualCode,
          {
            start: error.ref.startLine!,
            end: error.ref.endLine!,
          },
          {
            start: action.newStartLine,
            end: action.newEndLine,
          }
        );
        console.log(diff);
      } else {
        // コードブロックがない場合はシンプルなプレビュー
        console.log(action.preview);
      }
      break;
    }

    case 'CODE_CONTENT_MISMATCH': {
      // コード内容の差分を表示
      if (error.expectedCode && action.newCodeBlock) {
        const diff = displayCodeDiff(error.expectedCode, action.newCodeBlock);
        console.log(diff);
      } else {
        console.log(action.preview);
      }
      break;
    }

    case 'INSERT_CODE_BLOCK': {
      // 新規挿入の場合、挿入されるコードをシンプルに表示
      if (action.newCodeBlock) {
        console.log('\x1b[32m+ コードブロックを挿入:\x1b[0m');
        console.log('\x1b[2m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
        const lines = action.newCodeBlock.split('\n');
        lines.forEach((line) => {
          console.log(`\x1b[32m+ ${line}\x1b[0m`);
        });
        console.log('\x1b[2m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
      } else {
        console.log(action.preview);
      }
      break;
    }

    case 'REPLACE_CODE_BLOCK': {
      // コードブロックの置換の場合、CODE_CONTENT_MISMATCHと同じ処理
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
      // 行番号更新の場合、コメントの変更を表示
      const oldComment = error.ref.fullMatch;
      const newComment = `<!-- CODE_REF: ${error.ref.refPath}:${action.newStartLine}-${action.newEndLine} -->`;

      console.log('\x1b[2m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
      console.log(`\x1b[31m- ${oldComment}\x1b[0m`);
      console.log(`\x1b[32m+ ${newComment}\x1b[0m`);
      console.log('\x1b[2m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');

      // コードブロックも存在する場合は内容も表示
      if (action.newCodeBlock && fs.existsSync(absolutePath)) {
        console.log('\nコードブロック内容:');
        const lines = action.newCodeBlock.split('\n').slice(0, 10); // 最初の10行
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
      // その他の場合は従来のプレビューを表示
      if (action.preview) {
        console.log(action.preview);
      }
      break;
    }
  }
}
