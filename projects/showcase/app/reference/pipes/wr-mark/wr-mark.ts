import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrInput } from 'ngwr/input';
import { WrMark } from 'ngwr/pipes';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-pipe-wr-mark-page',
  templateUrl: './wr-mark.html',
  imports: [
    FormsModule,
    WrInput,
    WrMark,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class WrMarkPipePage {
  protected readonly query = signal('quick');
  protected readonly text = 'The quick brown fox jumps over the lazy dog. Quick learners are quick to learn.';

  protected readonly items = [
    'Quick Start Guide',
    'Quickly add a new project',
    'Slow and steady wins',
    'Build queue management',
    'Quickbooks integration',
  ];

  protected readonly snippets = {
    usage: `<span [innerHTML]="row.name | wrMark: query()"></span>

<!-- Case-sensitive -->
<span [innerHTML]="row.name | wrMark: query() : true"></span>`,

    style: `mark {
  background: color-mix(in srgb, var(--wr-color-warning) 40%, transparent);
  color: var(--wr-color-on-surface);
  padding: 0 2px;
  border-radius: 2px;
}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'value',
      description: 'Source text. Null / undefined returns "".',
      type: 'string | null | undefined',
      default: '—',
    },
    {
      name: 'query',
      description: 'Search term. Empty / null skips the wrap, leaving the escaped text.',
      type: 'string | null | undefined',
      default: '—',
    },
    {
      name: 'caseSensitive',
      description: 'Exact-case match. Default is case-insensitive.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'returns',
      description: 'Bind with `[innerHTML]`. The text is escaped first.',
      type: 'SafeHtml',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Component',
      title: 'wr-select',
      url: ['/reference/components', 'select'],
      description: 'Highlight in suggestions.',
    },
    {
      kind: 'Component',
      title: 'wr-command-palette',
      url: ['/reference/components', 'command-palette'],
      description: 'Highlight in commands.',
    },
  ];
}
