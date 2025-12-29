#!/usr/bin/env tsx

/**
 * validate:docs:codeで検出されたエラーを対話的に修正するスクリプト
 *
 * 使用方法:
 *   tsx scripts/coderef/fix.ts                # デフォルト: バックアップなし
 *   tsx scripts/coderef/fix.ts --dry-run
 *   tsx scripts/coderef/fix.ts --auto --backup  # バックアップを作成する場合
 *   npm run coderef:fix
 */

import * as fs from 'fs';
import * as path from 'path';

import { createBackup } from '../utils/backup';
import { applyFix, createFixAction, handleMultipleMatches, isFixableError } from '../utils/fix';
import { askYesNo, createPromptInterface, displayFixPreview } from '../utils/prompt';
import type { CodeRefError, FixOptions, FixResult } from '../utils/types';
import { extractCodeRefs, findMarkdownFiles, validateCodeRef } from '../core/validate';
import { loadFixConfig, getDocsPath, type CodeRefFixConfig } from '../config';

// コマンドライン引数のパース
function parseArgs(): FixOptions {
  const args = process.argv.slice(2);

  return {
    dryRun: args.includes('--dry-run'),
    auto: args.includes('--auto'),
    noBackup: !args.includes('--backup'), // デフォルトでバックアップなし（--backupで有効化）
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

/**
 * グループ化されたエラー
 */
interface ErrorGroup {
  docFile: string;
  errors: CodeRefError[];
}

/**
 * エラーを収集
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
 * メイン処理
 */
async function main(): Promise<void> {
  const options = parseArgs();

  // 設定を読み込み
  const config = loadFixConfig({
    dryRun: options.dryRun,
    auto: options.auto,
    backup: !options.noBackup,
    verbose: options.verbose,
  });

  console.log('🔧 CODE_REFエラーの修正を開始します...\n');

  if (options.dryRun) {
    console.log('⚠️  DRY RUNモード: 実際の変更は行いません\n');
  }

  // エラーを収集
  const errorGroups = collectErrors(config);

  if (errorGroups.length === 0) {
    console.log('✅ 修正可能なエラーは見つかりませんでした');
    process.exit(0);
  }

  // 統計情報
  const totalErrors = errorGroups.reduce((sum, g) => sum + g.errors.length, 0);
  console.log(`📊 ${errorGroups.length}個のファイルで${totalErrors}個の修正可能なエラーを検出\n`);

  // 対話インターフェース
  const rl = createPromptInterface();
  const fixResults: FixResult[] = [];
  const backupFiles = new Set<string>();

  try {
    for (const group of errorGroups) {
      console.log(`\n📄 ${path.relative(config.projectRoot, group.docFile)}`);
      console.log(`   ${group.errors.length}個のエラー\n`);

      // エラーをdocLineNumber降順（下から上へ）にソート
      // 下部の修正が上部の行番号に影響を与えないようにするため
      const sortedErrors = group.errors.sort((a, b) => {
        const lineA = a.ref.docLineNumber ?? Infinity;
        const lineB = b.ref.docLineNumber ?? Infinity;
        return lineB - lineA; // 降順
      });

      let _lineOffset = 0; // 累積オフセットを追跡（将来のエッジケース対応用）

      for (const error of sortedErrors) {
        console.log(`\n❌ ${error.type}: ${error.message}`);
        console.log(
          `   参照: ${path.relative(config.projectRoot, error.ref.docFile)}${error.ref.docLineNumber ? `:${error.ref.docLineNumber}` : ''}`
        );

        // 修正アクションを作成
        let action;

        if (error.type === 'CODE_LOCATION_MISMATCH') {
          // 複数マッチの処理
          action = await handleMultipleMatches(error, rl);
        } else {
          const fixActionResult = await createFixAction(error, rl);

          // 複数のオプションがある場合、ユーザーに選択させる
          if (Array.isArray(fixActionResult)) {
            console.log('\n🛠️ 修正方法を選択してください：\n');

            fixActionResult.forEach((opt, index) => {
              console.log(`  ${index + 1}. ${opt.description}`);
              const previewLines = opt.preview.split('\n');
              previewLines.forEach((line) => {
                console.log(`     ${line}`);
              });
              console.log('');
            });

            if (options.auto) {
              // autoモードの場合は最初のオプションを自動選択
              console.log('   ℹ️  autoモードのため、オプション1を自動選択します\n');
              action = fixActionResult[0];
            } else {
              // ユーザーに選択させる
              const selection = await new Promise<number>((resolve) => {
                rl.question(
                  `修正方法を選択してください (1-${fixActionResult.length}): `,
                  (answer) => {
                    const num = parseInt(answer, 10);
                    if (num >= 1 && num <= fixActionResult.length) {
                      resolve(num - 1);
                    } else {
                      console.log('   ⚠️  無効な選択です。スキップします。');
                      resolve(-1);
                    }
                  }
                );
              });

              if (selection === -1) {
                console.log('   ⏭️  スキップしました');
                continue;
              }

              action = fixActionResult[selection];
            }
          } else {
            action = fixActionResult;
          }
        }

        if (!action) {
          console.log('   ⚠️  このエラーは修正できません');
          continue;
        }

        // プレビュー表示（単一オプションの場合のみ）
        if (!Array.isArray(action)) {
          displayFixPreview(action);
        }

        // 確認
        let shouldFix = options.auto;
        if (!options.auto) {
          shouldFix = await askYesNo(rl, '\nこの修正を適用しますか？', false);
        }

        if (!shouldFix) {
          console.log('   ⏭️  スキップしました');
          continue;
        }

        // Dry runチェック
        if (options.dryRun) {
          console.log('   ✅ [DRY RUN] 修正をシミュレートしました');
          fixResults.push({ success: true, action });
          continue;
        }

        // バックアップ作成（ファイルごとに1回のみ）
        let backupPath: string | undefined;
        if (!options.noBackup && !backupFiles.has(group.docFile)) {
          backupPath = createBackup(group.docFile);
          backupFiles.add(group.docFile);
          console.log(`   💾 バックアップ作成: ${path.basename(backupPath)}`);
        }

        // 修正を適用
        try {
          const lineDelta = applyFix(action);
          _lineOffset += lineDelta; // オフセットを累積

          // デバッグ用のログ
          if (lineDelta !== 0) {
            console.log(`   📊 Line delta: ${lineDelta > 0 ? '+' : ''}${lineDelta}`);
          }

          console.log('   ✅ 修正を適用しました');
          fixResults.push({ success: true, action, backupPath });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.log(`   ❌ 修正に失敗しました: ${errorMsg}`);
          fixResults.push({ success: false, action, error: errorMsg, backupPath });
        }
      }
    }
  } finally {
    rl.close();
  }

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 修正結果サマリー\n');

  const successful = fixResults.filter((r) => r.success).length;
  const failed = fixResults.filter((r) => !r.success).length;

  console.log(`✅ 成功: ${successful}個`);
  console.log(`❌ 失敗: ${failed}個`);

  if (backupFiles.size > 0 && !options.noBackup) {
    console.log(`\n💾 バックアップファイル: ${backupFiles.size}個`);
    for (const file of backupFiles) {
      const backupPath = `${file}.backup`;
      console.log(`   ${path.relative(config.projectRoot, backupPath)}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

// スクリプトとして実行された場合
if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  });
}
