/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Signal, TemplateRef } from '@angular/core';

import type { WrOptionLeadingContext } from './option-leading-context';
import type { WrSelectOptionRegistration } from './select-option-registration';

/**
 * Contract a `<wr-option>` uses to talk to its parent `<wr-select>`.
 *
 * @internal
 */
export interface WrSelectContext {
  /**
   * Currently selected value. Single mode: `T | null`. Multi mode:
   * `readonly T[]`. Options consult {@link isSelected} instead of
   * reading this directly so the same option code works in both modes.
   */
  readonly value: Signal<unknown>;
  /** Whether the select is in multi-selection mode. */
  readonly multi: Signal<boolean>;
  /** Whether the select is disabled. */
  readonly isDisabled: Signal<boolean>;
  /** Id of the option currently highlighted by keyboard navigation. */
  readonly activeOptionId: Signal<string | null>;
  /**
   * Active search query (search mode only). Empty string when there is
   * no filter applied — options treat that as "show me".
   */
  readonly searchQuery: Signal<string>;
  /** True only when `mode="search"`. */
  readonly isSearch: Signal<boolean>;
  /**
   * True when a filter is active — `mode="search"` or `[searchable]`. Options
   * gate self-hiding on this.
   */
  readonly isSearchable: Signal<boolean>;
  /**
   * False when the option list is already query-scoped upstream (`[loader]` or
   * `[serverSearch]`), in which case options must NOT self-hide.
   */
  readonly clientFilter: Signal<boolean>;
  /**
   * Whether the panel is open. An option draws its leading visual only while it
   * is, because projected options exist — detached — for the whole life of the
   * select, and a template instantiated there would be every avatar at once.
   */
  readonly panelOpen: Signal<boolean>;
  /**
   * The select-wide `wrOptionLeading` template — one declared as a direct child
   * of `<wr-select>` — or `null`. An option with a template of its own ignores it.
   */
  readonly optionLeading: Signal<TemplateRef<WrOptionLeadingContext> | null>;
  /** Is the given option value currently selected? Handles both single and multi. */
  isSelected(value: unknown): boolean;
  /**
   * Called when a child option is clicked. The label rides along on the
   * registration ({@link WrSelectOptionRegistration.label}), so callers don't
   * need to thread it through.
   */
  selectOption(value: unknown): void;
  /** Register an option; returns an unregister function. */
  registerOption(reg: WrSelectOptionRegistration): () => void;
}
