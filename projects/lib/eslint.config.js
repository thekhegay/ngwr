// @ts-check

const tsEslint = require('typescript-eslint');
const rootConfig = require('../../eslint.config');

module.exports = tsEslint.config(
  ...rootConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        {
          type: ['element', 'attribute'],
          prefix: 'wr',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'wr',
          style: 'camelCase',
        },
      ],
    }
  }
)
