import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-resolve-css-size-page',
  templateUrl: './resolve-css-size.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class ResolveCssSizePage {
  protected readonly snippet = `import { resolveCssSize } from 'ngwr/utils';

resolveCssSize(48);       // { cssValue: '48px',  pxValue: 48 }
resolveCssSize('3rem');   // { cssValue: '3rem',  pxValue: 3 * rootFont }
resolveCssSize('80%');    // { cssValue: '80%',   pxValue: null }
resolveCssSize(null, { defaultValue: '6rem' }); // uses the default`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'resolveCssSize(raw, options?)',
      description: 'Resolves `48`, `"12px"`, `"3rem"` or `"80%"` to a CSS value and, when it can, pixels.',
      type: '(raw, options?) => ResolvedCssSize',
      default: '—',
    },
    {
      name: 'ResolvedCssSize',
      description: 'Return shape: `{ cssValue: string; pxValue: number | null }`.',
      type: 'interface',
      default: '—',
    },
    {
      name: 'ResolveCssSizeOptions',
      description: '`{ defaultValue?: unknown }`, used when `raw` is `null` or `undefined`.',
      type: 'interface',
      default: '—',
    },
  ];
}
