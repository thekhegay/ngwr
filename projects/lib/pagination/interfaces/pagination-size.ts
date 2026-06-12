/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Size variant. The middle three (`sm` / `md` / `lg`) cascade the
 * matching `<wr-btn>` size directly; `xs` and `xl` reuse the closest
 * button size and overlay tighter / chunkier padding + font tokens so
 * the cells read smaller / bigger than the button's own scale.
 */
export type WrPaginationSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
