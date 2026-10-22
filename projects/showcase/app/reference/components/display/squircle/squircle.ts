import { Component } from '@angular/core';

import { DocPageComponent, DocRemovedComponent } from '#core/components';

/** A tombstone: `Squircle` went in v15, and this page says what replaced it. */
@Component({
  selector: 'ngwr-squircle-page',
  templateUrl: './squircle.html',
  imports: [DocPageComponent, DocRemovedComponent],
})
export default class SquirclePageComponent {}
