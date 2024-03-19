import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { wrThemeColors } from 'ngwr/core/color';
import { SeoService } from '#core/services';

@Component({
  selector: 'ngwr-tag',
  templateUrl: './tag.component.html',
  styleUrls: ['./tag.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagComponent implements OnInit {
  readonly colors = wrThemeColors;
  readonly description: string = 'A component to trigger an operations with custom styles, colors, states and more.';

  readonly importCode: string =
    "import { WrTagModule } from 'ngwr/tag';\n\n@NgModule({\n  imports: [\n    // ...\n    WrTagModule,\n  ],\n  // ...\n})\nexport class MyModule {}";

  readonly colorsCode =
    '<wr-tag color="primary"></wr-tag>\n<wr-tag color="secondary"></wr-tag>\n<wr-tag color="success"></wr-tag>\n<wr-tag color="warning"></wr-tag>\n<wr-tag color="danger"></wr-tag>\n<wr-tag color="light"></wr-tag>\n<wr-tag color="medium"></wr-tag>\n<wr-tag color="dark"></wr-tag>';
  readonly outlinedCode =
    '<wr-tag outlined></wr-tag>\n<wr-tag color="secondary" outlined></wr-tag>\n<wr-tag color="success" outlined></wr-tag>\n<wr-tag color="warning" outlined></wr-tag>\n<wr-tag color="danger" outlined></wr-tag>\n<wr-tag color="light" outlined></wr-tag>\n<wr-tag color="medium" outlined></wr-tag>\n<wr-tag color="dark" outlined></wr-tag>';
  readonly roundedCode =
    '<wr-tag rounded></wr-tag>\n<wr-tag color="secondary" rounded></wr-tag>\n<wr-tag color="success" rounded></wr-tag>\n<wr-tag color="warning" rounded></wr-tag>\n<wr-tag color="danger" rounded></wr-tag>\n<wr-tag color="light" rounded></wr-tag>\n<wr-tag color="medium" rounded></wr-tag>\n<wr-tag color="dark" rounded></wr-tag>';
  readonly transparentCode = '<wr-tag transparent></wr-tag>';
  readonly hoverableCode = '<wr-tag hoverable></wr-tag>';
  readonly iconsCode =
    '<wr-tag icon="add">Add</wr-tag>\n<wr-tag icon="user" outlined>Username</wr-tag>\n<wr-tag icon="chevron-down" iconPosition="end" color="secondary">Expand</wr-tag>\n<wr-tag icon="alert-circle" transparent color="danger">Warning</wr-tag>\n<wr-tag transparent color="medium" loading iconPosition="end">Loading</wr-tag>';
  readonly loadingCode =
    '<wr-tag loading>Loading</wr-tag>\n<wr-tag [loading]="true" color="dark" rounded iconPosition="end">Loading</wr-tag>\n<wr-tag [loading]="true" color="success" transparent>Loading</wr-tag>';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Tag');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['tag', 'wr-tag']);
  }
}
