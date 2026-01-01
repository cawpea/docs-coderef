/**
 * Basic function examples for CODE_REF demonstration
 */

/**
 * Greets a person by name
 * @param name - The name of the person to greet
 * @returns A greeting message
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

/**
 * Adds two numbers together
 * @param a - First number
 * @param b - Second number
 * @returns The sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * Arrow function example
 */
export const multiply = (a: number, b: number): number => {
  return a * b;
};

/**
 * Function with multiple parameters
 */
export function formatUserInfo(firstName: string, lastName: string, age: number): string {
  return `${firstName} ${lastName} (${age} years old)`;
}

/**
 * Default export function
 */
export default function welcome(): string {
  return 'Welcome to the demo!';
}
