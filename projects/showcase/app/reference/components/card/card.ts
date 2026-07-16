import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrCard, WrCardFooter, WrCardHeader } from 'ngwr/card';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-card-page',
  templateUrl: './card.html',
  imports: [
    WrCard,
    WrCardHeader,
    WrCardFooter,
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class CardPage {
  protected readonly loading = signal(false);

  protected reload(): void {
    this.loading.set(true);
    setTimeout(() => this.loading.set(false), 1200);
  }

  protected readonly snippets = {
    install: `import { WrCard, WrCardHeader, WrCardFooter } from 'ngwr/card';

@Component({ imports: [WrCard, WrCardHeader, WrCardFooter] })
export class MyComponent {}`,

    basic: `<wr-card>
  <wr-card-header>
    <h3>Settings</h3>
  </wr-card-header>
  <p>Body content.</p>
  <wr-card-footer>
    <button wr-btn color="primary">Save</button>
  </wr-card-footer>
</wr-card>`,

    bare: `<!-- Header / footer slots are optional. -->
<wr-card>
  <p>Just a surface around content.</p>
</wr-card>`,

    variants: `<wr-card hoverable>Click me</wr-card>

<wr-card [bordered]="false">No border</wr-card>

<wr-card compact>Tighter paddings</wr-card>

<wr-card [loading]="reloading()">
  <p>Spinner overlay while data loads.</p>
</wr-card>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'bordered', description: '1px border around the surface.', type: 'boolean', default: 'true' },
    {
      name: 'hoverable',
      description: 'Lift + drop-shadow on hover. Also sets `cursor: pointer`.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'loading',
      description: 'Overlay with a centred spinner + dim body. Sets `aria-busy`.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'compact', description: 'Half-paddings for tight layouts.', type: 'boolean', default: 'false' },
    {
      name: '<wr-card-header>',
      description: 'Header slot. Projected content gets the `wr-card__header` BEM class.',
      type: 'directive',
      default: '—',
    },
    {
      name: '<wr-card-footer>',
      description: 'Footer slot. Projected content gets the `wr-card__footer` BEM class.',
      type: 'directive',
      default: '—',
    },
  ];
}
