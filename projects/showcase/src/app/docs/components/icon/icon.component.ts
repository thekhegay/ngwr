import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { wrIconSet } from 'ngwr/icon';
import { SeoService } from 'showcase/@core/services';

@Component({
  selector: 'ngwr-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent implements OnInit {
  readonly icons = wrIconSet;
  readonly description = 'Component to display awesome icons.';

  readonly importCode =
    "import { WrIconModule } from 'ngwr/icon';\n\n@NgModule({\n  imports: [\n    // ...\n    WrIconModule.forRoot(),\n  ],\n  // ...\n})\nexport class RootModule {}";

  readonly usageCode = `<wr-icon name="discover"></wr-icon>`;

  constructor(private readonly seoService: SeoService) {}

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Icon');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['icon', 'wr-icon']);
  }
}
