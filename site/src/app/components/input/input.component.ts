import { Component } from '@angular/core';

@Component({
  selector: 'site-components-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss']
})
export class InputComponent {
  readonly ngModelChangeReturn = 'EventEmitter<any>';
}
