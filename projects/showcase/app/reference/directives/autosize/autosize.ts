import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrAutosize } from 'ngwr/directives';
import { WrInput } from 'ngwr/input';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-autosize-page',
  templateUrl: './autosize.html',
  imports: [
    FormsModule,
    WrAutosize,
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class AutosizePage {
  protected readonly textareaValue = signal('Type more lines\nto see\nthis grow…');

  protected readonly snippets = {
    usage: `<textarea wrAutosize minRows="2" maxRows="8" [(ngModel)]="text"></textarea>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrAutosize]',
      description: 'Grows the `<textarea>` with its content.',
      type: 'directive on textarea',
      default: '—',
    },
    {
      name: 'minRows',
      description: 'Fewest rows.',
      type: 'number',
      default: '1',
      sub: true,
    },
    {
      name: 'maxRows',
      description: 'Most rows. `0` means no limit.',
      type: 'number',
      default: '0',
      sub: true,
    },
  ];
}
