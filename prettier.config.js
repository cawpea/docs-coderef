/** @type {import("prettier").Config} */
module.exports = {
  // Match existing code style
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  endOfLine: 'lf',

  // Spacing preferences
  arrowParens: 'always',
  bracketSpacing: true,
  bracketSameLine: false,

  // Override for specific file types
  overrides: [
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'preserve',
      },
    },
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
  ],
};
