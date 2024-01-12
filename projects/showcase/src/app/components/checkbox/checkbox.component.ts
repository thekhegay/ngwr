import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { SeoService } from 'showcase/@core/services';

@Component({
  selector: 'ngwr-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckboxComponent implements OnInit {
  readonly description: string = 'A two state checkbox.';

  readonly importCode: string =
    "import { WrCheckboxModule } from 'ngwr/checkbox';\n\n@NgModule({\n  imports: [\n    // ...\n    WrCheckboxModule,\n  ],\n  // ...\n})\nexport class MyModule {}";
  readonly usageCode: string = `<wr-checkbox [ngModel]="true"></wr-checkbox>`;
  readonly disabledCode: string = '<wr-checkbox [disabled]="true"></wr-checkbox>';
  readonly valueChangeCode: string =
    '<wr-checkbox [ngModel]="false" (ngModelChange)="onValueChange($event)"></wr-checkbox>';
  readonly ngModelChangeReturn: string = 'EventEmitter<any>';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle(['Checkbox', 'Components']);
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['checkbox', 'wr-checkbox']);
  }

  onValueChange(value: boolean): void {
    console.log(`New checkbox value is ${value}`);
    alert(`New checkbox value is ${value}`);
  }
}
