import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-debounce-page',
  templateUrl: './debounce.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class DebouncePage {
  protected readonly snippet = `import { debounce } from 'ngwr/utils';

const onResize = debounce(() => recalcLayout(), 150);
window.addEventListener('resize', onResize);
destroyRef.onDestroy(() => onResize.cancel());`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'debounce(fn, waitMs)',
      description:
        'Returns a wrapper that calls `fn` once `waitMs` pass with no new call. `.cancel()` drops a pending call.',
      type: '(fn, ms) => WrDebouncedFn',
      default: '—',
    },
  ];
}
