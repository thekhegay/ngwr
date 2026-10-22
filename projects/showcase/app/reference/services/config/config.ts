import { Component } from '@angular/core';

import { DocPageComponent, DocRemovedComponent } from '#core/components';

/** A tombstone: `WrConfig` went in v15, and this page says what replaced it. */
@Component({
  selector: 'ngwr-svc-config-page',
  templateUrl: './config.html',
  imports: [DocPageComponent, DocRemovedComponent],
})
export default class ConfigServicePageComponent {}
