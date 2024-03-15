import { ChangeDetectionStrategy, Component, OnInit, ViewContainerRef } from '@angular/core';

import { WrDialogService } from 'ngwr/dialog';
import { SeoService } from '#core/services';

import { DialogExampleComponent } from './dialog-example/dialog-example.component';

@Component({
  selector: 'ngwr-dialog',
  templateUrl: './dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent implements OnInit {
  readonly description: string = 'A modal dialog.';

  readonly importCode: string =
    "import { WrDialogModule } from 'ngwr/dialog';\n\n@NgModule({\n  imports: [\n    // ...\n    WrDialogModule,\n  ],\n  // ...\n})\nexport class MyModule {}";
  readonly usageCode: string =
    "import { WrDialogService } from 'ngwr/dialog';\n\nconstructor(\n  private readonly dialogService: WrDialogService,\n  private readonly vcr: ViewContainerRef,\n) {}\n  \nonDialogOpen(): void {\n  this.dialogService.open({\n    component: DialogExampleComponent,\n    viewContainerRef: this.vcr,\n  });\n}";

  constructor(
    private readonly dialogService: WrDialogService,
    private readonly seoService: SeoService,
    private readonly vcr: ViewContainerRef
  ) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Dialog');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['dialog', 'wr-dialog']);
  }

  onDialogOpen(): void {
    this.dialogService.open<DialogExampleComponent>({
      component: DialogExampleComponent,
      viewContainerRef: this.vcr,
    });
  }
}
