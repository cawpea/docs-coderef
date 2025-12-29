/**
 * スクリプト共通の型定義
 */

/**
 * コード参照情報
 */
export interface CodeRef {
  fullMatch: string;
  refPath: string;
  startLine: number | null;
  endLine: number | null;
  docFile: string;
  docLineNumber?: number; // ドキュメント内のCODE_REFコメントの行番号
  codeBlock?: string; // ドキュメント内のコードブロック内容
  codeBlockStartOffset?: number; // コードブロックの開始位置
  // シンボル指定機能の追加フィールド
  symbolPath?: string; // "functionName" or "ClassName#methodName"
  className?: string; // "ClassName" (if specified)
  memberName?: string; // "methodName" or "functionName"
}

/**
 * コード参照エラー
 */
export interface CodeRefError {
  type:
    | 'FILE_NOT_FOUND'
    | 'LINE_OUT_OF_RANGE'
    | 'INVALID_LINE_NUMBER'
    | 'INVALID_RANGE'
    | 'READ_ERROR'
    | 'PATH_TRAVERSAL'
    | 'CODE_CONTENT_MISMATCH' // 指定行のコードが異なる
    | 'CODE_LOCATION_MISMATCH' // コードは一致するが行数が異なる
    | 'CODE_BLOCK_MISSING' // CODE_REFの後にコードブロックがない
    | 'INSERT_CODE_BLOCK' // CODE_REFの後にコードブロックを挿入する必要がある
    | 'REPLACE_CODE_BLOCK' // CODE_REFの後のコードブロックを置換する必要がある
    | 'UPDATE_LINE_NUMBERS' // CODE_REFの行番号を更新する必要がある
    | 'UPDATE_END_LINE' // CODE_REFの終了行番号を更新する必要がある
    | 'SYMBOL_NOT_FOUND' // 指定されたシンボルが見つからない
    | 'MULTIPLE_SYMBOLS_FOUND' // 同名のシンボルが複数存在
    | 'SYMBOL_RANGE_MISMATCH' // シンボルの範囲と指定行番号が一致しない
    | 'NOT_TYPESCRIPT_FILE'; // TypeScript/JavaScriptファイル以外
  message: string;
  ref: CodeRef;
  suggestedLines?: { start: number; end: number }; // CODE_LOCATION_MISMATCH用
  actualCode?: string; // CODE_CONTENT_MISMATCH用
  expectedCode?: string; // CODE_CONTENT_MISMATCH用
  // シンボル指定機能の追加フィールド
  foundSymbols?: SymbolMatch[]; // MULTIPLE_SYMBOLS_FOUND用
  suggestedSymbol?: SymbolMatch; // SYMBOL_RANGE_MISMATCH用
}

/**
 * Git実行オプション
 */
export interface GitExecOptions {
  cwd?: string;
  encoding?: BufferEncoding;
}

/**
 * パターンマッチング結果
 */
export interface PatternMatchResult {
  matched: boolean;
  pattern?: string;
}

/**
 * 修正操作タイプ
 */
export type FixType =
  | 'UPDATE_LINE_NUMBERS' // CODE_LOCATION_MISMATCH
  | 'INSERT_CODE_BLOCK' // CODE_BLOCK_MISSING
  | 'REPLACE_CODE_BLOCK' // CODE_CONTENT_MISMATCH
  | 'UPDATE_END_LINE' // LINE_OUT_OF_RANGE
  | 'UPDATE_SYMBOL_RANGE' // SYMBOL_RANGE_MISMATCH
  | 'MOVE_CODE_REF_COMMENT'; // CODE_BLOCK_MISSING (with existing block)

/**
 * 修正アクション詳細
 */
export interface FixAction {
  type: FixType;
  error: CodeRefError;
  description: string;
  preview: string;
  newStartLine?: number;
  newEndLine?: number;
  newCodeBlock?: string;
  matchOptions?: Array<{ start: number; end: number }>;
  codeBlockPosition?: {
    start: number;
    end: number;
    language: string;
    content: string;
  };
}

/**
 * 修正結果
 */
export interface FixResult {
  success: boolean;
  action: FixAction;
  error?: string;
  backupPath?: string;
}

/**
 * CLIオプション
 */
export interface FixOptions {
  dryRun: boolean;
  auto: boolean;
  noBackup: boolean;
  verbose: boolean;
}

/**
 * スコープ拡張されたマッチ情報
 */
export interface ExpandedMatch {
  start: number;
  end: number;
  confidence: 'high' | 'medium' | 'low';
  expansionType?: 'ast' | 'heuristic' | 'none';
  scopeType?: 'function' | 'class' | 'interface' | 'type' | 'const' | 'unknown';
}

/**
 * シンボル検索のマッチ情報
 */
export interface SymbolMatch {
  className?: string; // クラス名（クラスメソッドの場合）
  memberName: string; // メソッド名または関数名
  startLine: number; // 開始行番号（JSDocコメント含む）
  endLine: number; // 終了行番号
  scopeType: 'function' | 'class' | 'method'; // スコープタイプ
  confidence: 'high' | 'medium' | 'low'; // 信頼度
}
