import { ChangeDetectionStrategy, Component } from '@angular/core';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class DebouncePage {
  protected readonly snippet = `import { debounce } from 'ngwr/utils';

const onResize = debounce(() => recalcLayout(), 150);
window.addEventListener('resize', onResize);

// Cancel any pending invocation on teardown:
onResize.cancel();`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'debounce(fn, waitMs)',
      description: 'Returns a wrapper that fires `fn` only once `waitMs` has elapsed without further calls. The wrapper exposes a `.cancel()` method for cleanup.',
      type: '(fn, ms) => WrDebouncedFn',
      default: '—',
    },
  ];
}
