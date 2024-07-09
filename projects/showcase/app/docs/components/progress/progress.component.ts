import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { SeoService } from '#core/services';
import { wrThemeColors } from 'ngwr/cdk/types';
import { RouterLink } from '@angular/router';
import { WrTagModule } from 'ngwr/tag';
import { CodeComponent, SnippetComponent } from '#core/components';
import { WrProgressModule } from 'ngwr/progress';

@Component({
  standalone: true,
  selector: 'ngwr-progress',
  templateUrl: './progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, WrProgressModule, WrTagModule, CodeComponent, SnippetComponent],
})
export class ProgressComponent implements OnInit {
  readonly description: string = 'Display the current progress.';
  readonly colors = wrThemeColors;

  readonly importCode: string =
    "import { WrProgressModule } from 'ngwr/progress';\n\n@NgModule({\n  imports: [\n    // ...\n    WrProgressModule,\n  ],\n  // ...\n})\nexport class MyModule {}";
  readonly usageCode: string = `<wr-progress></wr-progress>`;
  readonly colorsCode: string =
    '<wr-progress color="primary"></wr-progress>\n<wr-progress color="secondary"></wr-progress>\n<wr-progress color="success"></wr-progress>\n<wr-progress color="warning"></wr-progress>\n<wr-progress color="danger"></wr-progress>\n<wr-progress color="light"></wr-progress>\n<wr-progress color="medium"></wr-progress>\n<wr-progress color="dark"></wr-progress>';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle(['Progress', 'Components']);
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['progress', 'wr-progress']);
  }

  generateRandomPercent(): number {
    return Math.floor(Math.random() * (100 + 1));
  }
}
