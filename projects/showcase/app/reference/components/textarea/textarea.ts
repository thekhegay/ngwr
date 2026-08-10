import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrTextarea } from 'ngwr/textarea';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-textarea-page',
  templateUrl: './textarea.html',
  imports: [
    FormsModule,
    WrTextarea,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TextareaComponent {
  protected readonly text = signal('Hello world');
  protected readonly autoText = signal('Type to see autosize…');

  protected readonly snippets = {
    install: `import { WrTextarea } from 'ngwr/textarea';
import { FormsModule } from '@angular/forms';

@Component({ imports: [WrTextarea, FormsModule] })
export class MyComponent {}`,
    basic: `<wr-textarea placeholder="Notes" [(value)]="text" />`,
    rows: `<wr-textarea [rows]="5" />`,
    autosize: `<wr-textarea autosize [maxRows]="6" [(value)]="text" />`,
    fixed: `<wr-textarea [resizable]="false" [(value)]="text" />`,
  };

  protected readonly api = API.WrTextarea;
}
