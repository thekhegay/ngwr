import { Component } from '@angular/core';

import { DocPageComponent, DocRemovedComponent } from '#core/components';

/** A tombstone: `WrDateFnsAdapter` went in v15, and this page says what replaced it. */
@Component({
  selector: 'ngwr-svc-date-fns-adapter-page',
  templateUrl: './date-fns-adapter.html',
  imports: [DocPageComponent, DocRemovedComponent],
})
export default class DateFnsAdapterPageComponent {}
