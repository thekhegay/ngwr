import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrMention, type WrMentionItem } from 'ngwr/mention';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

type User = WrMentionItem & {
  readonly label: string;
  readonly email: string;
};

@Component({
  selector: 'ngwr-mention-page',
  templateUrl: './mention.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrMention,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class MentionPageComponent {
  protected readonly users: readonly User[] = [
    { label: 'Ada Lovelace', email: 'ada@example.com' },
    { label: 'Alan Turing', email: 'alan@example.com' },
    { label: 'Grace Hopper', email: 'grace@example.com' },
    { label: 'Linus Torvalds', email: 'linus@example.com' },
    { label: 'Margaret Hamilton', email: 'maggie@example.com' },
    { label: 'Donald Knuth', email: 'don@example.com' },
  ];

  protected readonly tags: readonly WrMentionItem[] = [
    { label: 'bug' },
    { label: 'enhancement' },
    { label: 'help-wanted' },
    { label: 'good-first-issue' },
  ];

  protected readonly basicText = signal('Hey @');
  protected readonly multiText = signal('Tag this as #');

  protected readonly userDisplay = (u: User): string => `${u.label}`;

  protected readonly snippets = {
    install: `import { WrMention, type WrMentionItem } from 'ngwr/mention';

@Component({ imports: [WrMention, FormsModule] })
export class MyComponent {
  protected readonly users = [{ label: 'Ada' }, { label: 'Alan' }];
}`,

    basic: `<textarea
  wrMention
  [wrMentionItems]="users"
  [(ngModel)]="text"
></textarea>

<!-- Type @ to open the picker. Arrows + Enter / Tab to commit, Esc to cancel. -->`,

    multi: `<textarea
  wrMention
  [wrMentionItems]="tags"
  [triggers]="['#']"
  [(ngModel)]="text"
></textarea>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'wrMentionItems',
      description: 'Items to filter against the typed query.',
      type: 'readonly WrMentionItem[]',
      default: '[]',
    },
    {
      name: 'triggers',
      description: 'Trigger characters that open the panel.',
      type: 'readonly string[]',
      default: "['@']",
    },
    {
      name: 'displayWith',
      description: 'Maps an item to its display label.',
      type: '(item) => string',
      default: 'item.label',
    },
    {
      name: 'valueWith',
      // eslint-disable-next-line no-template-curly-in-string
      description: 'Text to insert on commit. Default: `${trigger}${displayWith(item)}`.',
      type: '((item, trigger) => string) | null',
      default: 'null',
    },
    {
      name: 'filterWith',
      description: 'Custom filter predicate.',
      type: '((query, item) => boolean) | null',
      default: 'null',
    },
    { name: 'maxResults', description: 'Cap on items shown in the panel.', type: 'number', default: '8' },
    {
      name: '(wrMentionSelected)',
      description: 'Emits `{ item, trigger, query }` on commit.',
      type: 'EventEmitter<WrMentionCommit>',
      default: '—',
    },
  ];
}
