import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { wrThemeColors } from 'ngwr/core/color';
import { SeoService } from '#core/services';

@Component({
  selector: 'ngwr-alert',
  templateUrl: 'alert.component.html',
  styleUrls: ['alert.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertComponent implements OnInit {
  readonly description: string = 'Alert component for feedback.';
  readonly colors = wrThemeColors;

  readonly importCode: string =
    "import { WrAlertModule } from 'ngwr/alert';\n\n@NgModule({\n  imports: [\n    // ...\n    WrAlertModule,\n  ],\n  // ...\n})\nexport class MyModule {}";
  readonly usageCode: string = `<wr-alert></wr-alert>`;
  readonly colorsCode: string =
    '<wr-alert color="primary"></wr-alert>\n<wr-alert color="secondary"></wr-alert>\n<wr-alert color="success"></wr-alert>\n<wr-alert color="warning"></wr-alert>\n<wr-alert color="danger"></wr-alert>\n<wr-alert color="light"></wr-alert>\n<wr-alert color="medium"></wr-alert>\n<wr-alert color="dark"></wr-alert>';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle(['Alert', 'Components']);
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['alert', 'wr-alert']);
  }
}
