/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, InjectionToken, ViewEncapsulation, computed, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { readI18nText, useI18nFormatter } from 'ngwr/i18n';

import type { WrTourStep } from './interfaces';

/** What the popup needs from the running tour, without importing the service (cycle). */
export interface WrTourController {
  readonly index: () => number;
  readonly total: () => number;
  readonly step: () => WrTourStep | null;
  /**
   * Whether this is the last step the user will actually see — the service looks
   * ahead for a reachable one, because a trailing step whose target is missing gets
   * skipped and the raw count would call the final card "Next".
   */
  readonly isLast: () => boolean;
  /**
   * Whether this is the first step the user will actually see — the service looks
   * BEHIND for a reachable one, for the mirror reason: a leading step whose target
   * is missing gets skipped, so the tour opens on a later index and the raw one
   * would put a Back button on the very first card.
   */
  readonly isFirst: () => boolean;
  next(): void;
  prev(): void;
  stop(): void;
}

/** Provided by `WrTour` when it attaches the popup portal. */
export const WR_TOUR_STEP = new InjectionToken<WrTourController>('WR_TOUR_STEP');

/**
 * The card a tour shows next to the spotlit element. Rendered by `WrTour` into
 * a CDK overlay — not something you place yourself.
 *
 * @see https://ngwr.dev/reference/services/tour
 */
@Component({
  selector: 'wr-tour-popup',
  templateUrl: './tour-popup.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-tour-popup', role: 'dialog', 'aria-modal': 'true', '[attr.aria-label]': 'ariaLabel()' },
  imports: [WrButton],
})
export class WrTourPopup {
  protected readonly tour = inject(WR_TOUR_STEP);

  // `readI18nText`, not `useI18nText`: these have no consumer-facing input to
  // forward. Both helpers are reactive.
  protected readonly nextLabel = readI18nText('tour.next', 'Next');
  protected readonly backLabel = readI18nText('tour.back', 'Back');
  protected readonly doneLabel = readI18nText('tour.done', 'Done');
  protected readonly skipLabel = readI18nText('tour.skip', 'Skip tour');

  /** `Step {{current}} of {{total}}` — also the dialog's accessible name. */
  protected readonly progress = useI18nFormatter('tour.progress', 'Step {{current}} of {{total}}');

  // From the service, not `index() >= total() - 1`: a trailing step whose target is
  // missing gets skipped, so the raw count called the final card "Next" and then
  // ended the tour when it was pressed.
  protected readonly isLast = computed(() => this.tour.isLast());
  // Same story at the other end, and the same fix: `index() <= 0` rendered a Back
  // button on the first card of a tour whose leading step had been skipped, and
  // `prev()` walks off the start and returns — so the button did nothing at all.
  protected readonly isFirst = computed(() => this.tour.isFirst());

  protected readonly progressText = computed(() =>
    this.progress({ current: this.tour.index() + 1, total: this.tour.total() })
  );

  protected readonly ariaLabel = computed(() => {
    const title = this.tour.step()?.title;
    return title ? `${title} — ${this.progressText()}` : this.progressText();
  });
}
