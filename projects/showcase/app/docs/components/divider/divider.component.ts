import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';

import { wrThemeColors } from 'ngwr/cdk/types';
import { WrDividerModule } from 'ngwr/divider';
import { WrTagComponent } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';
import { routes } from '#routing';

@Component({
    selector: 'ngwr-divider',
    templateUrl: './divider.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [RouterLink, WrDividerModule, WrTagComponent, CodeComponent, SnippetComponent]
})
export class DividerComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly pageTitle = 'Divider';
  protected readonly pageDescription = 'A divider line separates different content.';
  protected readonly colors = wrThemeColors;
  protected readonly routes = routes;

  protected readonly code = {
    import: `import{WrDividerModule}from'ngwr/divider';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrDividerModule,],})\nexport class MyComponent {}`,
    usage: `<wr-divider />`,
    styling: `:root {\n--wr-divider-width-base: 1px;\n--wr-divider-color-base: var(--wr-color-light);\n--wr-divider-margin-top-base: 0.5rem;\n--wr-divider-margin-bottom-base: 0.5rem;}`,
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle([this.pageTitle, 'Components']);
    this.seoService.setDescription(this.pageDescription);
    this.seoService.setKeywords(['divider', 'wr-divider']);
  }
}
