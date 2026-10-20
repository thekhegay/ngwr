import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { WrDensity, WrDensityDirective, type WrDensityValue } from 'ngwr/density';
import { WrInput } from 'ngwr/input';
import { WrSelect, WrOption } from 'ngwr/select';

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
  protected readonly modes: readonly WrDensityValue[] = ['sm', 'md', 'lg', 'touch'];

  protected readonly demoSelect = new FormControl<string>('sm', { nonNullable: true });

  protected set(value: WrDensityValue): void {
    this.density.set(value);
  }

  protected readonly snippets = {
    usage: `private readonly density = inject(WrDensity);

this.density.set('touch');
this.density.cycle();
this.density.current(); // 'sm' | 'md' | 'lg' | 'touch'`,
    provider: `import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';

providers: [provideWr(withDensity({ defaultDensity: 'sm' }))],`,
    directive: `<aside wrDensity="sm">
  <wr-list ...></wr-list>
</aside>`,
    tokens: `[data-wr-density='sm'] {
  --wr-density-y: 0.5;
  --wr-density-x: 0.8;
}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'WrDensity', description: 'Injectable service.', type: 'service', default: '—' },
    {
      name: 'current',
      description: 'Active density. Write it with `set()` or `cycle()`.',
      type: 'Signal<WrDensityValue>',
      default: "'md'",
      sub: true,
    },
    {
      name: 'set(density)',
      description: 'Switch the active density. Ignores unknown values.',
      type: '(d: WrDensityValue) => void',
      default: '—',
    },
    {
      name: 'cycle()',
      description: 'Cycle `sm`, `md`, `lg`, `touch`, then back to `sm`.',
      type: '() => void',
      default: '—',
    },
    {
      name: '[wrDensity]',
      description: 'Give one subtree its own density.',
      type: 'Directive',
      default: '—',
    },
    {
      name: 'CSS tokens',
      description:
        '`--wr-density-y` and `--wr-density-x` scale control padding, `--wr-density-gap` the gaps in layout components. `--wr-density-text` is for your own `calc()`.',
      type: 'CSS custom property',
      default: '1',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Theming',
      url: ['/guides', 'theming'],
    },
    {
      kind: 'Service',
      title: 'WrTheme',
      url: ['/reference/services', 'theme'],
    },
  ];
}
