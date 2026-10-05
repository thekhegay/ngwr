/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * What a `<wr-collapse>` hands its parent group when it registers.
 *
 * A named export rather than the structural type it used to be spelled as. Both
 * group components declared their OWN local `interface Member`, so d.ts
 * flattening had two of one name to resolve and published the second as
 * `Member$1` — a bundler-assigned identifier in the signature of a public method,
 * which no consumer could import and nobody had authored.
 */
export interface WrCollapseGroupMember {
  /** Close this collapse — the group calls it on siblings in accordion mode. */
  close(): void;
  /** Identity of the registering collapse, used as the map key and by `notifyOpened`. */
  readonly id: object;
}
