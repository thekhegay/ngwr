import { Component } from '@angular/core';

import { DocPageComponent, DocRemovedComponent } from '#core/components';

/** A tombstone: `WrMedia` went in v15, and this page says what replaced it. */
@Component({
  selector: 'ngwr-svc-media-page',
  templateUrl: './media.html',
  imports: [DocPageComponent, DocRemovedComponent],
})
export default class MediaServicePageComponent {}
