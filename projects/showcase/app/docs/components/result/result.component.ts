import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrResultComponent } from 'ngwr/result';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-result-page',
  templateUrl: './result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrResultComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class ResultPageComponent {
  protected readonly snippet = `<wr-result status="success" title="Submitted!" description="We'll be in touch.">
  <button wrResultExtra>Continue</button>
</wr-result>`;
}
