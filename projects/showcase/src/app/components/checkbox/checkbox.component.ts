import { Component } from '@angular/core';

@Component({
  selector: 'site-components-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss']
})
export class CheckboxComponent {
  readonly checkboxCode = '<wr-checkbox checked></wr-checkbox>\n<wr-checkbox [ngModel]="false"></wr-checkbox>';
  readonly disabledCode = '<wr-checkbox [disabled]="true"></wr-checkbox>';
  readonly valueChangeCode = '<wr-checkbox [ngModel]="false" (valueChange)="onValueChange($event)"></wr-checkbox>';
  readonly valueChangeReturn = 'EventEmitter<boolean>';
  readonly ngModelChangeReturn = 'EventEmitter<any>';

  onValueChange(value: boolean): void {
    alert(`New checkbox value is ${value}`);
  }
}
