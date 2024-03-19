import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { wrThemeColors } from 'ngwr/core/color';
import { SeoService } from '#core/services';

@Component({
  selector: 'ngwr-divider',
  templateUrl: './divider.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividerComponent implements OnInit {
  readonly description: string = 'A divider line separates different content.';
  readonly colors = wrThemeColors;

  readonly importCode: string =
    "import { WrDividerModule } from 'ngwr/divider';\n\n@NgModule({\n  imports: [\n    // ...\n    WrDividerModule,\n  ],\n  // ...\n})\nexport class MyModule {}";
  readonly usageCode: string = `<wr-divider></wr-divider>`;
  readonly stylingCode: string =
    '--wr-divider-width-base: 1px;\n--wr-divider-color-base: var(--wr-color-light);\n--wr-divider-margin-top-base: 0.5rem;\n--wr-divider-margin-bottom-base: 0.5rem;';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle(['Divider', 'Components']);
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['divider', 'wr-divider']);
  }
}
