import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-resolve-css-size-page',
  templateUrl: './wr-resolve-css-size.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrResolveCssSizePage {
  protected readonly snippet = `import { wrResolveCssSize } from 'ngwr/utils';

wrResolveCssSize(48);       // { cssValue: '48px',  pxValue: 48 }
wrResolveCssSize('3rem');   // { cssValue: '3rem',  pxValue: 3 * rootFont }
wrResolveCssSize('80%');    // { cssValue: '80%',   pxValue: null }
wrResolveCssSize(null, { defaultValue: '6rem' }); // uses the default`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrResolveCssSize(raw, options?)',
      description: 'Resolves `48`, `"12px"`, `"3rem"` or `"80%"` to a CSS value and, when it can, pixels.',
      type: '(raw, options?) => WrResolvedCssSize',
      default: '—',
    },
    {
      name: 'WrResolvedCssSize',
      description: 'Return shape: `{ cssValue: string; pxValue: number | null }`.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'WrResolveCssSizeOptions',
      description: '`{ defaultValue?: unknown }`, used when `raw` is `null` or `undefined`.',
      type: 'interface',
      default: '—',
    },
  ];
}
