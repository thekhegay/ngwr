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
    odometer: `<wr-counter [value]="123456" mode="odometer" />`,
    tween: `<wr-counter [value]="9.99" mode="tween" [decimals]="2" prefix="$" />`,
    minDigits: `<wr-counter [value]="42" [minIntegerDigits]="6" mode="odometer" />`,
    countUp: `<!-- The spring path reads \`duration\` in SECONDS, not milliseconds, so it
     needs its own value rather than the shared 1200ms default. -->
<wr-count-up [to]="1000" easing="spring" [duration]="2" trigger="visible" />`,
    countDown: `<!-- \`direction="down"\` IS the swap — it reads \`to\` as the start and \`from\`
     as the end — so the range is written the way up would write it. -->
<wr-count-up [from]="0" [to]="60" direction="down" />`,
  };

  protected readonly api = API.WrCounter;
  protected readonly countUpApi = API.WrCountUp;
}
