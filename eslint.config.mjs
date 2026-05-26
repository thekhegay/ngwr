// @ts-check
import eslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import ngEslint from 'angular-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import importX from 'eslint-plugin-import-x';

export default tsEslint.config(
  {
    ignores: ['dist', '_old', 'node_modules', '.angular', 'out-tsc'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tsEslint.configs.recommendedTypeChecked,
      ...tsEslint.configs.stylisticTypeChecked,
      ...ngEslint.configs.tsRecommended,
      prettierRecommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    processor: ngEslint.processInlineTemplates,
    plugins: {
      'import-x': importX,
    },
    rules: {
      // ───── Angular (current style guide — angular.dev/style-guide) ─────
      '@angular-eslint/no-async-lifecycle-method': 'error',
      '@angular-eslint/no-attribute-decorator': 'error',
      '@angular-eslint/sort-lifecycle-methods': 'warn',
      '@angular-eslint/component-max-inline-declarations': ['error', { template: 1, styles: 1, animations: 1 }],
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

      // Current style drops the Component/Directive/Pipe/Service suffix.
      // `MatButton`, `MatTooltip`, `MatDialog` — not `MatButtonComponent`.
      '@angular-eslint/component-class-suffix': 'off',
      '@angular-eslint/directive-class-suffix': 'off',
      '@angular-eslint/pipe-prefix': 'off',

      // Signals-first preferences.
      '@angular-eslint/prefer-signals': 'error',

      // ───── TypeScript (Google TS style guide) ─────
      // Google: prefer interfaces over type aliases for object shapes.
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-expressions': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        },
      ],
      '@typescript-eslint/no-inferrable-types': 'error',
      // Forbid `any` per Google guide — use `unknown` or specific types.
      '@typescript-eslint/no-explicit-any': 'error',
      // Forbid `#private` fields — use the `private` keyword instead.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'PropertyDefinition[key.type="PrivateIdentifier"]',
          message: 'Use the `private` keyword instead of `#private` fields (Google TS style guide).',
        },
        {
          selector: 'MethodDefinition[key.type="PrivateIdentifier"]',
          message: 'Use the `private` keyword instead of `#private` methods (Google TS style guide).',
        },
      ],
      // Google: never use `var`.
      'no-var': 'error',
      // Google: parameter properties OK; visibility default is public; restrict explicit `public`.
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'no-public',
          overrides: { parameterProperties: 'explicit' },
        },
      ],

      // ───── Imports ─────
      'import-x/no-empty-named-blocks': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-unused-modules': 'error',
      'import-x/no-unassigned-import': 'error',
      'import-x/exports-last': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      // Google: no default exports (allowed for Angular lazy-loaded route components).
      'import-x/no-default-export': 'error',
      'import-x/order': [
        'error',
        {
          alphabetize: { order: 'asc', caseInsensitive: false },
          'newlines-between': 'always',
          groups: ['builtin', 'external', 'internal', 'parent', ['sibling', 'index']],
          pathGroups: [
            {
              pattern: '@angular/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '{rxjs,rxjs/**}',
              group: 'external',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: [],
        },
      ],

      // ───── General ─────
      'no-bitwise': 'error',
      'no-console': 'error',
      'no-irregular-whitespace': 'error',
      'no-multiple-empty-lines': 'error',
      'no-redeclare': 'error',
      'no-sparse-arrays': 'error',
      'no-template-curly-in-string': 'error',
      'prefer-object-spread': 'error',
      'prefer-template': 'error',
    },
  },
  // Lazy-loaded route components must use `export default` — Angular's
  // loadComponent / loadChildren contract relies on it.
  {
    files: ['**/*.routing.ts', '**/*.component.ts', '**/*.page.ts'],
    rules: {
      'import-x/no-default-export': 'off',
    },
  },
  // Showcase docs pages are lazy-loaded; they keep their default export.
  {
    files: ['projects/showcase/app/**/*.ts'],
    rules: {
      'import-x/no-default-export': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...ngEslint.configs.templateRecommended, ...ngEslint.configs.templateAccessibility, prettierRecommended],
    rules: {
      'prettier/prettier': ['error', { parser: 'angular' }],
    },
  }
);
