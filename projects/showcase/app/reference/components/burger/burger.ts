import { Component, signal } from '@angular/core';

import { WrBurger } from 'ngwr/burger';
import { WrDrawer } from 'ngwr/drawer';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

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

  protected readonly api = API.WrBurger;
}
