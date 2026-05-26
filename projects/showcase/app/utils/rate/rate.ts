import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-rate-page',
  templateUrl: './rate.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class RatePage {
  protected readonly snippet = `import { debounce, throttle } from 'ngwr/utils';

const onResize = debounce(() => recalcLayout(), 150);
const onScroll = throttle(() => trackScroll(), 100);
onResize.cancel();  // both expose cancel()`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'debounce(fn, waitMs)',
      description: 'Fires `fn` once `waitMs` after the last call. Returns the wrapper + `.cancel()`.',
      type: '(fn, ms) => WrDebouncedFn',
      default: '—',
    },
    {
      name: 'throttle(fn, waitMs)',
      description: 'Fires `fn` at most every `waitMs` (leading + trailing edge). Returns the wrapper + `.cancel()`.',
      type: '(fn, ms) => WrThrottledFn',
      default: '—',
    },
  ];
}
