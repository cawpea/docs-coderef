#!/usr/bin/env tsx

/**
 * ドキュメント内のコード参照（CODE_REF）の整合性をチェックするスクリプト
 *
 * 使用方法:
 *   tsx scripts/coderef/validate.ts                    # 全ファイルを検証
 *   tsx scripts/coderef/validate.ts --verbose          # 詳細表示
 *   tsx scripts/coderef/validate.ts docs/README.md     # 特定ファイルのみ検証
 *   tsx scripts/coderef/validate.ts docs/backend/      # 特定ディレクトリのみ検証
 *   tsx scripts/coderef/validate.ts CLAUDE.md          # CLAUDEファイルも可能
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  findSymbolInAST,
  isTypeScriptOrJavaScript,
  parseSymbolPath,
  selectBestSymbolMatch,
} from '../utils/ast-symbol-search';
import {
  compareCodeContent,
  extractLinesFromFile,
  searchCodeInFile,
} from '../utils/code-comparison';
import { displayCodeDiff, displayLineRangeDiff } from '../utils/diff-display';
import { isIgnored, loadDocsignorePatterns } from '../utils/ignore-pattern';
import { associateCodeBlocksWithRefs } from '../utils/markdown';
import type { CodeRef, CodeRefError } from '../utils/types';

// 設定
const DOCS_DIR = path.join(__dirname, '../..', 'docs');
const PROJECT_ROOT = path.join(__dirname, '../..');
const DOCSIGNORE_FILE = path.join(PROJECT_ROOT, '.docsignore');
const CODE_REF_PATTERN = /<!--\s*CODE_REF:\s*([^:#]+?)(?:#([^:]+?))?(?::(\d+)-(\d+))?\s*-->/g;

// コマンドライン引数のパース
interface CliOptions {
  verbose: boolean;
  files: string[];
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const files = args.filter((arg) => !arg.startsWith('-'));

  return { verbose, files };
}

const { verbose, files: targetFiles } = parseCliArgs();

/**
 * ディレクトリを再帰的に走査してマークダウンファイルを取得
 */
export function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentPath: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * コードブロックとインラインコードの範囲を検出
 */
function getCodeBlockRanges(content: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];

  // トリプルバッククォートのコードブロック
  const codeBlockPattern = /```[\s\S]*?```/g;
  let match: RegExpExecArray | null;

  while ((match = codeBlockPattern.exec(content)) !== null) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // インラインコード（バッククォート）
  const inlineCodePattern = /`[^`\n]+?`/g;
  while ((match = inlineCodePattern.exec(content)) !== null) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return ranges;
}

/**
 * 位置がコードブロックまたはインラインコード内かチェック
 */
function isInsideCodeBlock(
  position: number,
  ranges: Array<{ start: number; end: number }>
): boolean {
  return ranges.some((range) => position >= range.start && position < range.end);
}

/**
 * CODE_REFコメントを抽出
 */
export function extractCodeRefs(content: string, filePath: string): CodeRef[] {
  const refs: CodeRef[] = [];
  let match: RegExpExecArray | null;

  // コードブロックとインラインコードの範囲を事前に検出
  const codeBlockRanges = getCodeBlockRanges(content);

  while ((match = CODE_REF_PATTERN.exec(content)) !== null) {
    const [fullMatch, refPath, symbolPath, startLine, endLine] = match;

    // コードブロックまたはインラインコード内のCODE_REFは除外（サンプル表示用）
    if (isInsideCodeBlock(match.index, codeBlockRanges)) {
      continue;
    }

    // マッチ位置から行番号を計算（1-indexed）
    const beforeMatch = content.substring(0, match.index);
    const docLineNumber = beforeMatch.split('\n').length;

    // シンボルパスをパース
    let className: string | undefined;
    let memberName: string | undefined;
    if (symbolPath) {
      const parsed = parseSymbolPath(symbolPath);
      className = parsed.className;
      memberName = parsed.memberName;
    }

    refs.push({
      fullMatch,
      refPath: refPath.trim(),
      startLine: startLine ? parseInt(startLine, 10) : null,
      endLine: endLine ? parseInt(endLine, 10) : null,
      docFile: filePath,
      docLineNumber,
      codeBlockStartOffset: match.index, // CODE_REFコメントの位置を保存
      symbolPath: symbolPath?.trim(),
      className,
      memberName,
    });
  }

  // コードブロックを関連付け
  return associateCodeBlocksWithRefs(content, refs);
}

/**
 * コード内容の検証
 */
export function validateCodeContent(ref: CodeRef): CodeRefError[] {
  const errors: CodeRefError[] = [];

  // 行数指定がない場合の処理
  if (ref.startLine === null || ref.endLine === null) {
    // シンボル指定がある場合は、シンボル全体との完全一致検証
    if (ref.symbolPath) {
      // コードブロックがない場合はエラーを返す
      if (!ref.codeBlock || ref.codeBlock.trim() === '') {
        errors.push({
          type: 'CODE_BLOCK_MISSING',
          message: `シンボル指定のCODE_REF（${ref.refPath}#${ref.symbolPath}）の後にコードブロックが見つかりません。`,
          ref,
        });
        return errors;
      }

      // シンボルの範囲を取得
      const absolutePath = path.resolve(PROJECT_ROOT, ref.refPath);
      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      const matches = findSymbolInAST(fileContent, absolutePath, {
        className: ref.className,
        memberName: ref.memberName!,
      });

      if (matches.length > 0) {
        const symbolMatch = matches[0];
        const symbolCode = extractLinesFromFile(
          absolutePath,
          symbolMatch.startLine,
          symbolMatch.endLine
        );

        // コードブロックとシンボル全体を比較（空白改行は無視）
        if (!compareCodeContent(symbolCode, ref.codeBlock)) {
          errors.push({
            type: 'CODE_CONTENT_MISMATCH',
            message: `シンボル全体とコードブロックが一致しません。`,
            ref,
            actualCode: symbolCode.substring(0, 200),
            expectedCode: ref.codeBlock.substring(0, 200),
          });
        }
      }
      return errors;
    }
    // シンボル指定がない場合はスキップ（ファイル全体参照）
    return errors;
  }

  // シンボル指定がある場合でも、行番号指定があれば通常の検証を続行

  // コードブロックがない場合
  if (!ref.codeBlock || ref.codeBlock.trim() === '') {
    const refLocation =
      ref.startLine !== null ? `${ref.refPath}:${ref.startLine}-${ref.endLine}` : ref.refPath;
    errors.push({
      type: 'CODE_BLOCK_MISSING',
      message: `CODE_REF（${refLocation}）の後にコードブロックが見つかりません。`,
      ref,
    });
    return errors;
  }

  const absolutePath = path.resolve(PROJECT_ROOT, ref.refPath);

  try {
    // 実ファイルから指定行のコードを取得
    const actualCode = extractLinesFromFile(absolutePath, ref.startLine, ref.endLine);

    // コード内容を比較
    if (!compareCodeContent(actualCode, ref.codeBlock)) {
      // 一致しない → ファイル全体から検索
      const matches = searchCodeInFile(absolutePath, ref.codeBlock);

      if (matches.length > 0) {
        // コードは存在するが別の場所にある
        const firstMatch = matches[0];
        const matchInfo =
          matches.length > 1 ? `コードは${matches.length}箇所で見つかりました。最初の出現: ` : '';

        errors.push({
          type: 'CODE_LOCATION_MISMATCH',
          message: `${ref.refPath}の行数が一致しません。${matchInfo}(expect: ${ref.startLine}-${ref.endLine}, result: ${firstMatch.start}-${firstMatch.end})`,
          ref,
          suggestedLines: firstMatch,
        });
      } else {
        // コード内容が異なる
        errors.push({
          type: 'CODE_CONTENT_MISMATCH',
          message: `${ref.refPath} のコードが一致しません。`,
          ref,
          actualCode: actualCode.substring(0, 200),
          expectedCode: ref.codeBlock.substring(0, 200),
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push({
      type: 'READ_ERROR',
      message: `コード比較中にエラーが発生しました: ${errorMessage}`,
      ref,
    });
  }

  return errors;
}

/**
 * シンボル指定の検証
 */
export function validateSymbolRef(ref: CodeRef): CodeRefError[] {
  const errors: CodeRefError[] = [];

  // シンボル指定がない場合はスキップ
  if (!ref.symbolPath) {
    return errors;
  }

  const absolutePath = path.resolve(PROJECT_ROOT, ref.refPath);

  // TypeScript/JavaScriptファイルチェック
  if (!isTypeScriptOrJavaScript(absolutePath)) {
    errors.push({
      type: 'NOT_TYPESCRIPT_FILE',
      message: `シンボル指定はTypeScript/JavaScriptファイルのみサポート: ${ref.refPath}`,
      ref,
    });
    return errors;
  }

  const fileContent = fs.readFileSync(absolutePath, 'utf-8');

  try {
    // シンボルを検索
    const matches = findSymbolInAST(fileContent, absolutePath, {
      className: ref.className,
      memberName: ref.memberName!,
    });

    if (matches.length === 0) {
      // シンボルが見つからない
      errors.push({
        type: 'SYMBOL_NOT_FOUND',
        message: `シンボル "${ref.symbolPath}" が見つかりません`,
        ref,
      });
    } else if (matches.length > 1 && !ref.startLine) {
      // 複数マッチ（行番号ヒントなし）
      errors.push({
        type: 'MULTIPLE_SYMBOLS_FOUND',
        message: `シンボル "${ref.symbolPath}" が${matches.length}箇所で見つかりました。行番号を指定してください`,
        ref,
        foundSymbols: matches,
      });
    } else {
      // 行番号が指定されている場合は検証
      if (ref.startLine && ref.endLine) {
        const bestMatch = selectBestSymbolMatch(matches, {
          start: ref.startLine,
          end: ref.endLine,
        });

        if (bestMatch) {
          // 範囲が一致するかチェック
          if (bestMatch.startLine !== ref.startLine || bestMatch.endLine !== ref.endLine) {
            errors.push({
              type: 'SYMBOL_RANGE_MISMATCH',
              message: `シンボル "${ref.symbolPath}" の範囲が一致しません (期待: ${ref.startLine}-${ref.endLine}, 実際: ${bestMatch.startLine}-${bestMatch.endLine})`,
              ref,
              suggestedSymbol: bestMatch,
            });
          }
        }
      }
    }
  } catch (error) {
    errors.push({
      type: 'READ_ERROR',
      message: `AST解析エラー: ${error instanceof Error ? error.message : String(error)}`,
      ref,
    });
  }

  return errors;
}

/**
 * 参照先のファイルと行番号の存在を確認
 */
export function validateCodeRef(ref: CodeRef): CodeRefError[] {
  const errors: CodeRefError[] = [];

  // 相対パスを絶対パスに変換(プロジェクトルートからの相対パス)
  const absolutePath = path.resolve(PROJECT_ROOT, ref.refPath);

  // パストラバーサル攻撃を防ぐ: プロジェクトルート内に留まるか検証
  if (!absolutePath.startsWith(PROJECT_ROOT + path.sep)) {
    errors.push({
      type: 'PATH_TRAVERSAL',
      message: `参照先のパスがプロジェクトルート外を指しています: ${ref.refPath}`,
      ref,
    });
    return errors;
  }

  // ファイルの存在確認
  if (!fs.existsSync(absolutePath)) {
    errors.push({
      type: 'FILE_NOT_FOUND',
      message: `参照先のファイルが見つかりません: ${ref.refPath}`,
      ref,
    });
    return errors;
  }

  // 行番号が指定されている場合、行数をチェック
  if (ref.startLine !== null && ref.endLine !== null) {
    try {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const lines = content.split('\n');
      const totalLines = lines.length;

      if (ref.startLine < 1) {
        errors.push({
          type: 'INVALID_LINE_NUMBER',
          message: `開始行番号が無効です（1未満）: ${ref.startLine}`,
          ref,
        });
      }

      if (ref.endLine > totalLines) {
        errors.push({
          type: 'LINE_OUT_OF_RANGE',
          message: `終了行番号がファイルの行数を超えています: ${ref.endLine} > ${totalLines}`,
          ref,
        });
      }

      if (ref.startLine > ref.endLine) {
        errors.push({
          type: 'INVALID_RANGE',
          message: `開始行番号が終了行番号より大きいです: ${ref.startLine} > ${ref.endLine}`,
          ref,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        type: 'READ_ERROR',
        message: `ファイルの読み込みに失敗しました: ${errorMessage}`,
        ref,
      });
    }
  }

  // シンボル指定がある場合はシンボルバリデーション
  if (errors.length === 0 && ref.symbolPath) {
    const symbolErrors = validateSymbolRef(ref);
    errors.push(...symbolErrors);
  }

  // コード内容の検証（既存のエラーがない場合のみ）
  if (errors.length === 0) {
    const contentErrors = validateCodeContent(ref);
    errors.push(...contentErrors);
  }

  return errors;
}

/**
 * 指定されたパスがディレクトリかどうかを判定
 */
function isDirectory(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * 対象ファイルを解決する
 * - ファイル指定がない場合: 全ファイル
 * - ファイル指定がある場合: 指定されたファイル/ディレクトリのみ
 */
function resolveTargetFiles(targets: string[]): string[] {
  if (targets.length === 0) {
    // ファイル指定がない場合は全ファイルを対象
    return findMarkdownFiles(DOCS_DIR);
  }

  const resolvedFiles = new Set<string>();

  for (const target of targets) {
    // 相対パスを絶対パスに変換
    const absolutePath = path.isAbsolute(target) ? target : path.join(PROJECT_ROOT, target);

    if (isDirectory(absolutePath)) {
      // ディレクトリの場合は再帰的にマークダウンファイルを検索
      const files = findMarkdownFiles(absolutePath);
      files.forEach((file) => resolvedFiles.add(file));
    } else if (fs.existsSync(absolutePath)) {
      // ファイルの場合はそのまま追加
      if (absolutePath.endsWith('.md')) {
        resolvedFiles.add(absolutePath);
      }
    } else {
      console.warn(`⚠️  ファイルが見つかりません: ${target}`);
    }
  }

  return Array.from(resolvedFiles);
}

export async function main(): Promise<void> {
  console.log('🔍 ドキュメント内のコード参照を検証しています...\n');

  // 対象ファイルを解決
  const allMarkdownFiles = resolveTargetFiles(targetFiles);

  if (targetFiles.length > 0 && verbose) {
    console.log(`📋 指定されたファイル/ディレクトリ: ${targetFiles.join(', ')}\n`);
  }

  // .docsignoreパターンを読み込み
  const ignorePatterns = loadDocsignorePatterns(DOCSIGNORE_FILE);
  if (verbose) {
    console.log(`📋 .docsignoreから${ignorePatterns.length}個のパターンを読み込みました\n`);
  }

  // .docsignoreで除外されていないファイルのみを対象とする
  const markdownFiles = allMarkdownFiles.filter((file) => {
    const relativePath = path.relative(PROJECT_ROOT, file);
    return !isIgnored(relativePath, ignorePatterns);
  });

  if (verbose && allMarkdownFiles.length > markdownFiles.length) {
    console.log(
      `📋 ${allMarkdownFiles.length - markdownFiles.length}個のファイルが.docsignoreにより除外されました\n`
    );
  }

  console.log(`📄 ${markdownFiles.length} 個のマークダウンファイルを検出\n`);

  // 全てのCODE_REFを抽出
  let totalRefs = 0;
  const allRefs: CodeRef[] = [];

  for (const file of markdownFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const refs = extractCodeRefs(content, file);

    if (refs.length > 0) {
      totalRefs += refs.length;
      allRefs.push(...refs);

      if (verbose) {
        console.log(`  ${path.relative(DOCS_DIR, file)}: ${refs.length} 個の参照`);
      }
    }
  }

  console.log(`\n📌 ${totalRefs} 個のコード参照を検出\n`);

  if (totalRefs === 0) {
    console.log('✅ コード参照が見つかりませんでした（検証不要）');
    process.exit(0);
  }

  // 各参照を検証
  const allErrors = await Promise.all(allRefs.map((ref) => validateCodeRef(ref))).then((results) =>
    results.flat()
  );

  // 結果の表示
  if (allErrors.length === 0) {
    console.log('✅ 全てのコード参照が有効です！');
    process.exit(0);
  } else {
    console.log(`❌ ${allErrors.length} 個のエラーが見つかりました:\n`);

    // エラーをグループ化して表示
    const errorsByDoc: Record<string, CodeRefError[]> = {};

    for (const error of allErrors) {
      const docFile = path.relative(PROJECT_ROOT, error.ref.docFile);

      if (!errorsByDoc[docFile]) {
        errorsByDoc[docFile] = [];
      }

      errorsByDoc[docFile].push(error);
    }

    // エラー詳細の表示
    for (const [docFile, errors] of Object.entries(errorsByDoc)) {
      console.log(`📄 ${docFile}:`);

      for (const error of errors) {
        console.log(`  ❌ ${error.type}: ${error.message}`);

        // ドキュメント内の行番号を表示
        const filePath = path.relative(PROJECT_ROOT, error.ref.docFile);
        const lineInfo = error.ref.docLineNumber ? `:${error.ref.docLineNumber}` : '';
        console.log(`     ${filePath}${lineInfo}: ${error.ref.fullMatch}`);

        // CODE_LOCATION_MISMATCHの場合、行範囲の差分を表示
        if (error.type === 'CODE_LOCATION_MISMATCH' && error.suggestedLines && verbose) {
          // verboseモードでは詳細な差分を表示
          const filePath = path.join(PROJECT_ROOT, error.ref.refPath);
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

        // CODE_CONTENT_MISMATCHの場合、差分を表示
        if (
          error.type === 'CODE_CONTENT_MISMATCH' &&
          verbose &&
          error.expectedCode &&
          error.actualCode
        ) {
          // verboseモードでは詳細な差分を表示
          const diff = displayCodeDiff(error.expectedCode, error.actualCode);
          console.log(diff);
        }

        console.log('');
      }
    }

    console.log(`\n💡 ヒント:`);
    console.log(`  - ファイルパスがプロジェクトルートからの相対パスになっているか確認してください`);
    console.log(`  - 行番号が最新のコードと一致しているか確認してください`);
    console.log(`  - 詳細情報を表示するには --verbose オプションを使用してください`);

    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみmainを実行
if (require.main === module) {
  main();
}
