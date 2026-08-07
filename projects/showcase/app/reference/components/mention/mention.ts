import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrMention, type WrMentionItem } from 'ngwr/mention';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';
import { API } from '#core/generated/api';

type User = WrMentionItem & {
  readonly label: string;
  readonly email: string;
};

@Component({
  selector: 'ngwr-mention-page',
  templateUrl: './mention.html',
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
    a11y: `<!-- What the directive renders. You write none of this. -->
<textarea
  wrMention
  aria-autocomplete="list"      <!-- static: a permanent capability of the field, -->
  aria-haspopup="listbox"       <!-- announced on focus before you type a trigger -->
  aria-controls="wr-mention-listbox-1"
  aria-activedescendant="wr-mention-listbox-1-opt-2"   <!-- only while open -->
></textarea>

<!-- In the overlay: -->
<ul id="wr-mention-listbox-1" role="listbox" aria-label="Mentions">
  <li id="wr-mention-listbox-1-opt-0" role="option" aria-selected="false">Ada Lovelace</li>
  <li id="wr-mention-listbox-1-opt-2" role="option" aria-selected="true">Grace Hopper</li>
</ul>

<!-- Plus a polite live region on <body>, because aria-expanded is not a
     supported state of role=textbox — so "a list appeared" and "X was
     inserted" have nowhere else to go:  "Matches available: 4" -->`,
  };

  protected readonly api = API.WrMention;

  protected readonly typeSnippet = `interface WrMentionItem {
  label: string;
  [key: string]: unknown;
}`;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrMentionItem', description: 'A mentionable entry — extend with any extra metadata.', type: 'interface' },
    { name: 'label', description: 'Text inserted and shown in the panel.', type: 'string', required: true, sub: true },
    {
      name: '[key: string]',
      description: 'Anything else your app needs back on (selected).',
      type: 'unknown',
      sub: true,
    },
  ];
}
