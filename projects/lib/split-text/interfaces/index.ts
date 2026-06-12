/** Granularity of the split. `lines` is not yet supported in this port. */
type WrSplitTextUnit = 'chars' | 'words';

/**
 * One end of the animation. Properties not listed default to the steady
 * state (opacity 1, no transform). `x` / `y` are pixels, `scale` is a
 * unitless factor, `rotate` is degrees.
 */
interface WrSplitTextMotion {
  readonly opacity?: number;
  readonly x?: number;
  readonly y?: number;
  readonly scale?: number;
  readonly rotate?: number;
}

export type { WrSplitTextUnit, WrSplitTextMotion };
