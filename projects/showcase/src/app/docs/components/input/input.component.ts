import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { SeoService } from 'showcase/@core/services';

@Component({
  selector: 'ngwr-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent implements OnInit {
  readonly description = 'Basic text component used to provide or change data.';

  readonly importCode =
    "import { WrInputModule } from 'ngwr/input';\n\n@NgModule({\n  imports: [\n    // ...\n    WrInputModule,\n  ],\n  // ...\n})\nexport class MyModule {}";

  readonly exampleCode =
    '<wr-input value="Basic input usage"></wr-input>\n<wr-input [ngModel]="\'Basic input usage\'"></wr-input>\n<wr-input formControlName="formControlName"></wr-input>';
  readonly prefixSuffixCode = '<wr-input value="Input value" prefix="Prefix" suffix="Suffix"></wr-input>';
  readonly passwordCode = '<wr-input value="Password input" type="password" passwordIcons></wr-input>';
  readonly disabledCode = '<wr-input value="Disabled" disabled></wr-input>';
  readonly readonlyCode = '<wr-input value="Readonly" readonly></wr-input>';
  readonly ngModelChangeReturn = 'EventEmitter<any>';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Input');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['input', 'wr-input']);
  }
}
