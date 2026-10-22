import { Component } from '@angular/core';

import { DocPageComponent, DocRemovedComponent } from '#core/components';

/** A tombstone: the registry went in v15, and this page says what replaced it. */
@Component({
  selector: 'ngwr-guides-registry',
  templateUrl: './registry.html',
  imports: [DocPageComponent, DocRemovedComponent],
})
export default class RegistryPageComponent {}
