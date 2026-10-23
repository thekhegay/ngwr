import { Component } from '@angular/core';

import { DocPageComponent, DocRemovedComponent } from '#core/components';

/** A tombstone: `WrLuxonAdapter` went in v15, and this page says what replaced it. */
@Component({
  selector: 'ngwr-svc-luxon-adapter-page',
  templateUrl: './luxon-adapter.html',
  imports: [DocPageComponent, DocRemovedComponent],
})
export default class LuxonAdapterPageComponent {}
