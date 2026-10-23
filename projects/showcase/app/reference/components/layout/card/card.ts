import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrCard, WrCardFooter, WrCardHeader } from 'ngwr/card';

import {
  type DocApiRow,
  DocApiComponent,
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
    basic: `<wr-card>
  <wr-card-header>
    <h3>Settings</h3>
  </wr-card-header>
  <p>Body content.</p>
  <wr-card-footer>
    <button wr-btn type="button" color="primary">Save</button>
  </wr-card-footer>
</wr-card>`,

    bare: `<wr-card>
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
      description: 'Lift and shadow on hover, pointer cursor.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'loading',
      description: 'Spinner over a dimmed body. Sets `aria-busy`.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'compact', description: 'Half the padding.', type: 'boolean', default: 'false' },
    {
      name: '<wr-card-header>',
      description: 'Header slot (`.wr-card__header`).',
      type: 'component',
      default: '—',
    },
    {
      name: '<wr-card-footer>',
      description: 'Footer slot (`.wr-card__footer`).',
      type: 'component',
      default: '—',
    },
  ];
}
