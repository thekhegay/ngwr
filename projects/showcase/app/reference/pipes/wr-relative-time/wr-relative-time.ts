import { Component, computed, signal } from '@angular/core';

import { type WrRelativeTimeOptions, WrRelativeTime, wrFormatRelativeTime } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const DISTANCES: Readonly<Record<string, number>> = {
  '30 seconds': 30_000,
  '5 minutes': 5 * MINUTE,
  '3 hours': 3 * HOUR,
  '1 day': DAY,
  '3 days': 3 * DAY,
  '2 weeks': 14 * DAY,
  '3 months': 92 * DAY,
  '2 years': 731 * DAY,
};

@Component({
  selector: 'ngwr-pipe-wr-relative-time-page',
  templateUrl: './wr-relative-time.html',
  imports: [
    WrRelativeTime,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocPlaygroundComponent,
  ],
})
export default class WrRelativeTimePipePage {
  // A fixed reference instant: the page reads the same whenever it is rendered.
  protected readonly now = new Date('2026-11-12T12:00:00Z');
  protected readonly fiveMinutesAgo = new Date(this.now.getTime() - 5 * MINUTE);
  protected readonly yesterday = new Date(this.now.getTime() - DAY);
  protected readonly inThreeHours = new Date(this.now.getTime() + 3 * HOUR);

  protected readonly always: WrRelativeTimeOptions = { now: this.now, numeric: 'always' };
  protected readonly narrow: WrRelativeTimeOptions = { now: this.now, style: 'narrow' };

  protected readonly locales = ['en-GB', 'de', 'es', 'ru', 'ja'].map(locale => ({
    locale,
    past: wrFormatRelativeTime(this.fiveMinutesAgo, locale, { now: this.now }),
    day: wrFormatRelativeTime(this.yesterday, locale, { now: this.now }),
    future: wrFormatRelativeTime(this.inThreeHours, locale, { now: this.now }),
  }));

  protected readonly distance = signal('5 minutes');
  protected readonly future = signal(false);
  protected readonly numeric = signal<Intl.RelativeTimeFormatNumeric>('auto');
  protected readonly style = signal<Intl.RelativeTimeFormatStyle>('long');

  protected readonly value = computed(
    () => new Date(this.now.getTime() + (this.future() ? 1 : -1) * DISTANCES[this.distance()])
  );
  protected readonly options = computed<WrRelativeTimeOptions>(() => ({
    now: this.now,
    numeric: this.numeric(),
    style: this.style(),
  }));

  protected readonly playgroundSnippet = computed(
    () => `{{ value | wrRelativeTime: { numeric: '${this.numeric()}', style: '${this.style()}' } }}`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'select', label: 'Distance', signal: this.distance, options: Object.keys(DISTANCES) },
    { kind: 'toggle', label: 'In the future', signal: this.future },
    { kind: 'select', label: 'Numeric', signal: this.numeric, options: ['auto', 'always'] },
    { kind: 'select', label: 'Style', signal: this.style, options: ['long', 'short', 'narrow'] },
  ];

  protected readonly snippets = {
    basic: `{{ comment.createdAt | wrRelativeTime }}                       <!-- "5 minutes ago" -->
{{ task.dueAt | wrRelativeTime }}                              <!-- "in 3 hours"    -->
{{ order.paidAt | wrRelativeTime: { numeric: 'always' } }}     <!-- "1 day ago"     -->
{{ comment.createdAt | wrRelativeTime: { style: 'narrow' } }}  <!-- "5m ago"        -->`,
    live: `<!-- Stays current: re-renders on a timer -->
<wr-date-stamp [value]="comment.createdAt" relative />

<!-- Or move the reference instant yourself -->
{{ comment.createdAt | wrRelativeTime: { now: clock() } }}`,
    fn: `import { wrFormatRelativeTime } from 'ngwr/pipes';

const now = new Date('2026-11-12T12:00:00Z');

wrFormatRelativeTime('2026-11-12T11:55:00Z', 'en-GB', { now }); // "5 minutes ago"
wrFormatRelativeTime('2026-11-11T12:00:00Z', 'en-GB', { now }); // "yesterday"
wrFormatRelativeTime('2026-11-12T15:00:00Z', 'ru', { now });    // "через 3 часа"
wrFormatRelativeTime(row.createdAt, 'en-GB');                   // from the current time`,
  };

  protected readonly units: readonly (readonly [distance: string, unit: string])[] = [
    ['Under a minute', 'seconds'],
    ['Under an hour', 'minutes'],
    ['Under a day', 'hours'],
    ['Under a week', 'days'],
    ['Under a month', 'weeks'],
    ['Under a year', 'months'],
    ['A year or more', 'years'],
  ];

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrRelativeTime',
      description:
        'How far the value is from now, through `Intl.RelativeTimeFormat` in `LOCALE_ID`. Reads a `Date`, an epoch number or a string, as `wrDate` does, under the `epochUnit` and `zonelessIn` of `withDates()`. `null`, `undefined`, a blank string and a value that is not a date give an empty string.',
      type: '(value: Date | string | number | null | undefined, options?: WrRelativeTimeOptions) => string',
      default: '-',
    },
    {
      name: 'wrFormatRelativeTime',
      description: 'The pipe as a function, in the locale given. It reads no app setting: a number is milliseconds.',
      type: '(value: Date | string | number | null | undefined, locale: string, options?: WrRelativeTimeOptions) => string',
      default: '-',
    },
    {
      name: 'options.now',
      description: 'The instant the value is measured from.',
      type: 'Date | number',
      default: 'the current time',
    },
    {
      name: 'options.numeric',
      description: '`auto` lets the language say "yesterday", "tomorrow" and "now". `always` keeps the number.',
      type: "'auto' | 'always'",
      default: "'auto'",
    },
    {
      name: 'options.style',
      description: 'How much of the unit is written, as `Intl.RelativeTimeFormat` reads it.',
      type: "'long' | 'short' | 'narrow'",
      default: "'long'",
    },
    {
      name: 'options.epochUnit, zonelessIn, timeZone',
      description: 'How the value is read, as the last argument of `wrDate` says it.',
      type: 'WrParseDateOptions',
      default: '`withDates()` in the pipe',
    },
  ];
}
