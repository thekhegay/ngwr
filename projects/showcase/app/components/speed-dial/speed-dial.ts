import { Component, signal } from '@angular/core';

import { Plus, Search, Settings } from 'lucide';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrSpeedDial } from 'ngwr/speed-dial';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-speed-dial-page',
  templateUrl: './speed-dial.html',
  imports: [WrSpeedDial, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
  providers: [provideWrIcons(lucideIcons({ add: Plus, cog: Settings, search: Search }))],
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
}
