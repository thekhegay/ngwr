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
          prefix: 'ngwr',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'ngwr',
          style: 'camelCase',
        },
      ],
    }
  },
  {
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/label-has-associated-control': 'off'
    }
  }
)
