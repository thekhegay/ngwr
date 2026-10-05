/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { BaseHarnessFilters } from '@angular/cdk/testing';

/** Narrows which `[wrMention]` field a harness query matches. */
export interface WrMentionHarnessFilters extends BaseHarnessFilters {
  /** Match the field's current text. A string is an exact match, a RegExp is tested. */
  readonly value?: string | RegExp;
  /**
   * Match the field's placeholder — usually the only thing telling two mention
   * fields apart in a fixture, since the host is a plain `<textarea>` / `<input>`
   * with no label of its own. A string is an exact match, a RegExp is tested.
   */
  readonly placeholder?: string | RegExp;
  /** Match only fields currently offering suggestions (`true`), or only those not (`false`). */
  readonly open?: boolean;
}

/** Narrows which suggestion inside a mention panel a harness query matches. */
export interface WrMentionOptionHarnessFilters extends BaseHarnessFilters {
  /** Match the suggestion's label — a string is an exact match, a RegExp is tested. */
  readonly text?: string | RegExp;
  /** Match only the active suggestion (`true`), or only the ones the cursor is not on (`false`). */
  readonly active?: boolean;
}
