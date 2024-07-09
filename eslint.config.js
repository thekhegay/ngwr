// @ts-check
const eslint = require('@eslint/js');
const tsEslint = require('typescript-eslint');
const ngEslint = require('angular-eslint');
const prettierEslintRecommended = require('eslint-plugin-prettier/recommended');
const importX = require('eslint-plugin-import-x');

module.exports = tsEslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tsEslint.configs.recommended,
      ...tsEslint.configs.stylistic,
      ...ngEslint.configs.tsRecommended,
      prettierEslintRecommended
    ],
    processor: ngEslint.processInlineTemplates,
    plugins: {
      'import-x': importX,
    },
    rules: {
      '@angular-eslint/no-async-lifecycle-method': 'error',
      '@angular-eslint/no-attribute-decorator': 'error',
      '@angular-eslint/sort-lifecycle-methods': 'warn',
      '@angular-eslint/component-max-inline-declarations': [
        'error',
        {
          'template': 1,
          'styles': 1,
          'animations': 1
        }
      ],
      '@angular-eslint/consistent-component-styles': 'error',
      '@angular-eslint/contextual-decorator': 'error',
      '@angular-eslint/no-conflicting-lifecycle': 'error',
      '@angular-eslint/no-forward-ref': 'error',
      '@angular-eslint/no-lifecycle-call': 'error',
      '@angular-eslint/no-pipe-impure': 'error',
      '@angular-eslint/no-queries-metadata-property': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-output-readonly': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/relative-url-prefix': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/use-pipe-transform-interface': 'error',
      '@angular-eslint/directive-class-suffix': [
        'error',
        {
          'suffixes': ['Directive', 'Component']
        }
      ],
      '@angular-eslint/component-class-suffix': [
        'error',
        {
          'suffixes': ['Component']
        }
      ],
      "@typescript-eslint/consistent-type-definitions": "error",
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          "allowExpressions": true,
          "allowConciseArrowFunctionExpressionsStartingWithVoid": true
        }
      ],
      "@typescript-eslint/no-inferrable-types": "error",
      "import-x/no-empty-named-blocks": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-unused-modules": "error",
      "import-x/no-unassigned-import": "error",
      "import-x/exports-last": "error",
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/order": [
        "error",
        {
          "alphabetize": {
            "order": "asc",
            "caseInsensitive": false
          },
          "newlines-between": "always",
          "groups": [
            "builtin",
            "external",
            "internal",
            "parent",
            [
              "sibling",
              "index"
            ]
          ],
          "pathGroups": [
            {
              "pattern": "@angular/**",
              "group": "external",
              "position": "before"
            },
            {
              "pattern": "{rxjs,rxjs/**}",
              "group": "external",
              "position": "before"
            },
            {
              "pattern": "@ngrx/**",
              "group": "external",
              "position": "before"
            },
            {
              "pattern": "{#api,#core/**,#assets/**,#env/**,#app/**,#routing,#root,#store/**}",
              "group": "internal",
              "position": "before"
            }
          ],
          "pathGroupsExcludedImportTypes": []
        }
      ],
      "no-bitwise": "error",
      "no-irregular-whitespace": "error",
      "no-multiple-empty-lines": "error",
      "no-redeclare": "error",
      "no-sparse-arrays": "error",
      "no-template-curly-in-string": "error",
      "prefer-object-spread": "error",
      "prefer-template": "error"


    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...ngEslint.configs.templateRecommended,
      ...ngEslint.configs.templateAccessibility,
      prettierEslintRecommended,
    ],
    rules: {
      'prettier/prettier': [
        'error',
        {
          'parser': 'angular'
        }
      ]
    }
  }
)
