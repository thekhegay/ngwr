import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrTextarea } from 'ngwr/textarea';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-textarea-page',
  templateUrl: './textarea.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    basic: `<wr-textarea placeholder="Notes" [(ngModel)]="text" />`,
    rows: `<wr-textarea [rows]="5" />`,
    autosize: `<wr-textarea autosize [maxRows]="6" [(ngModel)]="text" />`,
    fixed: `<wr-textarea [resizable]="false" [(ngModel)]="text" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'placeholder', description: 'Placeholder text.', type: 'string', default: "''" },
    { name: 'rows', description: 'Visible row count.', type: 'number', default: '3' },
    { name: 'resizable', description: 'Allow user resize via the native handle.', type: 'boolean', default: 'true' },
    { name: 'readonly', description: 'Read-only state.', type: 'boolean', default: 'false' },
    { name: 'autosize', description: 'Grow to fit content.', type: 'boolean', default: 'false' },
    { name: 'maxRows', description: 'Cap autosize at this many rows.', type: 'number | null', default: 'null' },
  ];
}
