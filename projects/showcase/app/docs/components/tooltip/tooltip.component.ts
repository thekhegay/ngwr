import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { SeoService } from '#core/services';

@Component({
  selector: 'ngwr-tooltip',
  templateUrl: './tooltip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipComponent implements OnInit {
  readonly description = '';

  readonly importCode: string =
    "import { WrTooltipModule } from 'ngwr/tooltip';\n\n@NgModule({\n  imports: [\n    // ...\n    WrTooltipModule,\n  ],\n  // ...\n})\nexport class MyModule {}";
  readonly usageCode = '<wr-btn wrTooltip="Example tooltip">Hover to display tooltip</wr-btn>';

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Tooltip');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['tooltip', 'wr-tooltip']);
  }
}
