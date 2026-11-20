import { Component, signal } from '@angular/core';

import { WrInView } from 'ngwr/directives';

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
  selector: 'ngwr-in-view-page',
  templateUrl: './in-view.html',
  imports: [
    WrInView,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class InViewPage {
  protected readonly seen = signal(false);

  protected readonly snippets = {
    usage: `<section (wrInView)="seen.set($event)" [wrInViewThreshold]="0.5">…</section>

<img wrInViewOnce (wrInView)="track()" src="hero.webp" alt="" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '(wrInView)',
      description: '`true` when the host enters the viewport, `false` when it leaves. Fires on a change only.',
      type: 'boolean',
    },
    {
      name: '[wrInViewThreshold]',
      description: 'Share of the host, from 0 to 1, that must be visible. Read once, on first render.',
      type: 'number',
      default: '0',
    },
    {
      name: '[wrInViewOnce]',
      description: 'Stop watching after the first entry.',
      type: 'boolean',
      default: 'false',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'Counter',
      url: ['/reference/components', 'counter'],
      description: '`wr-count-up` can wait for its number to scroll into view.',
    },
  ];
}
