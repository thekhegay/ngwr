/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { InjectionToken, type Signal } from '@angular/core';

/** Per-option registration metadata. @internal */
export interface WrSelectOptionRegistration {
  readonly id: string;
  readonly value: unknown;
  readonly disabled: boolean;
  /**
   * Lazy label reader. Options render text via `<ng-content>`, so we
   * read it at call time once Angular has settled the projected content.
   */
  readonly getLabel: () => string;
}

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
  /** Is the given option value currently selected? Handles both single and multi. */
  isSelected(value: unknown): boolean;
  /**
   * Called when a child option is clicked. The label is read lazily
   * via {@link WrSelectOptionRegistration.getLabel}, so callers don't
   * need to thread it through.
   */
  selectOption(value: unknown): void;
  /** Register an option; returns an unregister function. */
  registerOption(reg: WrSelectOptionRegistration): () => void;
}

/**
 * Token a `<wr-option>` injects to register itself with and notify its
 * parent `<wr-select>`.
 *
 * @internal
 */
export const WR_SELECT = new InjectionToken<WrSelectContext>('WR_SELECT');
