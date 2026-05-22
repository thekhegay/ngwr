import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrAutosizeDirective, WrClickOutsideDirective, WrCopyToClipboardDirective } from 'ngwr/directives';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-directives-page',
  templateUrl: './directives.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrAutosizeDirective,
    WrClickOutsideDirective,
    WrCopyToClipboardDirective,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DirectivesPageComponent {
  protected readonly textareaValue = signal('Type more lines\nto see\nthis grow…');
  protected readonly clipboardText = signal('Hello from ngwr!');
  protected readonly copied = signal<string>('');
  protected readonly outside = signal<number>(0);

  protected onCopied(text: string): void {
    this.copied.set(text);
  }

  protected onOutside(): void {
    this.outside.update(n => n + 1);
  }

  protected readonly snippets = {
    install: `import {
  WrAutosizeDirective,
  WrClickOutsideDirective,
  WrCopyToClipboardDirective,
} from 'ngwr/directives';`,

    autofocus: `<input wrAutofocus placeholder="Focused on init" />
<input [wrAutofocus]="shouldFocus()" />`,

    autosize: `<textarea wrAutosize minRows="2" maxRows="8" [(ngModel)]="text"></textarea>`,

    clickOutside: `<div class="popup" (wrClickOutside)="close()"> … </div>`,

    clipboard: `<button [wrCopyToClipboard]="value" (copied)="toast('Copied!')">Copy</button>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrAutofocus]',
      description: 'Focus host on init, or whenever the bound expression becomes truthy.',
      type: 'boolean (default true)',
      default: '—',
    },
    {
      name: '[wrAutosize]',
      description: 'Auto-grow <textarea> based on scrollHeight; bounded by minRows / maxRows.',
      type: 'directive on textarea',
      default: '—',
    },
    {
      name: '(wrClickOutside)',
      description: 'Emits when a mousedown event lands outside the host element.',
      type: 'EventEmitter<MouseEvent>',
      default: '—',
    },
    {
      name: '[wrCopyToClipboard]',
      description: 'Copies the bound string on host click. `(copied)` / `(copyFailed)` outputs.',
      type: 'string',
      default: '—',
    },
  ];
}
