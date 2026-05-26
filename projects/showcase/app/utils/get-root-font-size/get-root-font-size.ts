import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-get-root-font-size-page',
  templateUrl: './get-root-font-size.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class GetRootFontSizePage {
  protected readonly snippet = `import { getRootFontSize } from 'ngwr/utils';

const px = getRootFontSize();   // e.g. 16
const remToPx = 2 * px;          // convert '2rem' to pixels`;

  protected readonly whySnippet = `// Native — verbose, easy to typo \`body\` instead of \`documentElement\`,
// and crashes on SSR where \`document\` is undefined.
const px = parseFloat(getComputedStyle(document.documentElement).fontSize);

// ngwr — one call, SSR-safe (returns a sensible 16 when document isn't available).
const px = getRootFontSize();`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'getRootFontSize()',
      description: 'Pixel value of `:root` font-size. Useful for converting rem-based inputs to px in TS.',
      type: '() => number',
      default: '—',
    },
  ];
}
