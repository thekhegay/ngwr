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

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'items',
      description: 'Commands to render. Items with the same `group` are bucketed.',
      type: 'readonly WrCommandItem[]',
      default: '[]',
    },
    {
      name: '[(open)]',
      description: 'Two-way bindable visibility. Set true to open programmatically.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'trigger',
      description: 'Global hotkey that opens the palette. `null` disables auto-binding (you trigger manually).',
      type: 'WrHotkeySpec | null',
      default: "'mod+k'",
    },
    {
      name: 'placeholder',
      description: 'Search input placeholder.',
      type: 'string',
      default: "'Type a command or search…'",
    },
    { name: 'emptyText', description: 'Text when no items match the query.', type: 'string', default: "'No results'" },
    {
      name: 'closeOnPick',
      description: 'Auto-close on `(picked)`. Set false to keep open.',
      type: 'boolean',
      default: 'true',
    },
    {
      name: '(picked)',
      description: "Emits the picked `WrCommandItem`. Runs after the item's own `action()` callback.",
      type: 'EventEmitter<WrCommandItem>',
      default: '—',
    },
    {
      name: 'WrCommandItem',
      description: '`{ id, label, description?, group?, icon?, keywords?, shortcut?, action? }`',
      type: 'interface',
      default: '—',
    },
  ];
}
