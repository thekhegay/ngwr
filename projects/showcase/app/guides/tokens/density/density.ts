import { Component, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrDensity, type WrDensityValue } from 'ngwr/density';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  DocSnippetComponent,
} from '#core/components';
import type { DocSeeAlsoLink } from '#core/components';

interface Multiplier {
  readonly name: string;
  readonly values: string;
  readonly use: string;
}

@Component({
  selector: 'ngwr-tokens-density',
  templateUrl: './density.html',
  imports: [
    WrButton,
    WrSegmented,
    DocCodeComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocSeeAlsoComponent,
  ],
})
export default class TokensDensityPage {
  private readonly density = inject(WrDensity);

  /** Live global density — the same signal `set()` and `cycle()` write to. */
  protected readonly current = this.density.current;

  protected readonly densities: readonly WrDensityValue[] = ['sm', 'md', 'lg', 'touch'];

  protected readonly densityOptions: readonly WrSegmentedOption<WrDensityValue>[] = this.densities.map(value => ({
    value,
    label: value,
  }));

  protected set(value: WrDensityValue | null): void {
    if (value) this.density.set(value);
  }

  protected cycle(): void {
    this.density.cycle();
  }

  protected readonly multipliers: readonly Multiplier[] = [
    { name: '--wr-density-y', values: '0.55 / 1 / 1.35 / 1.7', use: 'Vertical padding, so control height' },
    { name: '--wr-density-x', values: '0.85 / 1 / 1.15 / 1.25', use: 'Horizontal padding' },
    { name: '--wr-density-gap', values: '0.8 / 1 / 1.15 / 1.5', use: 'Gaps in layout components' },
    { name: '--wr-density-text', values: '0.95 / 1 / 1.05 / 1', use: 'Yours to read; no component uses it' },
  ];

  protected readonly snippets = {
    styles: `@use 'ngwr/theme';
@use 'ngwr/density';`,

    provider: `import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';

bootstrapApplication(AppComponent, {
  providers: [
    provideWr(
      withDensity({
        defaultDensity: 'sm',          // default 'md'
        storageKey: 'wr-density',      // null to not persist
      }),
    ),
  ],
});`,

    service: `const density = inject(WrDensity);

density.set('lg');   // 'sm' | 'md' | 'lg' | 'touch'
density.cycle();     // sm, md, lg, touch, sm, …
density.current();   // 'sm' | 'md' | 'lg' | 'touch'`,

    directive: `<aside wrDensity="sm">
  <wr-list>…</wr-list>
</aside>`,

    consume: `.my-control {
  padding: calc(var(--wr-control-padding-y-md) * var(--wr-density-y, 1))
    calc(var(--wr-control-padding-x-md) * var(--wr-density-x, 1));
  gap: calc(0.5rem * var(--wr-density-gap, 1));
}`,
  };

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Service', title: 'WrDensity', url: ['/reference/services', 'density'] },
    { kind: 'Guide', title: 'Sizing', url: ['/guides/tokens', 'sizing'] },
  ];
}
