/**
 * Multiple symbols with same name examples for CODE_REF demonstration
 * This file demonstrates scenarios where line hints may be needed
 */

/**
 * First class with a process method
 */
export class DataProcessor {
  /**
   * Process data
   * @param data - Data to process
   * @returns Processed result
   */
  process(data: string): string {
    return data.toUpperCase();
  }

  /**
   * Validate data
   */
  validate(data: string): boolean {
    return data.length > 0;
  }
}

/**
 * Second class with a process method (same name, different implementation)
 */
export class ImageProcessor {
  /**
   * Process image
   * @param data - Image data to process
   * @returns Processed image data
   */
  process(data: string): string {
    return data.toLowerCase();
  }

  /**
   * Validate image data
   */
  validate(data: string): boolean {
    return data.startsWith('data:image');
  }
}

/**
 * Utility function for processing
 */
export function processUtility(input: string): string {
  return input.trim();
}
