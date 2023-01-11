import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { SeoService } from 'showcase/@core/services';

@Component({
  selector: 'ngwr-spinner',
  templateUrl: './spinner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerComponent implements OnInit {
  readonly description = 'A spinner for displaying loading state.';

  readonly importCode =
    "import { WrSpinModule } from 'ngwr/input';\n\n@NgModule({\n  imports: [\n    // ...\n    WrSpinModule,\n  ],\n  // ...\n})\nexport class MyModule {}";
  readonly exampleCode = '<wr-spin></wr-spin>';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Spinner');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['spinner', 'wr-spinner']);
  }
}
