import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrBackTopComponent } from 'ngwr/back-top';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-back-top-page',
  templateUrl: './back-top.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrBackTopComponent, DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class BackTopPageComponent {
  protected readonly snippet = `<wr-back-top visibilityThreshold="400" [offset]="80" />`;
}
