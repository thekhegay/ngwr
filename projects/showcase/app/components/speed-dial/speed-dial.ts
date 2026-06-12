import { Component, signal } from '@angular/core';

import { Plus, Settings } from 'lucide';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrSpeedDial } from 'ngwr/speed-dial';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';

@Component({
  selector: 'ngwr-speed-dial-page',
  templateUrl: './speed-dial.html',
  imports: [WrSpeedDial, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
  providers: [provideWrIcons(lucideIcons({ add: Plus, cog: Settings }))],
})
export default class SpeedDialPageComponent {
  protected readonly lastPick = signal<string>('');
  protected readonly actions = [
    { id: 'new', label: 'New', icon: 'add' as const },
    { id: 'search', label: 'Search', icon: 'search' as const },
    { id: 'settings', label: 'Settings', icon: 'cog' as const },
  ];

  protected onPick(action: { id: string; label: string }): void {
    this.lastPick.set(action.label);
  }

  protected readonly snippet = `<wr-speed-dial [actions]="actions" (pick)="onPick($event)" />`;

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrSpeedDialAction', description: 'Per-button action shown when the dial expands.', type: 'interface' },
    { name: 'id', description: 'Stable identifier, emitted via (action).', type: 'string', required: true, sub: true },
    { name: 'label', description: 'Tooltip / accessible label.', type: 'string', required: true, sub: true },
    { name: 'icon', description: 'Button icon.', type: 'WrIconName', sub: true },
  ];
}
