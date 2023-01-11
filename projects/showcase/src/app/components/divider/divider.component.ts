import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { SeoService } from 'showcase/@core/services';

@Component({
  selector: 'ngwr-divider',
  templateUrl: './divider.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividerComponent implements OnInit {
  readonly description: string = 'A divider line separates different content.';

  readonly importCode: string =
    "import { WrDividerModule } from 'ngwr/divider';\n\n@NgModule({\n  imports: [\n    // ...\n    WrDividerModule,\n  ],\n  // ...\n})\nexport class MyModule {}";
  readonly usageCode = `<wr-divider></wr-divider>`;

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Divider');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['divider', 'wr-divider']);
  }
}
