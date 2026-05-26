import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { add, cog, provideWrIcons, search } from 'ngwr/icon';
import { WrSpeedDial } from 'ngwr/speed-dial';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-speed-dial-page',
  templateUrl: './speed-dial.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrSpeedDial, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
  providers: [provideWrIcons([add, cog, search])],
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
