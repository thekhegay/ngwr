import { ChangeDetectionStrategy, Component } from '@angular/core';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class ThrottlePage {
  protected readonly snippet = `import { throttle } from 'ngwr/utils';

const onScroll = throttle(() => trackScroll(), 100);
window.addEventListener('scroll', onScroll);

onScroll.cancel();   // teardown`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'throttle(fn, waitMs)',
      description: 'Returns a wrapper that fires `fn` at most every `waitMs` (leading and trailing edge). Exposes `.cancel()` for teardown.',
      type: '(fn, ms) => WrThrottledFn',
      default: '—',
    },
  ];
}
