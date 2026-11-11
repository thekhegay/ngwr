import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-wr-throttle-page',
  templateUrl: './wr-throttle.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class WrThrottlePage {
  protected readonly snippet = `import { wrThrottle } from 'ngwr/utils';

const onScroll = wrThrottle(() => trackScroll(), 100);
window.addEventListener('scroll', onScroll);
destroyRef.onDestroy(() => onScroll.cancel());`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrThrottle(fn, waitMs)',
      description:
        'Returns a wrapper that calls `fn` at most every `waitMs`, on the leading and trailing edge. `.cancel()` drops a pending call.',
      type: '(fn, ms) => WrThrottledFn',
      default: '—',
    },
  ];
}
