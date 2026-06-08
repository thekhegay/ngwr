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
      '@angular-eslint/no-forward-ref': 'error',
      '@angular-eslint/no-lifecycle-call': 'error',
      '@angular-eslint/no-pipe-impure': 'error',
      '@angular-eslint/no-queries-metadata-property': 'error',
      // Angular 22 makes `OnPush` the default when `changeDetection` is
      // unset, so the historical "must opt into OnPush" rule is now
      // counterproductive — leaving the field empty is the new ideal.
      // Re-enable (or invert to ban Eager / renamed Default) if/when
      // angular-eslint ships a v22-aware version.
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
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
      // ESLint 10 removed the FileEnumerator API the rule depends on, so
      // it's a no-op upstream until eslint-plugin-import-x implements an
      // alternative. Keep the rule listed (it'll start working again) and
      // silence the boot-time warning in the meantime.
      'import-x/no-unused-modules': [
        'error',
        {
          unusedExports: true,
          missingExports: false,
          suppressMissingFileEnumeratorAPIWarning: true,
        },
      ],
      'import-x/no-unassigned-import': 'error',
      'import-x/exports-last': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      // Google: no default exports — *but* Angular's lazy-loading contract
      // (`loadComponent: () => import('./foo')`) requires them. Keeping the
      // rule off project-wide is simpler than chasing globs that match the
      // angular-eslint builder's absolute paths.
      'import-x/no-default-export': 'off',
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
  // Build / migration scripts run on Node — relax the no-console rule and
  // skip a few style rules that don't fit short CLI helpers.
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/prefer-string-starts-ends-with': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      'prettier/prettier': 'off',
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
