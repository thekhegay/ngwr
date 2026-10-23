import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrInput } from 'ngwr/input';
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
    WrInput,
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
    basic: `<textarea
  wrInput
  wrMention
  [wrMentionItems]="users"
  [(ngModel)]="text"
></textarea>`,

    multi: `<textarea
  wrInput
  wrMention
  [wrMentionItems]="tags"
  [triggers]="['#']"
  [(ngModel)]="text"
></textarea>`,
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
      description: 'Anything else your app needs back on `(wrMentionSelected)`.',
      type: 'unknown',
      sub: true,
    },
    {
      name: 'WrMentionCommit',
      description: 'The `(wrMentionSelected)` payload.',
      type: 'interface',
    },
    { name: 'item', description: 'The selected entry.', type: 'WrMentionItem', required: true, sub: true },
    {
      name: 'trigger',
      description: "The character that opened the panel — `'@'`, `'#'`, whatever `triggers` listed.",
      type: 'string',
      required: true,
      sub: true,
    },
    {
      name: 'query',
      description: 'The text typed after the trigger, matched as a substring.',
      type: 'string',
      required: true,
      sub: true,
    },
  ];
}
