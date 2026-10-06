import { Component, ViewEncapsulation, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { type WrBarChartDatum, WrBarChart } from 'ngwr/charts/bar-chart';
import { type WrHeatmapDatum, WrCalendarHeatmap } from 'ngwr/charts/calendar-heatmap';
import { type WrDonutSegment, WrDonutChart } from 'ngwr/charts/donut-chart';
import { WrGauge } from 'ngwr/charts/gauge';
import { type WrLineSeries, WrLineChart } from 'ngwr/charts/line-chart';
import { type WrMeterSegment, WrMeterGroup } from 'ngwr/charts/meter-group';
import { WrSparkline } from 'ngwr/charts/sparkline';
import { WrIcon } from 'ngwr/icon';
import { WrTheme } from 'ngwr/theme';

/** The sandbox host. Everything below is a docs snippet, copied as written. */
@Component({
  selector: 'sbx-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [
    WrBarChart,
    WrButton,
    WrCalendarHeatmap,
    WrDonutChart,
    WrGauge,
    WrIcon,
    WrLineChart,
    WrMeterGroup,
    WrSparkline,
  ],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);

  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }

  protected readonly bars: readonly WrBarChartDatum[] = [
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 19 },
    { label: 'Wed', value: 7 },
    { label: 'Thu', value: 24 },
    { label: 'Fri', value: 16 },
  ];

  protected readonly contributions: readonly WrHeatmapDatum[] = Array.from({ length: 120 }, (_, i) => {
    const d = new Date(2026, 5, 1);
    d.setDate(d.getDate() + i);
    return { date: d, value: (i * 7) % 9 };
  });

  protected readonly segments: readonly WrDonutSegment[] = [
    { label: 'Used', value: 60 },
    { label: 'Reserved', value: 25 },
    { label: 'Free', value: 15 },
  ];

  protected readonly series: readonly WrLineSeries[] = [
    { label: 'Visits', data: [12, 18, 9, 22, 30, 27, 35] },
    { label: 'Signups', data: [3, 5, 4, 8, 11, 9, 14] },
  ];
  protected readonly labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  protected readonly diskUsage: readonly WrMeterSegment[] = [
    { label: 'Used', value: 60 },
    { label: 'Reserved', value: 25, color: 'var(--wr-color-warning)' },
  ];

  protected readonly data = [12, 14, 9, 17, 21, 18, 23];
}
