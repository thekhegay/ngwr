import { ChangeDetectionStrategy, Component, HostBinding, OnInit, ViewContainerRef } from '@angular/core';

import { WrButtonModule } from 'ngwr/button';
import { WrDialogModule, WrDialogService } from 'ngwr/dialog';
import { provideWrIcons, warning } from 'ngwr/icon';
import { WrTagModule } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

import { DialogExampleComponent } from './dialog-example/dialog-example.component';

@Component({
    selector: 'ngwr-dialog',
    templateUrl: './dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CodeComponent, SnippetComponent, WrButtonModule, WrDialogModule, WrTagModule],
    providers: [provideWrIcons([warning])]
})
export class DialogComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  protected readonly pageTitle = 'Dialog';
  protected readonly pageDescription: string = 'A modal dialog.';

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
    this.seoService.setTitle([this.pageTitle, 'Components']);
    this.seoService.setDescription(this.pageDescription);
    this.seoService.setKeywords(['dialog', 'wr-dialog']);
  }

  onDialogOpen(): void {
    this.dialogService.open({
      component: DialogExampleComponent,
      viewContainerRef: this.vcr,
    });
  }
}
