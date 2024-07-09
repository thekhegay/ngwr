import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit } from '@angular/core';

import { WrSpinnerModule } from 'ngwr/spinner';
import { WrTagModule } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';
import { WrButtonComponent } from 'ngwr/button';

@Component({
  standalone: true,
  selector: 'ngwr-spinner',
  templateUrl: './spinner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrSpinnerModule, WrTagModule, CodeComponent, SnippetComponent, WrButtonComponent],
})
export class SpinnerComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly pageTitle = 'Spinner';
  protected readonly pageDescription = 'A spinner component for displaying loading state.';

  protected readonly code = {
    import: `import{WrSpinnerModule}from'ngwr/spinner';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrSpinnerModule,],})\nexport class MyComponent {}`,
    usage: `<wr-spinner />`,
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle([this.pageTitle, 'Components']);
    this.seoService.setDescription(this.pageDescription);
    this.seoService.setKeywords(['spinner', 'wr-spinner']);
  }
}
