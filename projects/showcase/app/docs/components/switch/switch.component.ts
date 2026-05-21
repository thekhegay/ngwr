import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrSwitchComponent } from 'ngwr/switch';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-switch-page',
  templateUrl: './switch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrSwitchComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class SwitchPageComponent {
  protected readonly enabled = signal(true);

  protected readonly snippets = {
    install: `import { WrSwitchComponent } from 'ngwr/switch';

@Component({ imports: [WrSwitchComponent, FormsModule] })
export class MyComponent {}`,
    basic: `<wr-switch [(ngModel)]="enabled">Notifications</wr-switch>`,
    disabled: `<wr-switch [disabled]="true">Disabled</wr-switch>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'disabled', description: 'Disable interaction.', type: 'boolean', default: 'false' },
  ];
}
