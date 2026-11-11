import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-get-root-font-size-page',
  templateUrl: './wr-get-root-font-size.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrGetRootFontSizePage {
  protected readonly snippet = `import { wrGetRootFontSize } from 'ngwr/utils';

const px = wrGetRootFontSize();         // e.g. 16
const remToPx = 2 * px;               // '2rem' in pixels
const onServer = wrGetRootFontSize(14); // 14 when there is no DOM`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrGetRootFontSize(fallback?)',
      description:
        'The `:root` font size in pixels. Returns `fallback` on the server or when the value does not parse.',
      type: '(fallback = 16) => number',
      default: '—',
    },
  ];
}
