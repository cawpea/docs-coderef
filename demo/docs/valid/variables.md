# Variable CODE_REF Examples

This document demonstrates valid variable and constant CODE_REF patterns.

## Simple Constant

The `API_KEY` constant:

<!-- CODE_REF: src/basic/variables.ts#API_KEY -->

```typescript
/**
 * API configuration constants
 */
export const API_KEY = 'demo-api-key-12345';
```

## API Endpoint

The `API_ENDPOINT` constant:

<!-- CODE_REF: src/basic/variables.ts#API_ENDPOINT -->

```typescript
export const API_ENDPOINT = 'https://api.example.com';
```

## Configuration Object

The `config` object:

<!-- CODE_REF: src/basic/variables.ts#config -->

```typescript
/**
 * Application configuration object
 */
export const config = {
  appName: 'Demo App',
  version: '1.0.0',
  debug: true,
};
```

## Array Destructuring

Destructured array constants:

<!-- CODE_REF: src/basic/variables.ts#primaryColor -->

```typescript
/**
 * Array destructuring example
 */
export const [primaryColor, secondaryColor] = ['blue', 'green'];
```

## Object Destructuring

Destructured object properties:

<!-- CODE_REF: src/basic/variables.ts#appName -->

```typescript
/**
 * Object destructuring example
 */
export const { appName, version } = config;
```

## Multiple Constants

The `MAX_RETRIES` constant:

<!-- CODE_REF: src/basic/variables.ts#MAX_RETRIES -->

```typescript
/**
 * Multiple const declarations
 */
export const MAX_RETRIES = 3;
```

The `TIMEOUT_MS` constant:

<!-- CODE_REF: src/basic/variables.ts#TIMEOUT_MS -->

```typescript
export const TIMEOUT_MS = 5000;
```

## Computed Constant

The `CACHE_DURATION` computed constant:

<!-- CODE_REF: src/basic/variables.ts#CACHE_DURATION -->

```typescript
/**
 * Computed constant
 */
export const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
```
