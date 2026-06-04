import { Component, computed, input } from '@angular/core';

/**
 * Inline credit chip linking back to the reactbits.dev source for a port.
 * Drop on every reactbits-port doc page so attribution is consistent.
 *
 * @example
 * ```html
 * <ngwr-reactbits-credit slug="border-glow" category="components" />
 * <ngwr-reactbits-credit slug="logo-loop" category="animations" />
 * ```
 */
@Component({
  selector: 'ngwr-reactbits-credit',
  templateUrl: './reactbits-credit.html',
  styleUrl: './reactbits-credit.scss',
})
export class ReactbitsCredit {
  /** Reactbits URL slug (last segment of the docs URL). */
  readonly slug = input.required<string>();

  /** Reactbits taxonomy folder — `'components'`, `'animations'`, `'text-animations'`, … */
  readonly category = input<'components' | 'animations' | 'text-animations'>('animations');

  protected readonly url = computed(() => `https://www.reactbits.dev/${this.category()}/${this.slug()}`);
}
