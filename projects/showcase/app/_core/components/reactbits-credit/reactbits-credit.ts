import { Component, computed, input } from '@angular/core';

/**
 * Inline credit chip linking back to the React Bits original of a bit.
 * Every bits page that owes React Bits something carries one, so the
 * attribution reads the same everywhere.
 *
 * `kind` says what was taken. A `port` carries the original's code into
 * Angular and names the licence; an `idea` shares the effect only, the code
 * being ngwr's own.
 *
 * @example
 * ```html
 * <ngwr-reactbits-credit slug="border-glow" category="components" />
 * <ngwr-reactbits-credit slug="ripple-grid" category="backgrounds" kind="idea" />
 * ```
 */
@Component({
  selector: 'ngwr-reactbits-credit',
  templateUrl: './reactbits-credit.html',
  styleUrl: './reactbits-credit.scss',
})
export class ReactbitsCredit {
  /** React Bits URL slug (last segment of the docs URL). */
  readonly slug = input.required<string>();

  /** React Bits taxonomy folder: `'components'`, `'animations'`, `'text-animations'`, `'backgrounds'`. */
  readonly category = input<'components' | 'animations' | 'text-animations' | 'backgrounds'>('animations');

  /** Whether the bit ports the original's code or only follows its idea. @default 'port' */
  readonly kind = input<'port' | 'idea'>('port');

  protected readonly url = computed(() => `https://www.reactbits.dev/${this.category()}/${this.slug()}`);

  /** The original's name as React Bits prints it: the slug in title case. */
  protected readonly name = computed(() =>
    this.slug()
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}
