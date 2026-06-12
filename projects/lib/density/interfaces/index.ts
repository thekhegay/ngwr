/** Density scale. Components multiply their paddings by the matching multiplier. */
type WrDensityValue = 'compact' | 'default' | 'comfortable';

/** Configuration for {@link WrDensityValueService}. */
interface WrDensityConfig {
  /** Initial density used when no persisted value is present. @default 'default' */
  readonly defaultDensity: WrDensityValue;
  /** Storage key for persistence (via `WrStorage`). Set to `null` to disable. @default 'wr-density' */
  readonly storageKey: string | null;
  /** Attribute written to `<html>` to expose the active density. @default 'data-wr-density' */
  readonly attribute: string;
}

export type { WrDensityValue, WrDensityConfig };
