import { Component } from '@angular/core';

import { DocPageComponent, DocRemovedComponent } from '#core/components';

/** A tombstone: `Feather adapter` went in v15, and this page says what replaced it. */
@Component({
  selector: 'ngwr-icons-feather-adapter',
  templateUrl: './feather.html',
  imports: [DocPageComponent, DocRemovedComponent],
})
export default class FeatherAdapterPageComponent {}
