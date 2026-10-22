import { Component } from '@angular/core';

import { DocPageComponent, DocRemovedComponent } from '#core/components';

/** A tombstone: `Theme builder` went in v15, and this page says what replaced it. */
@Component({
  selector: 'ngwr-tokens-builder',
  templateUrl: './builder.html',
  imports: [DocPageComponent, DocRemovedComponent],
})
export default class ThemeBuilderPageComponent {}
