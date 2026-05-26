import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-misc-page',
  templateUrl: './misc.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class MiscUtilPageComponent {
  protected readonly snippets = {
    noop: `import { noop } from 'ngwr/utils';

class MyService {
  private onChange: (v: string) => void = noop;
}`,
    rate: `import { debounce, throttle } from 'ngwr/utils';

const onResize = debounce(() => recalcLayout(), 150);
const onScroll = throttle(() => trackScroll(), 100);
onResize.cancel();  // both expose cancel()`,
    log: `import { badgeLog } from 'ngwr/utils';

badgeLog('SAVED', '#10b981', 'profile updated');
// → renders a styled badge in the devtools console`,
    focus: `import { getFocusableElements, trapFocus } from 'ngwr/utils';

const els = getFocusableElements(rootEl);  // ordered focusables
@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  trapFocus(rootEl, e); // cycles Tab inside rootEl
}`,
  };

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
      type: '(badge, color, message) => void',
      default: '—',
    },
  ];

  protected readonly rateApi: readonly DocApiRow[] = [
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

  protected readonly focusApi: readonly DocApiRow[] = [
    {
      name: 'getFocusableElements(root)',
      description: 'Every focusable descendant in DOM order, visibility-filtered.',
      type: '(root: HTMLElement) => readonly HTMLElement[]',
      default: '—',
    },
    {
      name: 'trapFocus(root, event)',
      description: 'Cycle Tab focus inside `root` — call from a keydown handler. Returns true when handled.',
      type: '(root, e) => boolean',
      default: '—',
    },
  ];
}
