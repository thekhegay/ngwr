import { Component, computed, signal } from '@angular/core';

import { WrStatistic, WrStatisticCountdown } from 'ngwr/statistic';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

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
  ],
})
export default class StatisticPageComponent {
  protected readonly snippet = `<wr-statistic label="Active users" [value]="12345" />
<wr-statistic label="Revenue" [value]="9512" prefix="$" [delta]="12.4" />`;

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

  protected onLive(): void {
    this.fired.set(true);
  }
}
