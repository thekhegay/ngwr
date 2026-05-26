import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrStatistic } from 'ngwr/statistic';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-statistic-page',
  templateUrl: './statistic.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrStatistic, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class StatisticPageComponent {
  protected readonly snippet = `<wr-statistic label="Active users" [value]="12345" />
<wr-statistic label="Revenue" [value]="9512" prefix="$" [delta]="12.4" />`;
}
