import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrMarquee, type WrMarqueeItem } from 'ngwr/animations/marquee';
import { WrIcon, provideWrIcons } from 'ngwr/icon';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';
import { BRAND_ICONS } from '#core/icons';
import { ROUTES, wrPath } from '#routes';

/** A marquee item with the icon drawn before its name. */
interface Logo extends WrMarqueeItem {
  readonly icon: string;
}

@Component({
  selector: 'ngwr-marquee-page',
  templateUrl: './marquee.html',
  imports: [
    WrMarquee,
    WrIcon,
    RouterLink,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [provideWrIcons([...BRAND_ICONS])],
})
export default class MarqueePageComponent {
  /** The text effects, as the pages that document them. */
  protected readonly items: readonly WrMarqueeItem[] = [
    ROUTES.animations.blurReveal,
    ROUTES.animations.orbit,
    ROUTES.animations.decode,
    ROUTES.animations.fallingLetters,
    ROUTES.animations.glitch,
    ROUTES.animations.gradientFlow,
    ROUTES.animations.reveal,
    ROUTES.animations.destruct,
    ROUTES.animations.shine,
    ROUTES.animations.typewriter,
    ROUTES.animations.rotateReveal,
  ].map(node => ({ title: node.title, url: wrPath(ROUTES.animations, node) }));

  /** The marks this site registers, as a row of logos. */
  protected readonly logos: readonly Logo[] = [
    { title: 'Angular', url: 'https://angular.dev', icon: 'logo-angular' },
    { title: 'ngwr', url: 'https://ngwr.dev', icon: 'ngwr' },
    { title: 'GitHub', url: 'https://github.com/thekhegay/ngwr', icon: 'github' },
    { title: 'npm', url: 'https://www.npmjs.com/package/ngwr', icon: 'npm' },
    { title: 'StackBlitz', url: 'https://stackblitz.com', icon: 'stackblitz' },
    { title: 'Algolia', url: 'https://www.algolia.com', icon: 'algolia' },
  ];

  protected readonly snippets = {
    basic: `<wr-marquee [items]="items" label="Components" />`,
    items: `protected readonly items: WrMarqueeItem[] = [
  { title: 'Button', url: '/reference/components/button' },
  { title: 'Select', url: '/reference/components/select' },
];`,
    router: `<wr-marquee [items]="items" label="Components">
  <ng-template let-item>
    <a class="wr-marquee__link" [routerLink]="item.url">{{ item.title }}</a>
  </ng-template>
</wr-marquee>`,
    icons: `<wr-marquee [items]="logos" label="Built with">
  <ng-template let-item>
    <a class="wr-marquee__link" [href]="item.url"><wr-icon [name]="item.icon" />{{ item.title }}</a>
  </ng-template>
</wr-marquee>`,
    speed: `<wr-marquee [items]="items" label="Components" speed="90" />`,
    labels: `<wr-marquee [items]="items" label="Components" pauseLabel="Hold the row" playLabel="Let it run" />`,
  };

  protected readonly api = API.WrMarquee;
}
