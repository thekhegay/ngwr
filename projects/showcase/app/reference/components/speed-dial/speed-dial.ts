import { Component, signal } from '@angular/core';

import { Plus, Search, Settings } from 'lucide';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import { WrSpeedDial, type WrSpeedDialAction, type WrSpeedDialDirection } from 'ngwr/speed-dial';

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
    WrSegmented,
    WrSpeedDial,
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

  protected readonly actions: readonly WrSpeedDialAction[] = [
    { id: 'new', label: 'New', icon: 'add' },
    { id: 'search', label: 'Search', icon: 'search' },
    { id: 'settings', label: 'Settings', icon: 'cog' },
  ];

  protected readonly direction = signal<WrSpeedDialDirection>('up');

  protected readonly directionOptions: readonly WrSegmentedOption<WrSpeedDialDirection>[] = [
    { value: 'up', label: 'up' },
    { value: 'down', label: 'down' },
    { value: 'left', label: 'left' },
    { value: 'right', label: 'right' },
  ];

  protected onPick(action: WrSpeedDialAction): void {
    this.lastPick.set(action.label);
  }

  protected readonly snippets = {
    basic: `<wr-speed-dial [actions]="actions" (pick)="onPick($event)" />`,
    direction: `<wr-speed-dial [actions]="actions" direction="down" />`,
  };

  protected readonly typeSnippet = `interface WrSpeedDialAction {
  readonly id: string;
  readonly label: string;
  readonly icon?: WrIconName;
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
