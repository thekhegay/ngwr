import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrBarChart } from 'ngwr/bar-chart';
import { WrCalendarHeatmap, type WrHeatmapDatum } from 'ngwr/calendar-heatmap';
import { WrDonutChart } from 'ngwr/donut-chart';
import { WrGauge } from 'ngwr/gauge';
import { WrLineChart } from 'ngwr/line-chart';
import { WrSparkline } from 'ngwr/sparkline';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

function makeHeatmap(): readonly WrHeatmapDatum[] {
  const out: WrHeatmapDatum[] = [];
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (Math.random() > 0.3) out.push({ date: d, value: Math.round(Math.random() * 8) });
  }
  return out;
}

@Component({
  selector: 'ngwr-charts-page',
  templateUrl: './charts.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrSparkline,
    WrGauge,
    WrBarChart,
    WrDonutChart,
    WrLineChart,
    WrCalendarHeatmap,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class ChartsPageComponent {
  protected readonly sparklineData = [12, 18, 9, 22, 30, 25, 27, 35, 32, 41, 38, 45];

  protected readonly bars = [
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 18, color: 'var(--wr-color-success)' },
    { label: 'Wed', value: 9 },
    { label: 'Thu', value: 24, color: 'var(--wr-color-warning)' },
    { label: 'Fri', value: 17 },
    { label: 'Sat', value: 6 },
    { label: 'Sun', value: 11 },
  ];

  protected readonly donutSegments = [
    { label: 'Used', value: 60 },
    { label: 'Reserved', value: 25 },
    { label: 'Free', value: 15 },
  ];

  protected readonly lineSeries = [
    { label: 'Visits', data: [12, 18, 9, 22, 30, 27, 35] },
    { label: 'Signups', data: [3, 5, 4, 8, 11, 9, 14], color: 'var(--wr-color-success)' },
  ];

  protected readonly xLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  protected readonly heatmap = makeHeatmap();

  protected readonly snippets = {
    sparkline: `<wr-sparkline [data]="[12, 14, 9, 17, 21, 18, 23]" [showArea]="true" />`,
    gauge: `<wr-gauge [value]="72" suffix="%" />`,
    bar: `<wr-bar-chart [data]="bars" />`,
    donut: `<wr-donut-chart [segments]="segments" centerLabel="Disk" centerValue="60%" />`,
    line: `<wr-line-chart [series]="series" [xLabels]="labels" />`,
    heatmap: `<wr-calendar-heatmap [data]="contributions" />`,
  };
}
