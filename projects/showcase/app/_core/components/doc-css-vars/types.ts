/**
 * One `--wr-*` hook a component publishes, as the generated catalogue records it.
 *
 * Written by `pnpm gen:css-vars` from the library's own stylesheets — never by
 * hand. See `scripts/lib/build-css-var-map.ts` for what qualifies as a hook.
 */
export interface DocCssVarRow {
  /** The property, dashes included: `--wr-alert-bg`. */
  readonly name: string;
  /** The value the library ships, verbatim from the SCSS. */
  readonly default: string;
  /** The selector it is declared on — where an override has to beat it. */
  readonly scope: string;
  /**
   * Whether {@link scope} is the component's base rule. Absent means true.
   *
   * `false` says the component declares this hook only inside a variant or a
   * theme block, so {@link default} is that branch's value rather than a
   * default every instance starts from.
   */
  readonly base?: false;
  /** How many further declarations (variants, states, media) override it. Absent means none. */
  readonly overrides?: number;
}
