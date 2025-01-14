import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit } from '@angular/core';

import { wrThemeColors } from 'ngwr/cdk/types';
import { WrSkeletonModule } from 'ngwr/skeleton';
import { WrTagModule } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
  selector: 'ngwr-skeleton',
  templateUrl: './skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrSkeletonModule, WrTagModule, CodeComponent, SnippetComponent],
})
export class SkeletonComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly pageTitle = 'Skeleton';
  protected readonly pageDescription = 'A visual placeholder component.';

  protected readonly colors = wrThemeColors;

  protected readonly code = {
    import: `import{WrSkeletonModule}from'ngwr/skeleton';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrSkeletonModule,],})\nexport class MyComponent {}`,
    usage: `<wr-skeleton />`,
    colors:
      '<wr-skeleton color="primary" />\n<wr-skeleton color="secondary" />\n<wr-skeleton color="success" />\n<wr-skeleton color="warning" />\n<wr-skeleton color="danger" />\n<wr-skeleton color="light" />\n<wr-skeleton color="medium" />\n<wr-skeleton color="dark" />',
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle([this.pageTitle, 'Components']);
    this.seoService.setDescription(this.pageDescription);
    this.seoService.setKeywords(['skeleton', 'loader', 'loading', 'wr-skeleton']);
  }
}
