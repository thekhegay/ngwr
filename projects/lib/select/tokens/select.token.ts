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
  /** Currently selected value. */
  readonly value: Signal<unknown>;
  /** Whether the select is disabled. */
  readonly isDisabled: Signal<boolean>;
  /** Id of the option currently highlighted by keyboard navigation. */
  readonly activeOptionId: Signal<string | null>;
  /** Called when a child option is clicked. */
  selectOption(value: unknown, label: string): void;
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
