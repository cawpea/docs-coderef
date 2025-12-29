// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  // Base recommended configs
  eslint.configs.recommended,

  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.js', // Ignore JS files at root (configs)
      'bin/**/*.js', // CLI wrapper is plain JS
      'jest.config.js',
    ],
  },

  // TypeScript files configuration (non-test files with type checking)
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts'], // Exclude test files from type checking
    extends: [...tseslint.configs.recommendedTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],

      // Relax strict type-checking rules for existing codebase
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/await-thenable': 'warn',

      // General code quality
      'no-console': 'off', // CLI tool needs console
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],

      // Code style (supplementing Prettier)
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'object-shorthand': ['error', 'always'],
      'no-useless-concat': 'error',
    },
  },

  // Test files configuration (basic linting without type checking)
  {
    files: ['src/**/*.test.ts'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-empty-function': 'off', // Test mocks often use empty functions
      '@typescript-eslint/no-explicit-any': 'off', // Tests can use any for simplicity
    },
  },

  // Prettier integration (must be last to disable conflicting rules)
  prettierConfig
);
