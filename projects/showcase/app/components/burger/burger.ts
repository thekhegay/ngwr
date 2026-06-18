import { Component, signal } from '@angular/core';

import { WrBurger } from 'ngwr/burger';
import { WrDrawer } from 'ngwr/drawer';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-burger-page',
  templateUrl: './burger.html',
  imports: [
    WrBurger,
    WrDrawer,
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocSnippetComponent,
    DocApiComponent,
  ],
})
export default class BurgerPage {
  protected readonly open = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly disabledOpen = signal(false);

  protected readonly basicSnippet = `<wr-burger [(open)]="menuOpen" />`;

  protected readonly drawerSnippet = `<wr-burger [(open)]="menuOpen" />

<wr-drawer [(open)]="menuOpen" position="right" width="16rem">
  <!-- nav links… -->
</wr-drawer>`;

  protected readonly stylingSnippet = `<wr-burger
  [(open)]="menuOpen"
  style="--wr-burger-size: 3rem; --wr-burger-color-opened: var(--wr-color-danger);"
/>`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'open',
      description: 'Two-way bindable open state. Drives the hamburger ↔ close morph.',
      type: 'model<boolean>',
      default: 'false',
    },
    { name: 'label', description: 'Accessible label for the toggle button.', type: 'string', default: "'Toggle menu'" },
    { name: 'disabled', description: 'Disable the toggle.', type: 'boolean', default: 'false' },
  ];

  protected readonly tokens: readonly DocApiRow[] = [
    { name: '--wr-burger-size', description: 'Button square size.', type: 'length', default: '2.5rem' },
    { name: '--wr-burger-color', description: 'Resting stroke color.', type: 'color', default: 'var(--wr-color-dark)' },
    {
      name: '--wr-burger-color-opened',
      description: 'Stroke color when open.',
      type: 'color',
      default: 'var(--wr-color-primary)',
    },
    { name: '--wr-burger-stroke-width', description: 'Line thickness.', type: 'length', default: '6px' },
    { name: '--wr-burger-duration', description: 'Morph duration.', type: 'time', default: '0.5s' },
  ];
}
