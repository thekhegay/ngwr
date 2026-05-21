import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utils-page',
  templateUrl: './utils.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class UtilsPageComponent {
  protected readonly snippets = {
    install: `import { resolveCssSize, randomId, noop, isDefined } from 'ngwr/utils';`,
    cssSize: `import { resolveCssSize } from 'ngwr/utils';

resolveCssSize(48);       // { cssValue: '48px',  pxValue: 48 }
resolveCssSize('3rem');   // { cssValue: '3rem',  pxValue: 3 * rootFont }
resolveCssSize('80%');    // { cssValue: '80%',   pxValue: null }
resolveCssSize(null, { defaultValue: '6rem' }); // falls back`,
    randomId: `import { randomId } from 'ngwr/utils';

const id = randomId('wr-input'); // 'wr-input-h7m4k2'`,
    guards: `import { isDefined, isNonEmptyArray, isObservable } from 'ngwr/utils';

if (isDefined(value)) { /* value is T (not null | undefined) */ }
if (isNonEmptyArray(arr)) { /* arr has at least one element */ }
if (isObservable(input)) { /* input is Observable<unknown> */ }`,
    log: `import { badgeLog } from 'ngwr/utils';

badgeLog('SAVED', '#10b981', 'profile updated');
// → renders a styled badge in the devtools console`,
    noop: `import { noop } from 'ngwr/utils';

class MyService {
  private onChange: (v: string) => void = noop;
}`,
  };

  protected readonly cssSizeApi: readonly DocApiRow[] = [
    {
      name: 'resolveCssSize(raw, options?)',
      description: 'Resolves number / "12px" / "3rem" / "80%" to a CSS value + pixel equivalent (when computable).',
      type: '(raw, options?) => ResolvedCssSize',
      default: '—',
    },
    {
      name: 'ResolvedCssSize',
      description: 'Return shape: { cssValue: string; pxValue: number | null }.',
      type: 'type',
      default: '—',
    },
    {
      name: 'ResolveCssSizeOptions',
      description: '{ defaultValue?: unknown } — used when raw is null/undefined.',
      type: 'type',
      default: '—',
    },
    { name: 'getRootFontSize()', description: 'Pixel value of `:root` font-size.', type: '() => number', default: '—' },
  ];

  protected readonly idApi: readonly DocApiRow[] = [
    {
      name: 'randomId(prefix?)',
      description: 'Generates a stable random id like `wr-input-h7m4k2`.',
      type: '(prefix?: string) => string',
      default: '—',
    },
  ];

  protected readonly guardsApi: readonly DocApiRow[] = [
    {
      name: 'isDefined(v)',
      description: 'Narrows out `null` and `undefined`.',
      type: '(v: T | null | undefined) => v is T',
      default: '—',
    },
    {
      name: 'isNonEmptyArray(v)',
      description: 'Asserts an array has at least one element.',
      type: '(v: T[]) => v is [T, ...T[]]',
      default: '—',
    },
    {
      name: 'isObservable(v)',
      description: 'Detects an rxjs Observable.',
      type: '(v: unknown) => v is Observable<unknown>',
      default: '—',
    },
  ];

  protected readonly miscApi: readonly DocApiRow[] = [
    {
      name: 'noop()',
      description: 'No-op function. Use as default for required callback slots.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'badgeLog(badge, color, message)',
      description: 'Styled badge log to the browser console — quick dev signal.',
      type: '(badge: string, color: string, message: unknown) => void',
      default: '—',
    },
  ];

  protected readonly types: readonly DocApiRow[] = [
    { name: 'Maybe<T>', description: 'Shorthand for `T | null | undefined`.', type: 'type', default: '—' },
    {
      name: 'SafeAny',
      description: 'Aliased `any` for the rare unavoidable escape hatch. Audit at the call site.',
      type: 'type',
      default: '—',
    },
  ];
}
