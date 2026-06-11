/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { Component, ViewEncapsulation, computed, input } from '@angular/core';

interface WrDonutSegment {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

const FALLBACK_COLORS = [
  'var(--wr-color-primary)',
  'var(--wr-color-secondary)',
  'var(--wr-color-success)',
  'var(--wr-color-warning)',
  'var(--wr-color-danger)',
  'var(--wr-color-medium)',
];

/**
 * Donut chart. Set `thickness` to 0 for a solid pie. Optional center
 * text via inputs.
 *
 * @example
 * ```html
 * <wr-donut-chart [segments]="[
 *   { label: 'Used', value: 60 },
 *   { label: 'Free', value: 40 }
 * ]" centerLabel="Disk" centerValue="60%" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/donut-chart
 */
@Component({
  selector: 'wr-donut-chart',
  templateUrl: './donut-chart.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-donut-chart' },
})
export class WrDonutChart {
  readonly segments = input<readonly WrDonutSegment[]>([]);

  /** Diameter in CSS pixels. @default 200 */
  readonly size = input(200, { transform: (v: unknown): number => Math.max(48, coerceNumberProperty(v, 200)) });

  /** Inner-ring thickness as a percent of radius (0–100). `0` = solid pie. @default 30 */
  readonly thickness = input(30, {
    transform: (v: unknown): number => Math.min(100, Math.max(0, coerceNumberProperty(v, 30))),
  });

  /** Show the legend under the chart. @default true */
  readonly showLegend = input(true, { transform: coerceBooleanProperty });

  /** Bold value text in the center. */
  readonly centerValue = input<string>('');

  /** Smaller label under the value. */
  readonly centerLabel = input<string>('');

  // Drawn in a 100×100 viewBox.
  private readonly outerR = 50;

  protected readonly innerR = computed(() => this.outerR * (1 - this.thickness() / 100));

  protected readonly total = computed(() => {
    const sum = this.segments().reduce((acc, s) => acc + Math.max(0, s.value), 0);
    return sum > 0 ? sum : 1;
  });

  /** Resolved slices ready for the template — each carries its arc path. */
  protected readonly slices = computed(() => {
    const total = this.total();
    let cumulative = 0;
    return this.segments().map((s, i) => {
      const value = Math.max(0, s.value);
      const startAngle = (cumulative / total) * Math.PI * 2;
      cumulative += value;
      const endAngle = (cumulative / total) * Math.PI * 2;
      return {
        label: s.label,
        value,
        color: s.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        path: this.arcPath(startAngle, endAngle),
        percent: (value / total) * 100,
      };
    });
  });

  // Helpers

  /** SVG path for one donut slice using outer and inner arcs. */
  private arcPath(start: number, end: number): string {
    const cx = 50;
    const cy = 50;
    const ro = this.outerR;
    const ri = this.innerR();
    const sweep = end - start;
    if (sweep <= 0) return '';
    // Full-circle slice — two halves so the arc can render.
    if (sweep >= Math.PI * 2 - 1e-6) {
      const path = [
        `M ${cx + ro} ${cy}`,
        `A ${ro} ${ro} 0 1 1 ${cx - ro} ${cy}`,
        `A ${ro} ${ro} 0 1 1 ${cx + ro} ${cy}`,
      ];
      if (ri > 0) {
        path.push(`M ${cx + ri} ${cy}`, `A ${ri} ${ri} 0 1 0 ${cx - ri} ${cy}`, `A ${ri} ${ri} 0 1 0 ${cx + ri} ${cy}`);
      }
      return path.join(' ');
    }
    const largeArc = sweep > Math.PI ? 1 : 0;
    const sox = cx + ro * Math.cos(start);
    const soy = cy + ro * Math.sin(start);
    const eox = cx + ro * Math.cos(end);
    const eoy = cy + ro * Math.sin(end);
    if (ri === 0) {
      return `M ${cx} ${cy} L ${sox.toFixed(2)} ${soy.toFixed(2)} A ${ro} ${ro} 0 ${largeArc} 1 ${eox.toFixed(2)} ${eoy.toFixed(2)} Z`;
    }
    const eix = cx + ri * Math.cos(end);
    const eiy = cy + ri * Math.sin(end);
    const six = cx + ri * Math.cos(start);
    const siy = cy + ri * Math.sin(start);
    return [
      `M ${sox.toFixed(2)} ${soy.toFixed(2)}`,
      `A ${ro} ${ro} 0 ${largeArc} 1 ${eox.toFixed(2)} ${eoy.toFixed(2)}`,
      `L ${eix.toFixed(2)} ${eiy.toFixed(2)}`,
      `A ${ri} ${ri} 0 ${largeArc} 0 ${six.toFixed(2)} ${siy.toFixed(2)}`,
      'Z',
    ].join(' ');
  }
}

export type { WrDonutSegment };
