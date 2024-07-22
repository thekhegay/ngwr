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
  },
  {
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/interactive-supports-focus': 'off',
      '@angular-eslint/template/label-has-associated-control': 'off',
      '@angular-eslint/template/click-events-have-key-events': 'off'
    }
  }
)
