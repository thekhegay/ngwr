import { ChangeDetectionStrategy, Component } from '@angular/core';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class ResolveCssSizePage {
  protected readonly snippet = `import { resolveCssSize } from 'ngwr/utils';

resolveCssSize(48);       // { cssValue: '48px',  pxValue: 48 }
resolveCssSize('3rem');   // { cssValue: '3rem',  pxValue: 3 * rootFont }
resolveCssSize('80%');    // { cssValue: '80%',   pxValue: null }
resolveCssSize(null, { defaultValue: '6rem' }); // falls back`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'resolveCssSize(raw, options?)',
      description: 'Resolves number / "12px" / "3rem" / "80%" to a CSS value + pixel equivalent (when computable).',
      type: '(raw, options?) => ResolvedCssSize',
      default: '—',
    },
    {
      name: 'ResolvedCssSize',
      description: 'Return shape: `{ cssValue: string; pxValue: number | null }`.',
      type: 'type',
      default: '—',
    },
    {
      name: 'ResolveCssSizeOptions',
      description: '`{ defaultValue?: unknown }` — used when raw is null/undefined.',
      type: 'type',
      default: '—',
    },
  ];
}
