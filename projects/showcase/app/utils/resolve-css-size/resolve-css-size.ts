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

  protected readonly whySnippet = `// Native — you need to handle every shape yourself.
function pxForCss(raw: number | string | null): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  if (raw.endsWith('px')) return parseFloat(raw);
  if (raw.endsWith('rem')) {
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return parseFloat(raw) * root;
  }
  return null; // '%', 'vh', 'em', … ignored — bug surface
}

// ngwr — one call, returns both the CSS value and the px equivalent.
const { cssValue, pxValue } = resolveCssSize(raw);`;

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
