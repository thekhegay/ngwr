import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ngwr-dialog-example',
  templateUrl: './dialog-example.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogExampleComponent {}
