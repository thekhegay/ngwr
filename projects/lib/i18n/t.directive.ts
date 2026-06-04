/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, ElementRef, computed, effect, inject, input } from '@angular/core';

import { WrI18n } from './i18n';
import { type WrI18nParams } from './i18n-config';

/**
 * Attribute directive that sets `textContent` of its host to the translation
 * of the bound key. Reactive — re-renders on locale + catalog changes.
 *
 * @example
 * ```html
 * <span [wrT]="'home.title'"></span>
 * <span [wrT]="'greeting'" [wrTParams]="{ name: user().name }"></span>
 * <span [wrT]="'forms.save'" wrTScope="checkout"></span>
 * ```
 */
@Directive({
  selector: '[wrT]',
})
export class WrTDirective {
  /** Translation key. Required. */
  readonly wrT = input.required<string>();

  /** Interpolation params for `{{name}}` tokens. */
  readonly wrTParams = input<WrI18nParams | null>(null);

  /** Optional scope — scoped lookup first, then root fallback. */
  readonly wrTScope = input<string | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly i18n = inject(WrI18n);

  private readonly text = computed(() =>
    this.i18n.t(this.wrT(), this.wrTParams() ?? undefined, this.wrTScope() ?? undefined)
  );

  constructor() {
    effect(() => {
      this.host.nativeElement.textContent = this.text();
    });
  }
}
