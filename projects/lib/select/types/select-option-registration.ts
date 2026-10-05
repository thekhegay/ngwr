/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { Signal, TemplateRef } from '@angular/core';

import type { WrOptionLeadingContext } from './option-leading-context';

/** Per-option registration metadata. @internal */
export interface WrSelectOptionRegistration {
  readonly id: string;
  readonly value: unknown;
  readonly disabled: boolean;
  /**
   * The option's text, as a signal. Options render it via `<ng-content>`, so it
   * is read back off the DOM — and it has to be reactive, because the ordinary
   * way it changes is a translation catalog landing after the first pass. A
   * plain reader let the trigger cache the English fallback forever.
   */
  readonly label: Signal<string>;
  /**
   * The option's own element, when it has one. The keyboard cursor walks the
   * registry, and registration order is CREATION order — projected children are
   * created before the panel renders its own `[options]` rows — so without this
   * the cursor moved in a different order from the one on screen. Optional: a
   * registration that cannot supply an element simply keeps its place.
   */
  readonly host?: HTMLElement;
  /**
   * The option's own `wrOptionLeading` template, when it declares one. Chips
   * look it up by value, since a chip is drawn by the select and not by the
   * option. Optional, like `host`: a registration without one falls back to the
   * select's default template.
   */
  readonly leading?: Signal<TemplateRef<WrOptionLeadingContext> | null>;
}
