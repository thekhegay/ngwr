// @ts-check
import tsEslint from 'typescript-eslint';

import rootConfig from '../../eslint.config.mjs';

export default tsEslint.config(...rootConfig, {
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
  },
});
