/** What kind of doc page a `DocSeeAlsoLink` points at — drives the badge chip. */
export type DocSeeAlsoKind =
  | 'Component'
  | 'Service'
  | 'Directive'
  | 'Pipe'
  | 'Util'
  | 'Validator'
  | 'Guide'
  | 'Animation';

/** One row in the "See also" grid. */
export interface DocSeeAlsoLink {
  /** Display name (e.g. `'WrClipboard'`, `'[wrCopyToClipboard]'`). */
  readonly title: string;
  /** Router commands — passed to `[routerLink]`. */
  readonly url: readonly string[];
  /** Kind chip shown above the title. */
  readonly kind: DocSeeAlsoKind;
  /** Short one-line blurb explaining why this is related. */
  readonly description?: string;
}
