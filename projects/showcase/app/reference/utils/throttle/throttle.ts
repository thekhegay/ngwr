import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-throttle-page',
  templateUrl: './throttle.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class ThrottlePage {
  protected readonly snippet = `import { throttle } from 'ngwr/utils';

const onScroll = throttle(() => trackScroll(), 100);
window.addEventListener('scroll', onScroll);
destroyRef.onDestroy(() => onScroll.cancel());`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'throttle(fn, waitMs)',
      description:
        'Returns a wrapper that calls `fn` at most every `waitMs`, on the leading and trailing edge. `.cancel()` drops a pending call.',
      type: '(fn, ms) => WrThrottledFn',
      default: '—',
    },
  ];
}
