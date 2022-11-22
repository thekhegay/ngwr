import { Component, Inject } from '@angular/core';
import { WR_DIALOG_DATA, WrDialogRef } from 'ngwr/dialog';
import { SafeAny } from 'ngwr/core/types';

@Component({
  selector: 'app-components-dialog-example',
  templateUrl: './dialog-component.template.html',
})
export class DialogExampleComponent {
  constructor(
    private readonly dialogRef: WrDialogRef<DialogExampleComponent>,
    @Inject(WR_DIALOG_DATA) public data: SafeAny,
  ) {}
}
