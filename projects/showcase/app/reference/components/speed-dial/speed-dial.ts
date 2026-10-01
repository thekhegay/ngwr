import { Component, signal } from '@angular/core';

import { Plus, Search, Settings } from 'lucide';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrSpeedDial, type WrSpeedDialDirection } from 'ngwr/speed-dial';
import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-speed-dial-page',
  templateUrl: './speed-dial.html',
  styleUrl: './speed-dial.scss',
  imports: [
    WrSpeedDial,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [provideWrIcons(lucideIcons({ add: Plus, search: Search, cog: Settings }))],
})
export default class SpeedDialPageComponent {
  protected readonly lastPick = signal<string>('');

  protected readonly actions = [
    { id: 'new', label: 'New', icon: 'add' as const },
    { id: 'search', label: 'Search', icon: 'search' as const },
    { id: 'settings', label: 'Settings', icon: 'cog' as const },
  ];

  protected readonly directions: readonly WrSpeedDialDirection[] = ['up', 'down', 'left', 'right'];

  protected onPick(action: { id: string; label: string }): void {
    this.lastPick.set(action.label);
  }

  protected readonly snippets = {
    install: `import { WrSpeedDial } from 'ngwr/speed-dial';

@Component({ imports: [WrSpeedDial] })
export class MyComponent {
  protected readonly actions = [
    { id: 'new', label: 'New', icon: 'add' },
    { id: 'search', label: 'Search', icon: 'search' },
  ];

  protected onPick(action: WrSpeedDialAction): void {
    console.log(action.id);
  }
}`,
    basic: `<wr-speed-dial [actions]="actions" (pick)="onPick($event)" />`,
    direction: `<wr-speed-dial [actions]="actions" direction="up" />
<wr-speed-dial [actions]="actions" direction="down" />
<wr-speed-dial [actions]="actions" direction="left" />
<wr-speed-dial [actions]="actions" direction="right" />`,
  };

  protected readonly typeSnippet = `interface WrSpeedDialAction {
  id: string;
  label: string;
  icon?: WrIconName;
}

type WrSpeedDialDirection = 'up' | 'down' | 'left' | 'right';`;

  protected readonly api = API.WrSpeedDial;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrSpeedDialAction', description: 'Per-button action shown when the dial expands.', type: 'interface' },
    { name: 'id', description: 'Stable identifier for the action.', type: 'string', required: true, sub: true },
    { name: 'label', description: 'Tooltip / accessible label.', type: 'string', required: true, sub: true },
    { name: 'icon', description: 'Button icon.', type: 'WrIconName', sub: true },
    {
      name: 'WrSpeedDialDirection',
      description: 'Which way the fan opens.',
      type: "'up' | 'down' | 'left' | 'right'",
    },
  ];
}
