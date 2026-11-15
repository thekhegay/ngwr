/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Component, type Signal, ViewEncapsulation, computed, input } from '@angular/core';

import { useI18nText } from 'ngwr/i18n';

/**
 * What a chart shows in place of its marks.
 *
 * @internal
 */
export type WrChartStateKind = 'empty' | 'loading' | 'error';

/**
 * The state a chart is in, with the message it shows for it.
 *
 * @internal
 */
export interface WrChartStateView {
  readonly kind: WrChartStateKind;
  readonly label: string;
}

/**
 * The inputs a chart hands {@link useChartState}.
 *
 * @internal
 */
export interface WrChartStateOptions {
  /** The chart's `loading` input. */
  readonly loading: Signal<boolean>;
  /** The chart's `error` input. */
  readonly error: Signal<boolean>;
  /** Whether the chart has nothing to draw. */
  readonly empty: Signal<boolean>;
  /** The chart's `emptyLabel`, `loadingLabel` and `errorLabel` inputs: `null` takes the catalog's. */
  readonly emptyLabel: Signal<string | null>;
  readonly loadingLabel: Signal<string | null>;
  readonly errorLabel: Signal<string | null>;
}

/**
 * The state a chart shows instead of its marks, or `null` while it draws them: loading
 * first, then a failed load, then no data. Each message is the chart's own `*Label`
 * input, then the catalog's `chart.loading` / `chart.error` / `chart.empty`, then
 * English. Call in an injection context.
 *
 * One rule for every chart, so a dashboard whose requests are in flight reads the same
 * in every tile, and a chart with no data is a framed "No data" rather than a blank box
 * of whatever height its markup collapses to.
 *
 * @internal
 */
export function useChartState(options: WrChartStateOptions): Signal<WrChartStateView | null> {
  const loading = useI18nText(options.loadingLabel, 'chart.loading', 'Loading…');
  const error = useI18nText(options.errorLabel, 'chart.error', 'Could not load');
  const empty = useI18nText(options.emptyLabel, 'chart.empty', 'No data');
  return computed<WrChartStateView | null>(() => {
    if (options.loading()) return { kind: 'loading', label: loading() };
    if (options.error()) return { kind: 'error', label: error() };
    if (options.empty()) return { kind: 'empty', label: empty() };
    return null;
  });
}

/**
 * The message a chart shows in place of its marks, centred over the frame it keeps.
 *
 * A live region: `role="status"`, so a screen reader hears "Loading…" when a chart
 * starts a request and "No data" when it comes back with none, without the chart taking
 * focus. A failed load is `role="alert"`, which interrupts, since it is the one of the
 * three a reader has to act on. The chart renders it inside the box its marks are drawn
 * in, which it positions; the grid and the axis under it stay.
 *
 * @example
 * ```html
 * @if (state(); as shown) {
 *   <wr-chart-state [kind]="shown.kind" [label]="shown.label" />
 * }
 * ```
 *
 * @internal
 */
@Component({
  selector: 'wr-chart-state',
  templateUrl: './chart-state.html',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'wr-chart-state',
    '[class.wr-chart-state--empty]': "kind() === 'empty'",
    '[class.wr-chart-state--loading]': "kind() === 'loading'",
    '[class.wr-chart-state--error]': "kind() === 'error'",
    '[attr.role]': "kind() === 'error' ? 'alert' : 'status'",
  },
})
export class WrChartState {
  /** Which of the three states this is. */
  readonly kind = input.required<WrChartStateKind>();

  /** The message, already translated. */
  readonly label = input.required<string>();
}
