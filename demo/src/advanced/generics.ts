/**
 * Generic function and class examples for CODE_REF demonstration
 */

/**
 * Generic function that returns the first element of an array
 * @param items - Array of items
 * @returns The first element or undefined
 */
export function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}

/**
 * Generic function with multiple type parameters
 * @param key - The key
 * @param value - The value
 * @returns An object with the key-value pair
 */
export function createPair<K, V>(key: K, value: V): { key: K; value: V } {
  return { key, value };
}

/**
 * Generic class representing a stack data structure
 */
export class Stack<T> {
  private items: T[] = [];

  /**
   * Pushes an item onto the stack
   * @param item - The item to push
   */
  push(item: T): void {
    this.items.push(item);
  }

  /**
   * Pops an item from the stack
   * @returns The popped item or undefined
   */
  pop(): T | undefined {
    return this.items.pop();
  }

  /**
   * Peeks at the top item without removing it
   * @returns The top item or undefined
   */
  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  /**
   * Gets the size of the stack
   * @returns The number of items
   */
  size(): number {
    return this.items.length;
  }
}

/**
 * Generic interface for a repository
 */
export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(item: T): Promise<T>;
  delete(id: string): Promise<boolean>;
}
