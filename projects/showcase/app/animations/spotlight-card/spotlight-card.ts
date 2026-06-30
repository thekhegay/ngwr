import { Component, ElementRef, afterNextRender, computed, signal, viewChild } from '@angular/core';

import { WrSpotlight, WrSpotlightCard } from 'ngwr/spotlight-card';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSnippetComponent,
  ReactbitsCredit,
} from '#core/components';

/** `rgb(a)` computed colour → #rrggbbaa for the playground picker. */
function rgbaToHex(value: string): string | null {
  const m = /rgba?\(\s*(\d+)\s*,?\s*(\d+)\s*,?\s*(\d+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)/.exec(value);
  if (!m) return null;
  const to2 = (n: number): string => n.toString(16).padStart(2, '0');
  let alpha = 255;
  if (m[4] !== undefined) {
    const raw = m[4].endsWith('%') ? Number.parseFloat(m[4]) / 100 : Number.parseFloat(m[4]);
    alpha = Math.round(raw * 255);
  }
  return `#${to2(+m[1])}${to2(+m[2])}${to2(+m[3])}${to2(alpha)}`;
}

@Component({
  selector: 'ngwr-spotlight-card-page',
  templateUrl: './spotlight-card.html',
  imports: [
    WrSpotlightCard,
    WrSpotlight,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class SpotlightCardPage {
  // Prefilled from the theme's resolved spotlight colour after first
  // render, so the picker shows a working value right away.
  protected readonly spotlightColor = signal('');
  protected readonly radius = signal(80);

  private readonly cardRef = viewChild(WrSpotlightCard, { read: ElementRef });

  constructor() {
    afterNextRender(() => {
      const el = this.cardRef()?.nativeElement as HTMLElement | undefined;
      if (!el) return;
      const resolved = getComputedStyle(el).getPropertyValue('--wr-spotlight-color').trim();
      const hex = rgbaToHex(resolved);
      if (hex) this.spotlightColor.set(hex);
    });
  }

  protected readonly snippet = computed(
    () =>
      `<wr-spotlight-card${this.spotlightColor() ? ` spotlightColor="${this.spotlightColor()}"` : ''}>
  <h3>Cursor-tracked spotlight</h3>
  <p>Move the pointer across this card.</p>
</wr-spotlight-card>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'color', label: 'Spotlight Color', signal: this.spotlightColor },
    { kind: 'slider', label: 'Radius (%)', signal: this.radius, min: 30, max: 100, step: 5, unit: '%' },
  ];

  protected readonly snippets = {
    install: `import { WrSpotlightCard } from 'ngwr/spotlight-card';`,
    directive: `// Directive variant — same package, drops on any element.
import { WrSpotlight } from 'ngwr/spotlight-card';

<div wrSpotlight class="card">…</div>

// Then in your CSS:
// background: radial-gradient(
//   400px circle at var(--wr-spotlight-x, 50%) var(--wr-spotlight-y, 50%),
//   rgba(var(--wr-color-primary-rgb), 0.15),
//   transparent 60%
// );`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'radius',
      description: 'Where the spotlight fades out (% of the gradient).',
      type: 'number',
      default: '80',
    },
    {
      name: 'spotlightColor',
      description: 'Highlight colour on `<wr-spotlight-card>`. Any CSS colour string.',
      type: 'string',
      default: 'theme-aware (dark glow on light surfaces, light glow on dark)',
    },
    {
      name: '[wrSpotlight]',
      description:
        'Directive variant — writes `--wr-spotlight-x/y` (in `%`) to any host based on pointer position. Pair with a radial-gradient/mask in your CSS.',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrSpotlight].resetX / .resetY',
      description: 'Default coordinates when no pointer is over the host.',
      type: 'string',
      default: "'50%'",
    },
  ];
}
