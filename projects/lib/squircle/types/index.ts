/**
 * Which corners to squircle. `'all'` = standard four-corner squircle;
 * the side-named values squircle the two corners on that side and leave
 * the other two at 90°. Useful for tab-/segment-style controls where
 * only outer corners need smoothing.
 */
type WrSquircleCornerMask = 'all' | 'left' | 'right' | 'top' | 'bottom' | 'none';

export type { WrSquircleCornerMask };
