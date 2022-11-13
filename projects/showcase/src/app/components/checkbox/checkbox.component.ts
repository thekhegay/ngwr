import { Component } from '@angular/core';

@Component({
  selector: 'app-components-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss']
})
export class CheckboxComponent {
  readonly usageCode = `<wr-checkbox [ngModel]="true"></wr-checkbox>`;
  readonly disabledCode = '<wr-checkbox [disabled]="true"></wr-checkbox>';
  readonly valueChangeCode = '<wr-checkbox [ngModel]="false" (ngModelChange)="onValueChange($event)"></wr-checkbox>';
  readonly ngModelChangeReturn = 'EventEmitter<any>';

  onValueChange(value: boolean): void {
    console.log(`New checkbox value is ${value}`);
    alert(`New checkbox value is ${value}`);
  }
}
