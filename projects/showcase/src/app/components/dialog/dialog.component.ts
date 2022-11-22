import { Component, ViewContainerRef } from '@angular/core';
import { WrDialogRef, WrDialogService } from 'ngwr/dialog';
import { DialogExampleComponent } from './dialog-example/dialog-example.component';

@Component({
  selector: 'app-components-dialog',
  templateUrl: './dialog.component.html',
})
export class DialogComponent {
  readonly importCode: string = `import { WrDialogModule } from 'ngwr'`;

  constructor(
    private readonly _vcr: ViewContainerRef,
    private readonly dialogService: WrDialogService,
  ) {}

  onDialogOpen(): void {
    const dialogRef: WrDialogRef<DialogExampleComponent> = this.dialogService.open<DialogExampleComponent>({
      component: DialogExampleComponent,
      viewContainerRef: this._vcr,
      data: {
        value: true,
      },
    });

    dialogRef.afterClosed.subscribe(value => console.log(value));
  }
}
