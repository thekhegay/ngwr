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
  imports: [WrAffix, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class AffixPage {
  protected readonly affixed = signal(false);

  protected readonly snippets = {
    install: `import { WrAffix } from 'ngwr/affix';`,
    usage: `<header wrAffix [wrAffixOffsetTop]="0" (wrAffixChange)="onAffix($event)">
  …
</header>`,
    scss: `/* Style the stuck state via the .wr-affix--active modifier */
header.wr-affix--active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  background: var(--wr-color-white);
}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrAffix]',
      description:
        'Apply to any element. Adds `position: sticky` + an IntersectionObserver sentinel that toggles `wr-affix--active` while the element is pinned.',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrAffixOffsetTop]',
      description:
        'Pixels from the top of the scroll container when stuck. Drives both `style.top` and the observer threshold.',
      type: 'number',
      default: '0',
    },
    {
      name: '(wrAffixChange)',
      description: 'Emits `true` on stick, `false` on release.',
      type: 'EventEmitter<boolean>',
      default: '—',
    },
    {
      name: '.wr-affix--active',
      description: 'Class added to the host while pinned. Hook your active-state styles here.',
      type: 'class',
      default: '—',
    },
  ];
}
