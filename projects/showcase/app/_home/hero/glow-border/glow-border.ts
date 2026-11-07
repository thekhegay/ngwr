import { isPlatformBrowser } from '@angular/common';
import { Directive, PLATFORM_ID, computed, inject, input } from '@angular/core';

import { WrPlatform } from 'ngwr/platform';

/**
 * A short arc of brand light that runs round the host's edge for ever, with a
 * soft glow spilling outward. CSS does all of it (`glow-border.scss`, loaded by
 * the host component): this class only decides whether the arc turns. It stays
 * lit but still under `prefers-reduced-motion: reduce`, while the tab is
 * hidden and on the server. The host needs `position: relative`; `wr-btn` has
 * it. The host's own hover and focus states are untouched, and its focus ring
 * paints above the arc.
 */
@Directive({
  selector: '[ngwrGlowBorder]',
  host: {
    class: 'ngwr-glow-border',
    '[class.ngwr-glow-border--live]': 'live()',
  },
})
export class GlowBorder {
  /** Stops the arc without removing the directive. @default true */
  readonly active = input(true);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly platform = inject(WrPlatform);

  protected readonly live = computed(
    () => this.isBrowser && this.active() && !this.platform.prefersReducedMotion() && this.platform.pageVisible()
  );
}
