import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrCommandPalette, type WrCommandItem } from 'ngwr/command-palette';

import {
  type DocApiRow,
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-command-palette-page',
  templateUrl: './command-palette.html',
  imports: [
    WrButton,
    WrCommandPalette,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class CommandPalettePage {
  protected readonly open = signal(false);
  protected readonly respOpen = signal(false);
  protected readonly last = signal<string | null>(null);

  protected readonly items: readonly WrCommandItem[] = [
    {
      id: 'theme.light',
      label: 'Switch to light theme',
      description: 'Override the OS preference',
      group: 'Theme',
      shortcut: 'T L',
      keywords: ['light', 'bright', 'day'],
    },
    {
      id: 'theme.dark',
      label: 'Switch to dark theme',
      description: 'Override the OS preference',
      group: 'Theme',
      shortcut: 'T D',
      keywords: ['dark', 'night'],
    },
    { id: 'nav.home', label: 'Go to home', group: 'Navigation', shortcut: 'G H' },
    { id: 'nav.components', label: 'Go to components', group: 'Navigation', shortcut: 'G C' },
    { id: 'nav.services', label: 'Go to services', group: 'Navigation', shortcut: 'G S' },
    {
      id: 'docs.search',
      label: 'Search docs',
      description: 'Open the docs full-text search',
      group: 'Docs',
      shortcut: '/',
    },
    { id: 'session.signout', label: 'Sign out', group: 'Session' },
  ];

  protected onPicked(item: WrCommandItem): void {
    this.last.set(item.label);
  }

  protected readonly snippets = {
    server: `<wr-command-palette
  [items]="results()"
  [(query)]="query"
  [loading]="loading()"
  serverSearch
  [debounceMs]="250"
  (searchChange)="search($event)"
/>`,
    install: `import { WrCommandPalette, type WrCommandItem } from 'ngwr/command-palette';

@Component({ imports: [WrCommandPalette] })
export class AppShell {
  protected readonly commands: WrCommandItem[] = [
    { id: 'theme.light', label: 'Switch to light theme', group: 'Theme', shortcut: 'T L' },
    { id: 'theme.dark',  label: 'Switch to dark theme',  group: 'Theme', shortcut: 'T D' },
    { id: 'docs.search', label: 'Search docs',           group: 'Docs',  shortcut: '/' },
  ];

  protected onPicked(item: WrCommandItem) {
    console.log('picked', item.id);
  }
}`,
    template: `<!-- Drop at the root once; opens via global hotkey (default: mod+k). -->
<wr-command-palette
  [items]="commands"
  trigger="mod+k"
  (picked)="onPicked($event)"
/>`,
    controlled: `<button (click)="open.set(true)">Open palette</button>

<wr-command-palette
  [items]="commands"
  [(open)]="open"
  [trigger]="null"
  (picked)="onPicked($event)"
/>`,
  };

  protected readonly api = API.WrCommandPalette;

  protected readonly typesApi: readonly DocApiRow[] = [
    {
      name: 'WrCommandItem',
      description: '`{ id, label, description?, group?, icon?, keywords?, shortcut?, action? }`',
      type: 'interface',
      default: '—',
    },
  ];
}
