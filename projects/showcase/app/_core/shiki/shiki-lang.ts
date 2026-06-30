/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Languages registered with the shared Shiki highlighter.
 *
 * Add a new language: extend this union and register it in
 * {@link createAppHighlighter}.
 */
export type ShikiLang =
  | 'angular-html'
  | 'angular-ts'
  | 'angular-template'
  | 'angular-expression'
  | 'typescript'
  | 'html'
  | 'scss'
  | 'bash'
  | 'diff';
