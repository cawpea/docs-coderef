/**
 * Function overload examples for CODE_REF demonstration
 */

/**
 * Parse value to number or string
 * Overload signature for number input
 */
export function parse(input: number): string;

/**
 * Overload signature for string input
 */
export function parse(input: string): number;

/**
 * Implementation signature (handles both cases)
 */
export function parse(input: number | string): number | string {
  if (typeof input === 'number') {
    return input.toString();
  } else {
    return parseInt(input, 10);
  }
}

/**
 * Format function with overloads
 * Overload for formatting dates
 */
export function format(value: Date): string;

/**
 * Overload for formatting numbers
 */
export function format(value: number, decimals: number): string;

/**
 * Implementation signature
 */
export function format(value: Date | number, decimals?: number): string {
  if (value instanceof Date) {
    return value.toISOString();
  } else {
    return value.toFixed(decimals ?? 2);
  }
}
