import { Component, computed, signal } from '@angular/core';

import { WrDuration, type WrDurationStyle } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

@Component({
  selector: 'ngwr-pipe-wr-duration-page',
  templateUrl: './wr-duration.html',
  imports: [
    WrDuration,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocPlaygroundComponent,
    DocSeeAlsoComponent,
  ],
})
export default class WrDurationPipePage {
  protected readonly ms = signal(HOUR + 30 * MINUTE);
  protected readonly style = signal<WrDurationStyle>('clock');

  protected readonly spans = [7_000, 307_000, HOUR + 30 * MINUTE, HOUR + 30 * MINUTE + 7_000, 49 * HOUR] as const;

  protected readonly playgroundSnippet = computed(() =>
    this.style() === 'clock' ? `{{ ${this.ms()} | wrDuration }}` : `{{ ${this.ms()} | wrDuration: '${this.style()}' }}`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Milliseconds', signal: this.ms, min: 0, max: 3 * 24 * HOUR, step: MINUTE },
    { kind: 'select', label: 'Style', signal: this.style, options: ['clock', 'units', 'timer'] },
  ];

  protected readonly snippets = {
    clock: `{{ 5400000 | wrDuration }}  <!-- "1:30:00" -->
{{ 307000 | wrDuration }}   <!-- "5:07"    -->`,
    units: `{{ 5400000 | wrDuration: 'units' }}  <!-- en: "1 hr 30 min"  fr: "1 h 30 min" -->
{{ 307000 | wrDuration: 'units' }}   <!-- en: "5 min 7 sec"  ru: "5 мин 7 с"  -->`,
    timer: `{{ 3723000 | wrDuration: 'timer' }}   <!-- "01:02:03"    -->
{{ 307000 | wrDuration: 'timer' }}    <!-- "00:05:07"    -->
{{ 93784000 | wrDuration: 'timer' }}  <!-- "1d 02:03:04" -->
{{ -307000 | wrDuration: 'timer' }}   <!-- "-00:05:07"   -->`,
    fn: `import { wrFormatDuration } from 'ngwr/pipes';

wrFormatDuration(5400000, 'en-US');          // "1:30:00"
wrFormatDuration(5400000, 'en-US', 'units'); // "1 hr 30 min"
wrFormatDuration(5400000, 'en-US', 'timer'); // "01:30:00"
wrFormatDuration(-307000, 'en-US');          // "-5:07"
wrFormatDuration(null, 'en-US');             // ""`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrDuration',
      description:
        'Milliseconds as `1:30:00` (`5:07` under an hour), as units, or as a timer (`01:30:00`). No time zone is read. Whole seconds; a negative span takes the minus sign in front. `null`, `undefined`, empty and a non-finite value render as an empty string.',
      type: "(value: number | string | null | undefined, style: WrDurationStyle = 'clock') => string",
      default: '—',
    },
    {
      name: 'wrFormatDuration',
      description: 'The pipe as a function, in the locale given.',
      type: "(value: number | string | null | undefined, locale: string, style: WrDurationStyle = 'clock') => string",
      default: '—',
    },
    {
      name: 'WrDurationStyle',
      description:
        '`clock` is digits and colons; `units` is every non-zero unit as the locale writes it; `timer` is always `HH:mm:ss`, with the days in front as the narrow unit of the locale (`1d 02:03:04`).',
      type: "'clock' | 'units' | 'timer'",
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-statistic-countdown',
      url: ['/reference/components', 'statistic'],
      description: 'A span that ticks down.',
    },
    {
      kind: 'Pipe',
      title: 'wrDate',
      url: ['/reference/pipes', 'wr-date'],
      description: 'A moment rather than a span.',
    },
  ];
}
