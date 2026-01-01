/**
 * Destructuring pattern examples for CODE_REF demonstration
 */

/**
 * Function using parameter destructuring
 * @param user - User object with name and email
 * @returns A formatted string
 */
export function printUser({ name, email }: { name: string; email: string }): string {
  return `User: ${name} (${email})`;
}

/**
 * Function with array destructuring in parameters
 * @param coordinates - Array of [x, y] coordinates
 * @returns The sum of coordinates
 */
export function sumCoordinates([x, y]: [number, number]): number {
  return x + y;
}

/**
 * Object destructuring with renaming
 */
export function processConfig(config: { apiUrl: string; timeout: number }): void {
  const { apiUrl: url, timeout: timeoutMs } = config;
  console.log(`URL: ${url}, Timeout: ${timeoutMs}ms`);
}

/**
 * Array destructuring example
 */
export const [first, second, ...rest] = [1, 2, 3, 4, 5];

/**
 * Object destructuring example
 */
export const userData = {
  username: 'john_doe',
  email: 'john@example.com',
  age: 30,
};

export const { username, email: userEmail } = userData;

/**
 * Nested destructuring example
 * @param data - Nested data structure
 * @returns The extracted city name
 */
export function extractCity(data: {
  user: { address: { city: string; country: string } };
}): string {
  const {
    user: {
      address: { city },
    },
  } = data;
  return city;
}
