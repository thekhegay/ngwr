import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { wrThemeColors } from 'ngwr/core/color';
import { SeoService } from 'showcase/@core/services';

@Component({
  selector: 'ngwr-skeleton',
  templateUrl: './skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent implements OnInit {
  readonly colors = wrThemeColors;
  readonly description = 'A visual placeholder component.';

  readonly importCode =
    "import { WrSkeletonModule } from 'ngwr/input';\n\n@NgModule({\n  imports: [\n    // ...\n    WrSkeletonModule,\n  ],\n  // ...\n})\nexport class MyModule {}";

  readonly exampleCode =
    '<wr-skeleton style="width:25%; height:1rem"></wr-skeleton>\n<wr-skeleton style="width:50%; height:1rem"></wr-skeleton>\n<wr-skeleton style="width:75%; height:1rem"></wr-skeleton>\n<wr-skeleton style="width:100%; height:1rem"></wr-skeleton>';
  readonly colorsCode =
    '<wr-skeleton color="primary"></wr-skeleton>\n<wr-skeleton color="secondary"></wr-skeleton>\n<wr-skeleton color="success"></wr-skeleton>\n<wr-skeleton color="warning"></wr-skeleton>\n<wr-skeleton color="danger"></wr-skeleton>\n<wr-skeleton color="light"></wr-skeleton>\n<wr-skeleton color="medium"></wr-skeleton>\n<wr-skeleton color="dark"></wr-skeleton>';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Skeleton');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['skeleton', 'loader', 'loading', 'wr-skeleton']);
  }
}
