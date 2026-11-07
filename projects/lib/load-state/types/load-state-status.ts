/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** What `<wr-load-state>` draws: the skeleton, the failure, the empty slot or the content. */
export type WrLoadStateStatus = 'loading' | 'error' | 'empty' | 'ready';
