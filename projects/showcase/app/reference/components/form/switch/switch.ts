import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrSwitch } from 'ngwr/switch';

import { DocApiComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-switch-page',
  templateUrl: './switch.html',
  imports: [FormsModule, WrSwitch, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocApiComponent],
})
export default class SwitchPageComponent {
  protected readonly enabled = signal(true);

  protected readonly snippets = {
    basic: `<wr-switch [(checked)]="enabled">Notifications</wr-switch>`,
    disabled: `<wr-switch [disabled]="true">Disabled</wr-switch>`,
  };

  protected readonly api = API.WrSwitch;
}
