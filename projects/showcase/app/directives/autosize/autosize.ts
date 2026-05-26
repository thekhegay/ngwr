import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrAutosize } from 'ngwr/directives';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrAutosize,
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
    install: `import { WrAutosize } from 'ngwr/directives';`,
    usage: `<textarea wrAutosize minRows="2" maxRows="8" [(ngModel)]="text"></textarea>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrAutosize]',
      description: 'Auto-grow <textarea> based on scrollHeight; bounded by minRows / maxRows.',
      type: 'directive on textarea',
      default: '—',
    },
  ];
}
