import { Component } from '@angular/core';

import { DocPageComponent, DocRemovedComponent } from '#core/components';

/** A tombstone: `Action Sheet` went in v15, and this page says what replaced it. */
@Component({
  selector: 'ngwr-action-sheet-page',
  templateUrl: './action-sheet.html',
  imports: [DocPageComponent, DocRemovedComponent],
})
export default class ActionSheetPageComponent {}
