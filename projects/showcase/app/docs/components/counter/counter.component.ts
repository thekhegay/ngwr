import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrButtonComponent } from 'ngwr/button';
import { WrCounterComponent } from 'ngwr/counter';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-counter-page',
  templateUrl: './counter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrCounterComponent,
    WrButtonComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class CounterPageComponent {
  protected readonly oilGauge = signal(123456);
  protected readonly stocks = signal(420.69);
  protected readonly progress = signal(0);

  protected randomize(): void {
    this.oilGauge.set(Math.floor(Math.random() * 999999));
    this.stocks.set(Math.round(Math.random() * 100000) / 100);
  }

  protected stepProgress(): void {
    this.progress.update(v => (v >= 100 ? 0 : v + 25));
  }

  protected readonly snippets = {
    install: `import { WrCounterComponent } from 'ngwr/counter';

@Component({ imports: [WrCounterComponent] })
export class MyComponent {}`,
    odometer: `<wr-counter [value]="123456" mode="odometer" />`,
    tween: `<wr-counter [value]="9.99" mode="tween" [decimals]="2" prefix="$" />`,
    minDigits: `<wr-counter [value]="42" [minIntegerDigits]="6" mode="odometer" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'value',
      type: 'number',
      default: '—',
      description: 'Target number. Required.',
    },
    {
      name: 'mode',
      type: `'odometer' | 'tween'`,
      default: `'odometer'`,
      description: 'Animation style — rolling digits or eased count-up.',
    },
    {
      name: 'duration',
      type: 'number',
      default: '900',
      description: 'Animation duration in ms.',
    },
    {
      name: 'decimals',
      type: 'number',
      default: '0',
      description: 'Fixed number of decimal places.',
    },
    {
      name: 'minIntegerDigits',
      type: 'number',
      default: '0',
      description: 'Pad the integer part to at least this many digits.',
    },
    {
      name: 'prefix',
      type: 'string',
      default: `''`,
      description: 'Static prefix (e.g. `$`).',
    },
    {
      name: 'suffix',
      type: 'string',
      default: `''`,
      description: 'Static suffix (e.g. `%`).',
    },
    {
      name: 'grouping',
      type: 'boolean',
      default: 'true',
      description: 'Group thousands via `Intl.NumberFormat`.',
    },
  ];
}
