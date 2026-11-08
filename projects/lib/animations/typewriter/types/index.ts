/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** When the typing starts: the first time most of the host is in view, or at once, even above the fold. */
type WrTypewriterTrigger = 'view' | 'load';

/**
 * Where the component is. `idle` is at rest: the line stands whole, no caret.
 * The server, a reduced-motion browser and the end of a pass all land there.
 */
type WrTypewriterPhase = 'idle' | 'typing' | 'holding' | 'deleting' | 'ending' | 'fading';

export type { WrTypewriterPhase, WrTypewriterTrigger };
