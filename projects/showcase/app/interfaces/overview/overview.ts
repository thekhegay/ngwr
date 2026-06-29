import { Component } from '@angular/core';

import { DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-interfaces-overview',
  templateUrl: './overview.html',
  imports: [DocPageComponent, DocSectionComponent],
})
export default class InterfacesOverviewPage {}
