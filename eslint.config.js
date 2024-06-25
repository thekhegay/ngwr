// @ts-check
const eslint = require('@eslint/js');
const tsEslint = require('typescript-eslint');
const ngEslint = require('angular-eslint');

module.exports = tsEslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tsEslint.configs.recommended,
      ...tsEslint.configs.stylistic,
      ...ngEslint.configs.tsRecommended,
    ],
    processor: ngEslint.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'wr',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'wr',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...ngEslint.configs.templateRecommended,
      ...ngEslint.configs.templateAccessibility,
    ],
    rules: {}
  }
)
