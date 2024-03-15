import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { wrThemeColors } from 'ngwr/core/color';
import { SeoService } from '#core/services';

@Component({
  selector: 'ngwr-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent implements OnInit {
  readonly description: string = 'A component to trigger an operations with custom styles, colors, states and more.';
  readonly colors = wrThemeColors;

  readonly componentCode: string = '<wr-btn>';
  readonly importCode: string =
    "import { WrButtonModule } from 'ngwr/button';\n\n@NgModule({\n  imports: [\n    // ...\n    WrButtonModule,\n  ],\n  // ...\n})\nexport class MyModule {}";
  readonly usageCode: string =
    '<wr-btn>Button Component</wr-btn>\n<button wr-btn>Native Button</button>\n<a wr-btn>Anchor Button</a>';
  readonly colorsCode: string =
    '<wr-btn color="primary"></wr-btn>\n<wr-btn color="secondary"></wr-btn>\n<wr-btn color="success"></wr-btn>\n<wr-btn color="warning"></wr-btn>\n<wr-btn color="danger"></wr-btn>\n<wr-btn color="light"></wr-btn>\n<wr-btn color="medium"></wr-btn>\n<wr-btn color="dark"></wr-btn>';
  readonly outlinedCode: string =
    '<wr-btn outlined></wr-btn>\n<wr-btn color="secondary" outlined></wr-btn>\n<wr-btn color="success" outlined></wr-btn>\n<wr-btn color="warning" outlined></wr-btn>\n<wr-btn color="danger" outlined></wr-btn>\n<wr-btn color="light" outlined></wr-btn>\n<wr-btn color="medium" outlined></wr-btn>\n<wr-btn color="dark" outlined></wr-btn>';
  readonly roundedCode: string =
    '<wr-btn rounded></wr-btn>\n<wr-btn color="secondary" rounded></wr-btn>\n<wr-btn color="success" rounded></wr-btn>\n<wr-btn color="warning" rounded></wr-btn>\n<wr-btn color="danger" rounded></wr-btn>\n<wr-btn color="light" rounded></wr-btn>\n<wr-btn color="medium" rounded></wr-btn>\n<wr-btn color="dark" rounded></wr-btn>';
  readonly sizeCode: string = '<wr-btn>Default size</wr-btn>\n<wr-btn size="small">Small size</wr-btn>';
  readonly fullWidthCode: string = '<wr-btn fullWidth></wr-btn>';
  readonly iconsCode: string =
    '<wr-btn icon="add">Add</wr-btn>\n<wr-btn icon="copy-outline" outlined>Copy</wr-btn>\n<wr-btn icon="download" iconPosition="end" color="secondary">Download</wr-btn>\n<wr-btn icon="warning" outlined rounded color="warning">Warning</wr-btn>\n<wr-btn icon="alert-circle" size="small" rounded color="danger">Alert</wr-btn>';
  readonly loadingCode: string =
    '<wr-btn loading>Loading</wr-btn>\n<wr-btn [loading]="true" color="dark" rounded>You can use long text</wr-btn>\n<wr-btn loading icon="add" color="secondary" outlined>Loading with icon</wr-btn>';
  readonly disabledCode: string = '<wr-btn disabled>Disabled</wr-btn>';
  readonly stylingCode: string =
    '--wr-btn-padding-y-base: 0.375rem;\n--wr-btn-padding-x-base: 1rem;\n--wr-btn-border-radius-base: 0.375rem;\n--wr-btn-font-size-base: 1rem;\n--wr-btn-line-height-base: 1.4;\n--wr-btn-font-weight-base: 500;\n--wr-btn-padding-y-small: 0.25rem;\n--wr-btn-padding-x-small: 0.625rem;\n--wr-btn-border-radius-small: 0.375rem;\n--wr-btn-font-size-small: 0.825rem;\n--wr-btn-rounded-border-radius: 50rem;\n--wr-btn-rounded-padding-y: 0.5rem;\n--wr-btn-rounded-padding-x: 1rem;\n--wr-btn-icon-size-base: 1rem;\n--wr-btn-icon-margin-base: 0.375rem;\n--wr-btn-border-width: 1.125px;';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle(['Button', 'Components']);
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['button', 'wr-btn']);
  }
}
