import { Component, signal } from '@angular/core';

import { WrAffix } from 'ngwr/affix';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-affix-page',
  templateUrl: './affix.html',
  styleUrl: './affix.scss',
  imports: [WrAffix, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class AffixPage {
  protected readonly affixed = signal(false);

  protected readonly snippets = {
    usage: `<header wrAffix [wrAffixOffsetTop]="0" (wrAffixChange)="onAffix($event)">
  …
</header>`,
    scss: `header.wr-affix.wr-affix--active {
  box-shadow: var(--wr-shadow-sm);
  background: var(--wr-color-surface);
}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrAffix]',
      description: 'Makes the host sticky and adds `wr-affix--active` while it is pinned.',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrAffixOffsetTop]',
      description: 'Pixels from the top of the scroll container when stuck.',
      type: 'number',
      default: '0',
    },
    {
      name: '(wrAffixChange)',
      description: 'Emits `true` on stick and `false` on release.',
      type: 'boolean',
      default: '—',
    },
    {
      name: '.wr-affix',
      description: 'Always on the host. Sets `z-index: 10`; override it here to restack.',
      type: 'class',
      default: '—',
    },
    {
      name: '.wr-affix--active',
      description: 'On the host while pinned.',
      type: 'class',
      default: '—',
    },
  ];
}
