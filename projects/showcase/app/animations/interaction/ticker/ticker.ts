import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrTicker, type WrTickerItem } from 'ngwr/animations/ticker';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';
import { ROUTES, wrPath } from '#routes';

@Component({
  selector: 'ngwr-ticker-page',
  templateUrl: './ticker.html',
  imports: [
    WrTicker,
    RouterLink,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TickerPageComponent {
  /** The text effects, as the pages that document them. */
  protected readonly items: readonly WrTickerItem[] = [
    ROUTES.animations.blurReveal,
    ROUTES.animations.circleText,
    ROUTES.animations.decode,
    ROUTES.animations.fallingLetters,
    ROUTES.animations.glitch,
    ROUTES.animations.gradientFlow,
    ROUTES.animations.letterStagger,
    ROUTES.animations.noiseText,
    ROUTES.animations.shine,
    ROUTES.animations.typewriter,
    ROUTES.animations.wordRotator,
  ].map(node => ({ title: node.title, url: wrPath(ROUTES.animations, node) }));

  protected readonly snippets = {
    basic: `<wr-ticker [items]="items" label="Components" />`,
    items: `protected readonly items: WrTickerItem[] = [
  { title: 'Button', url: '/reference/components/button' },
  { title: 'Select', url: '/reference/components/select' },
];`,
    router: `<wr-ticker [items]="items" label="Components">
  <ng-template let-item>
    <a class="wr-ticker__link" [routerLink]="item.url">{{ item.title }}</a>
  </ng-template>
</wr-ticker>`,
    speed: `<wr-ticker [items]="items" label="Components" speed="90" />`,
    labels: `<wr-ticker [items]="items" label="Components" pauseLabel="Hold the row" playLabel="Let it run" />`,
  };

  protected readonly api = API.WrTicker;
}
