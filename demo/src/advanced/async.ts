/**
 * Async/await pattern examples for CODE_REF demonstration
 */

/**
 * Async function that fetches user data
 * @param userId - The ID of the user to fetch
 * @returns Promise resolving to user data
 */
export async function fetchUser(userId: string): Promise<{ id: string; name: string }> {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: userId, name: 'John Doe' });
    }, 100);
  });
}

/**
 * Async arrow function
 */
export const fetchPosts = async (limit: number): Promise<string[]> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(['Post 1', 'Post 2', 'Post 3'].slice(0, limit));
    }, 100);
  });
};

/**
 * Function returning a Promise
 * @param data - Data to save
 * @returns Promise resolving to success status
 */
export function saveData(data: unknown): Promise<boolean> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (data) {
        resolve(true);
      } else {
        reject(new Error('No data provided'));
      }
    }, 100);
  });
}

/**
 * Async function with error handling
 * @param url - URL to fetch
 * @returns Promise resolving to response data or null on error
 */
export async function fetchWithErrorHandling(url: string): Promise<string | null> {
  try {
    // Simulate fetch
    const response = await fetch(url);
    const data = await response.text();
    return data;
  } catch (error) {
    console.error('Fetch failed:', error);
    return null;
  }
}

/**
 * Async function using Promise.all
 * @param userIds - Array of user IDs
 * @returns Promise resolving to array of users
 */
export async function fetchMultipleUsers(
  userIds: string[]
): Promise<{ id: string; name: string }[]> {
  const promises = userIds.map((id) => fetchUser(id));
  return Promise.all(promises);
}
