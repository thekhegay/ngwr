import { Component } from '@angular/core';

import { colors } from '../../@shared';

@Component({
  selector: 'site-components-checkbox',
  templateUrl: './checkbox.component.html'
})
export class CheckboxComponent {
  readonly colors = colors;
  readonly checkboxCode = `<wr-checkbox [ngModel]="true" (checkedChange)="$event" checked disabled></wr-checkbox>`;
}
