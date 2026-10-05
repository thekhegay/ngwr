/**
 * Built-in dot colours.
 *
 * `neutral` was `medium` until v15, named after an intent the palette no
 * longer has. The dot it draws was always the quiet one — hollow, a ring in
 * the muted role rather than a filled intent — so the rename moves the name
 * onto what the value does.
 */
type WrTimelineColor = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export type { WrTimelineColor };
