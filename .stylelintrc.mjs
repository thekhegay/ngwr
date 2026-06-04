// @ts-check

/**
 * Stylelint config — SCSS + BEM enforcement.
 *
 * BEM grammar accepted by `selector-class-pattern`:
 *
 *   .block              .wr-button
 *   .block__element     .wr-button__icon
 *   .block--modifier    .wr-button--primary
 *   .block__element--m  .wr-button__icon--start
 *
 * The `null`-set rules below are the result of one full run against the
 * lib + showcase — anything that flagged a non-bug or a personal-taste
 * preference (rgba vs rgb, hex casing, vendor prefixes for Safari, …)
 * was switched off, not auto-fixed. We're after BEM enforcement + SCSS
 * syntax checks, not a cosmetic rewrite.
 */

/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss'],
  plugins: ['stylelint-scss'],
  rules: {
    // ───── BEM ─────
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      {
        message: 'Expected BEM class — block, block__element, or block--modifier (kebab-case).',
        resolveNestedSelectors: true,
      },
    ],

    // ───── Vendor prefixes are intentional ─────
    // `-webkit-background-clip: text` etc. are required for Safari; do
    // NOT let stylelint strip them as "redundant" or flag them.
    'property-no-vendor-prefix': null,
    'value-no-vendor-prefix': null,
    'selector-no-vendor-prefix': null,
    'media-feature-name-no-vendor-prefix': null,
    'at-rule-no-vendor-prefix': null,
    'declaration-block-no-duplicate-properties': null,

    // ───── Cosmetic preferences, not bugs ─────
    'color-function-notation': null,
    'color-function-alias-notation': null,
    'color-hex-length': null,
    'alpha-value-notation': null,
    'hue-degree-notation': null,
    'lightness-notation': null,
    'media-feature-range-notation': null,
    'shorthand-property-no-redundant-values': null,
    'value-keyword-case': null,
    'declaration-block-no-redundant-longhand-properties': null,

    // ───── Naming patterns we don't constrain globally ─────
    'scss/dollar-variable-pattern': null,
    'scss/at-function-pattern': null,
    'scss/at-mixin-pattern': null,
    'scss/percent-placeholder-pattern': null,
    'keyframes-name-pattern': null,
    'custom-property-pattern': null,

    // ───── Whitespace + comments — prettier owns these ─────
    'declaration-empty-line-before': null,
    'rule-empty-line-before': null,
    'at-rule-empty-line-before': null,
    'comment-empty-line-before': null,
    'scss/double-slash-comment-empty-line-before': null,
    'scss/dollar-variable-empty-line-before': null,
    'custom-property-empty-line-before': null,

    // ───── Cosmetic SCSS preferences ─────
    'scss/comment-no-empty': null, // decorative `// ─────` divider lines
    'length-zero-no-unit': null, // `0px` is fine
    'selector-not-notation': null, // `:not(.a, .b)` vs `:not(.a):not(.b)`
    'scss/at-if-no-null': null,
    'number-max-precision': null,
    // `clip: rect(0,0,0,0)` is still THE visually-hidden pattern used
    // by the .wr-checkbox / .wr-radio / .wr-switch native-input hiders.
    // Deprecation is paper-only — every browser ships it. Off.
    'property-no-deprecated': null,
    // False positive on `calc(... - \n ...)` line wraps that prettier
    // emits; the `-` is CSS calc syntax, not SCSS arithmetic.
    'scss/operator-no-newline-after': null,
    // We use `@extend .container-fluid` in the grid utility on purpose
    // — the consumer needs the class produced too.
    'scss/at-extend-no-missing-placeholder': null,

    // ───── Angular pseudo-elements ─────
    'selector-pseudo-element-no-unknown': [
      true,
      { ignorePseudoElements: ['ng-deep'] },
    ],

    // ───── SCSS-specific syntax — strict ─────
    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': true,
    'no-descending-specificity': null,
  },
  ignoreFiles: [
    'dist/**/*',
    'node_modules/**/*',
    '_old/**/*',
    '.angular/**/*',
    'projects/showcase/styles/_fonts.scss',
  ],
};
