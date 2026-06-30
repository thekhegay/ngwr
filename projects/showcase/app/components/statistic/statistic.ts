import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

import { WrStatistic, WrStatisticCountdown } from 'ngwr/statistic';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';

@Component({
  selector: 'ngwr-statistic-page',
  templateUrl: './statistic.html',
  imports: [
    WrStatistic,
    WrStatisticCountdown,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class StatisticPageComponent {
  protected readonly snippet = `<wr-statistic label="Active users" [value]="12345" />
<wr-statistic label="Revenue" [value]="9512" prefix="$" [delta]="12.4" />`;

  protected readonly countUpSnippet = `<wr-statistic label="Revenue" prefix="$" [value]="revenue()" [precision]="2" [delta]="delta()" />
<wr-statistic label="Sessions" [value]="sessions()" />

// numeric values count up from their previous value on every change.
protected readonly revenue = signal(9512.4);
protected readonly sessions = signal(48210);
protected readonly delta = signal(12.4);

constructor() {
  // Live dashboard — randomize on a timer so the values keep counting.
  const id = setInterval(() => {
    this.revenue.set(Math.round(Math.random() * 5_000_00) / 100);
    this.sessions.set(Math.floor(Math.random() * 90_000));
    this.delta.set(Math.round((Math.random() * 40 - 20) * 10) / 10);
  }, 2000);
  inject(DestroyRef).onDestroy(() => clearInterval(id));
}`;

  // Live count-up demo — a timer mutates these so the values tween on every tick.
  protected readonly revenue = signal(9512.4);
  protected readonly sessions = signal(48210);
  protected readonly delta = signal(12.4);

  constructor() {
    const id = setInterval(() => {
      this.revenue.set(Math.round(Math.random() * 5_000_00) / 100);
      this.sessions.set(Math.floor(Math.random() * 90_000));
      // Swing positive/negative so the up/down indicator flips green/red.
      this.delta.set(Math.round((Math.random() * 40 - 20) * 10) / 10);
    }, 2000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  protected readonly countdownSnippet = `<wr-statistic-countdown
  label="Launch in"
  [target]="launchDate"
  format="D days HH:mm:ss"
  (countdownEnd)="onLive()"
/>

protected readonly launchDate = new Date(Date.now() + 1000 * 60 * 60 * 36);`;

  // 36 hours out so the countdown is visibly varied in the demo.
  protected readonly launchAt = signal(Date.now() + 1000 * 60 * 60 * 36);
  protected readonly launchDate = computed(() => new Date(this.launchAt()));

  // 30 seconds out so consumers see the countdown actually fire.
  protected readonly soonAt = signal(Date.now() + 30_000);
  protected readonly soonDate = computed(() => new Date(this.soonAt()));

  protected readonly fired = signal(false);

  protected readonly api: readonly DocApiRow[] = [
    { name: '<wr-statistic>', description: 'KPI card.', type: 'component', default: '—' },
    { name: 'label', description: 'Label above the value.', type: 'string', default: "''", sub: true },
    {
      name: 'value',
      description: 'Main number or string shown.',
      type: 'number | string | null',
      default: 'null',
      sub: true,
    },
    { name: 'prefix', description: 'Leading glyph or symbol.', type: 'string', default: "''", sub: true },
    { name: 'suffix', description: 'Trailing glyph or unit.', type: 'string', default: "''", sub: true },
    {
      name: 'precision',
      description: 'Fixed decimals for numeric values.',
      type: 'number',
      default: '0',
      sub: true,
    },
    {
      name: 'animate',
      description: 'Count up to a new numeric value (off for strings / reduced motion).',
      type: 'boolean',
      default: 'true',
      sub: true,
    },
    { name: 'duration', description: 'Count-up duration in ms.', type: 'number', default: '700', sub: true },
    { name: 'delta', description: 'Change vs previous period.', type: 'number | null', default: 'null', sub: true },
    { name: 'deltaSuffix', description: 'Unit appended to the delta.', type: 'string', default: "'%'", sub: true },
    { name: '<wr-statistic-countdown>', description: 'Live countdown variant.', type: 'component', default: '—' },
    {
      name: 'target',
      description: 'Date or timestamp to count down to.',
      type: 'Date | string | number',
      required: true,
      sub: true,
    },
    { name: 'label', description: 'Label above the value.', type: 'string', default: "''", sub: true },
    {
      name: 'format',
      description: 'Format string for the remaining time.',
      type: 'string',
      default: "'HH:mm:ss'",
      sub: true,
    },
    {
      name: 'endText',
      description: 'Text shown once it reaches zero.',
      type: 'string | null',
      default: 'null',
      sub: true,
    },
    { name: 'tickMs', description: 'Tick interval in milliseconds.', type: 'number', default: '1000', sub: true },
  ];

  protected onLive(): void {
    this.fired.set(true);
  }
}
