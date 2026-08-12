/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The size scale every control shares.
 *
 * Declared here rather than imported from a component, and that is deliberate:
 * `ngwr/config` must not depend on the entry points that depend on IT, or
 * ng-packagr refuses the build. Nothing drifts silently as a result — a component
 * reads its default through {@link useConfigValue}, whose generic is the
 * component's OWN size type, so narrowing `WrButtonSize` would stop that call
 * compiling. The type checker is the parity guard.
 */
export type WrControlSize = 'sm' | 'md' | 'lg';

/** Defaults every control-shaped component understands. */
export interface WrControlDefaults {
  /** `sm` / `md` / `lg`. */
  readonly size?: WrControlSize;
  /** Pill-shaped rather than the standard radius. */
  readonly rounded?: boolean;
}

/**
 * App-wide component defaults.
 *
 * Every field is a DEFAULT, never an override: a value bound on the element
 * always wins, so a config is what a component falls back to rather than
 * something a template has to fight. That ordering is the whole design — the
 * lesson from NG-ZORRO's `NzConfigService`, where a global set could not be
 * turned off locally and consumers ended up re-stating every input to escape it.
 *
 * Empty by default. A component with no config behaves exactly as it does today.
 *
 * @example
 * ```ts
 * provideWrConfig({
 *   button: { size: 'sm' },
 *   input: { size: 'sm' },
 *   select: { size: 'sm', rounded: true },
 * })
 * ```
 *
 * Two keys are deliberately absent, and it is worth knowing why before adding
 * them back.
 *
 * **No `color`.** The library's own chrome binds `[color]="isCurrent ? 'primary' :
 * null"` — `pagination`, the `event-calendar` view switcher — where `null` means
 * "neutral". {@link useConfigValue} reads `null` as "the template said nothing", so
 * a configured intent would repaint every one of those buttons. There is no value
 * in `WrColor` that means "no intent", so a colour default cannot be made safe
 * without inventing a sentinel, and a sentinel is a worse API than no key.
 *
 * **No `button.shape`.** A button's corner treatment is three-valued
 * (`rounded` / `pill` / `squircle`) and its type lives in `ngwr/button`, which
 * imports THIS entry point — naming it here would be a circular dependency
 * ng-packagr refuses. A boolean `rounded` was tried and rejected: it cannot express
 * `squircle`, and its polarity inverts the component's own vocabulary, where
 * `rounded` is the value a `false` would produce.
 */
export interface WrConfig {
  readonly button?: Pick<WrControlDefaults, 'size'>;
  readonly checkbox?: Pick<WrControlDefaults, 'size'>;
  readonly input?: WrControlDefaults;
  readonly inputNumber?: WrControlDefaults;
  readonly inputOtp?: Pick<WrControlDefaults, 'size'>;
  /**
   * Defaults for `<wr-markdown>`.
   *
   * Both keys are app-wide policy rather than per-instance taste, which is the
   * test a config key has to pass: whether links in rendered markdown open in a
   * new tab, and whether code blocks carry a copy button, are decisions an app
   * makes once. `linkTarget` is spelled as a literal union rather than imported
   * from `ngwr/markdown` for the reason `button.shape` is absent — that entry
   * point imports this one, and ng-packagr refuses the cycle.
   */
  readonly markdown?: {
    readonly linkTarget?: '_blank' | '_self';
    readonly copyable?: boolean;
  };
  readonly radio?: Pick<WrControlDefaults, 'size'>;
  readonly select?: WrControlDefaults;
  readonly switch?: Pick<WrControlDefaults, 'size'>;
  readonly textarea?: Pick<WrControlDefaults, 'size'>;
}
