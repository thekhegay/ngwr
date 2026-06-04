import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrCountUp } from 'ngwr/count-up';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-count-up-page',
  templateUrl: './count-up.html',
  imports: [
    WrCountUp,
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class CountUpPage {
  protected readonly visitors = signal(12_345);
  protected readonly revenue = signal(9.99);
  protected readonly progress = signal(64);

  protected bumpVisitors(): void {
    this.visitors.update(v => v + Math.floor(Math.random() * 5_000));
  }

  protected addRevenue(): void {
    this.revenue.update(v => +(v + Math.random() * 49.99).toFixed(2));
  }

  protected addProgress(): void {
    this.progress.update(v => Math.min(100, v + 8));
  }

  protected readonly snippets = {
    install: `import { WrCountUp } from 'ngwr/count-up';

@Component({ imports: [WrCountUp] })
export class MyComponent {}`,
    basic: `<wr-count-up [to]="12345" />`,
    decimals: `<wr-count-up [to]="9.99" [decimals]="2" prefix="$" />`,
    suffix: `<wr-count-up [to]="64" suffix="%" [duration]="800" />`,
    grouping: `<wr-count-up [to]="1234567" [grouping]="false" />`,
    spring: `<!-- Reactbits-style spring physics — duration is seconds, not ms. -->
<wr-count-up [to]="100" easing="spring" [duration]="2" />`,
    visible: `<!-- Wait for the host to enter the viewport (IntersectionObserver). -->
<wr-count-up [to]="9999" trigger="visible" easing="spring" [delay]="200" />`,
    countdown: `<!-- Count down — \`direction="down"\` swaps from / to. -->
<wr-count-up [from]="0" [to]="60" direction="down" suffix="s" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'to', description: 'Target value. Required.', type: 'number', default: '—' },
    { name: 'from', description: 'Starting value.', type: 'number', default: '0' },
    {
      name: 'duration',
      description: 'Animation duration. Milliseconds for `easing="ease-out"`, seconds for `easing="spring"`.',
      type: 'number',
      default: '1200',
    },
    { name: 'delay', description: 'Delay (ms) before the animation starts.', type: 'number', default: '0' },
    {
      name: 'easing',
      description: 'Animation curve. `spring` uses critically-damped spring physics (mass=1).',
      type: "'ease-out' | 'spring'",
      default: "'ease-out'",
    },
    {
      name: 'trigger',
      description: '`mount` starts immediately. `visible` waits for the host to enter the viewport.',
      type: "'mount' | 'visible'",
      default: "'mount'",
    },
    {
      name: 'direction',
      description: '`down` swaps `from` ↔ `to`.',
      type: "'up' | 'down'",
      default: "'up'",
    },
    { name: 'decimals', description: 'Fixed decimals. `0` formats as integer.', type: 'number', default: '0' },
    {
      name: 'prefix',
      description: 'String prepended to the formatted number (e.g. `$`).',
      type: 'string',
      default: "''",
    },
    {
      name: 'suffix',
      description: 'String appended to the formatted number (e.g. `%`).',
      type: 'string',
      default: "''",
    },
    {
      name: 'grouping',
      description: 'Use locale grouping separators (`1,234` vs `1234`).',
      type: 'boolean',
      default: 'true',
    },
    {
      name: '(started)',
      description: 'Fires the moment the animation begins.',
      type: 'EventEmitter<void>',
      default: '—',
    },
    {
      name: '(completed)',
      description: 'Fires once the animation settles.',
      type: 'EventEmitter<void>',
      default: '—',
    },
  ];
}
