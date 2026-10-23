import { Component } from '@angular/core';

import { DocPageComponent, DocRemovedComponent } from '#core/components';

/** A tombstone: `Lucide adapter` went in v15, and this page says what replaced it. */
@Component({
  selector: 'ngwr-icons-lucide-adapter',
  templateUrl: './lucide.html',
  imports: [DocPageComponent, DocRemovedComponent],
})
export default class LucideAdapterPageComponent {}
