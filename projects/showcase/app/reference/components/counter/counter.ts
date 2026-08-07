import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrCounter, WrCountUp } from 'ngwr/counter';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-counter-page',
  templateUrl: './counter.html',
  imports: [
    WrCounter,
    WrCountUp,
    WrButton,
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
    install: `import { WrCounter, WrCountUp } from 'ngwr/counter';

@Component({ imports: [WrCounter, WrCountUp] })
export class MyComponent {}`,
    odometer: `<wr-counter [value]="123456" mode="odometer" />`,
    tween: `<wr-counter [value]="9.99" mode="tween" [decimals]="2" prefix="$" />`,
    minDigits: `<wr-counter [value]="42" [minIntegerDigits]="6" mode="odometer" />`,
    countUp: `<wr-count-up [to]="1000" easing="spring" trigger="visible" />`,
    countDown: `<wr-count-up [from]="60" [to]="0" direction="down" />`,
  };

  protected readonly api = API.WrCounter;
}
