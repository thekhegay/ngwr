import { Component, signal } from '@angular/core';

import { WrClickOutside } from 'ngwr/directives';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-click-outside-page',
  templateUrl: './click-outside.html',
  imports: [
    WrClickOutside,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ClickOutsidePage {
  protected readonly outside = signal(0);

  protected onOutside(): void {
    this.outside.update(n => n + 1);
  }

  protected readonly snippets = {
    install: `import { WrClickOutside } from 'ngwr/directives';`,
    usage: `<div class="popup" (wrClickOutside)="close()"> … </div>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '(wrClickOutside)',
      description: 'Emits when a mousedown event lands outside the host element.',
      type: 'EventEmitter<MouseEvent>',
      default: '—',
    },
  ];
}
