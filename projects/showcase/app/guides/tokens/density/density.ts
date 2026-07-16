import { Component, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrDensity, type WrDensityValue } from 'ngwr/density';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import type { DocApiRow } from '#core/components';

@Component({
  selector: 'ngwr-tokens-density',
  templateUrl: './density.html',
  imports: [WrButton, DocApiComponent, DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent],
})
export default class TokensDensityPage {
  private readonly density = inject(WrDensity);

  /** Live global density — the same signal `set()` and `cycle()` write to. */
  protected readonly current = this.density.current;

  protected readonly densities: readonly WrDensityValue[] = ['sm', 'md', 'lg', 'touch'];

  protected set(value: WrDensityValue): void {
    this.density.set(value);
  }

  protected cycle(): void {
    this.density.cycle();
  }

  protected readonly multipliers: readonly DocApiRow[] = [
    {
      name: '--wr-density-y',
      type: 'number',
      default: '1',
      description: 'Scales vertical padding (`padding-y`). The lever that changes control height.',
    },
    {
      name: '--wr-density-x',
      type: 'number',
      default: '1',
      description: 'Scales horizontal padding (`padding-x`).',
    },
    {
      name: '--wr-density-text',
      type: 'number',
      default: '1',
      description: 'Scales font size for controls that opt in.',
    },
    {
      name: '--wr-density-gap',
      type: 'number',
      default: '1',
      description: 'Scales the gap between adjacent controls / list items.',
    },
  ];

  protected readonly scale: readonly DocApiRow[] = [
    {
      name: 'sm',
      type: 'y 0.55 · x 0.85',
      default: 'text 0.95 · gap 0.8',
      description: 'Compact — dense tables, toolbars, data-heavy screens.',
    },
    {
      name: 'md',
      type: 'y 1 · x 1',
      default: 'text 1 · gap 1',
      description: 'Default. Every multiplier resolves to `1` — the baseline control sizing.',
    },
    {
      name: 'lg',
      type: 'y 1.35 · x 1.15',
      default: 'text 1.05 · gap 1.15',
      description: 'Roomy — marketing pages, low-density forms.',
    },
    {
      name: 'touch',
      type: 'y 1.7 · x 1.25',
      default: 'text 1 · gap 1.5',
      description:
        'Finger-friendly (~44px targets). Leans on `y` + `gap`; text stays at reading size since touch is about hit area, not legibility.',
    },
  ];

  protected readonly snippets = {
    provider: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideWrDensity } from 'ngwr/density';

bootstrapApplication(AppComponent, {
  providers: [
    // All fields optional — merged with defaults.
    // defaultDensity: 'md', storageKey: 'wr-density', attribute: 'data-wr-density'
    provideWrDensity({ defaultDensity: 'sm' }),
  ],
});`,

    service: `import { Component, inject } from '@angular/core';
import { WrDensity } from 'ngwr/density';

@Component({ /* … */ })
export class DensityToggle {
  private readonly density = inject(WrDensity);

  set() {
    this.density.set('lg');   // switch globally — writes [data-wr-density] on <html>
    this.density.cycle();     // sm → md → lg → touch → sm …
    this.density.current();   // Signal<WrDensityValue> — read the active value
  }
}`,

    directive: `<!-- The whole sidebar runs at sm; the rest of the app keeps its global density. -->
<aside wrDensity="sm">
  <wr-list ...></wr-list>
</aside>`,

    consume: `// How a control reads the multipliers. The control declares its static
// padding via the shared control-* contract, then multiplies by the
// density scalar in calc() — so it tracks density without re-rendering.
.wr-input {
  padding: calc(var(--wr-input-padding-y) * var(--wr-density-y, 1))
    calc(var(--wr-input-padding-x) * var(--wr-density-x, 1));
}`,
  };
}
