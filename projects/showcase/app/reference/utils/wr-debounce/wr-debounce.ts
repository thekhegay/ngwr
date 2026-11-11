import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-debounce-page',
  templateUrl: './wr-debounce.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrDebouncePage {
  protected readonly snippet = `import { wrDebounce } from 'ngwr/utils';

const onResize = wrDebounce(() => recalcLayout(), 150);
window.addEventListener('resize', onResize);
destroyRef.onDestroy(() => onResize.cancel());`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrDebounce(fn, waitMs)',
      description:
        'Returns a wrapper that calls `fn` once `waitMs` pass with no new call. `.cancel()` drops a pending call.',
      type: '(fn, ms) => WrDebouncedFn',
      default: '—',
    },
  ];
}
