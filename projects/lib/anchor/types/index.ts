/** One entry in a {@link WrAnchor}. */
interface WrAnchorLink {
  /** id of the target element (without `#`). */
  readonly id: string;
  /** Text rendered for the entry. */
  readonly label: string;
  /** Optional nested links (single level of nesting supported). */
  readonly children?: readonly WrAnchorLink[];
}

export type { WrAnchorLink };
