import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { WrButton } from 'ngwr/button';
import { WrDensity, WrDensityDirective, type WrDensityValue } from 'ngwr/density';
import { WrInput } from 'ngwr/input';
import { WrSelect, WrOption } from 'ngwr/select';
import { WrTag } from 'ngwr/badge';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-density-page',
  templateUrl: './density.html',
  imports: [
    ReactiveFormsModule,
    WrButton,
    WrDensityDirective,
    WrInput,
    WrSelect,
    WrOption,
    WrTag,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class DensityServicePage {
  private readonly density = inject(WrDensity);

  protected readonly current = this.density.current;
  protected readonly modes: readonly WrDensityValue[] = ['compact', 'default', 'comfortable'];

  protected readonly demoSelect = new FormControl<string>('sm', { nonNullable: true });

  protected set(value: WrDensityValue): void {
    this.density.set(value);
  }

  protected readonly snippets = {
    install: `import { provideWrDensity, WrDensity } from 'ngwr/density';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrDensity({ defaultDensity: 'compact' }),
  ],
});

// Switch it later:
const density = inject(WrDensity);
density.set('comfortable');
density.cycle();`,
    directive: `<!-- Scope an override to a subtree — descendants get compact, the rest of the app keeps the global value. -->
<aside wrDensity="compact">
  <wr-list ...></wr-list>
</aside>`,
    tokens: `/* Override the multipliers in your own stylesheet. */
[data-wr-density='compact'] {
  --wr-density-y: 0.5;     /* even tighter vertical padding */
  --wr-density-x: 0.8;
}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'current',
      description: 'Active density signal. Read-only — use `set(d)` / `cycle()` to write.',
      type: 'Signal<WrDensityValue>',
      default: "'default'",
    },
    {
      name: 'set(density)',
      description: 'Switch the active density. Ignores unknown values.',
      type: '(d: WrDensityValue) => void',
      default: '—',
    },
    {
      name: 'cycle()',
      description: 'Cycle compact → default → comfortable → compact …',
      type: '() => void',
      default: '—',
    },
    {
      name: '[wrDensity]',
      description: 'Attribute directive — scope a density override to one subtree.',
      type: 'Directive',
      default: '—',
    },
    {
      name: 'CSS tokens',
      description:
        '`--wr-density-y`, `--wr-density-x`, `--wr-density-text`, `--wr-density-gap` — multipliers components apply to their paddings via `calc()`.',
      type: 'CSS custom property',
      default: '1',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Theming',
      url: ['/getting-started', 'theming'],
      description: 'How density fits alongside palette, dark mode, and design-token overrides.',
    },
    {
      kind: 'Service',
      title: 'WrTheme',
      url: ['/services', 'theme'],
      description: 'Sibling — light / dark / auto. Pair both for a full appearance API.',
    },
  ];
}
