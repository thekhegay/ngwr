import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { SeoService } from 'showcase/@core/services';

@Component({
  selector: 'ngwr-form',
  templateUrl: './form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormComponent implements OnInit {
  readonly description = 'Form is used to collect, validate, and submit the user input.';

  readonly importCode =
    "import { WrFormModule } from 'ngwr/form';\n\n@NgModule({\n  imports: [\n    // ...\n    WrFormModule,\n  ],\n  // ...\n})\nexport class MyModule {}";
  readonly usageCode =
    '<wr-form-item>\n    <label>Username</label>\n    <wr-input placeholder="Username"></wr-input>\n</wr-form-item>';
  readonly errorCode =
    '<wr-form-item [hasError]="true">\n    <label></label>\n    <wr-input></wr-input>\n    <wr-form-error>Username is required</wr-form-error>\n</wr-form-item>\n';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Form');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['form', 'wr-form-item', 'wr-form-error']);
  }
}
