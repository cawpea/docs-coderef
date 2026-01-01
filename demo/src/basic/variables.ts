/**
 * Variable and constant examples for CODE_REF demonstration
 */

/**
 * API configuration constants
 */
export const API_KEY = 'demo-api-key-12345';
export const API_ENDPOINT = 'https://api.example.com';
export const API_VERSION = 'v1';

/**
 * Application configuration object
 */
export const config = {
  appName: 'Demo App',
  version: '1.0.0',
  debug: true,
};

/**
 * Array destructuring example
 */
export const [primaryColor, secondaryColor] = ['blue', 'green'];

/**
 * Object destructuring example
 */
export const { appName, version } = config;

/**
 * Multiple const declarations
 */
export const MAX_RETRIES = 3;
export const TIMEOUT_MS = 5000;
export const DEFAULT_LOCALE = 'en-US';

/**
 * Computed constant
 */
export const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
