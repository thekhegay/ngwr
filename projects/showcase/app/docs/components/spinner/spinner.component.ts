import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit } from '@angular/core';

import { WrSpinnerComponent } from 'ngwr/spinner';
import { WrTagComponent } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
  standalone: true,
  selector: 'ngwr-spinner',
  templateUrl: './spinner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrSpinnerComponent, WrTagComponent, CodeComponent, SnippetComponent],
})
export class SpinnerComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly pageTitle = 'Spinner';
  protected readonly pageDescription = 'A spinner component for displaying loading state.';

  protected readonly code = {
    import: `import{WrSpinnerComponent}from'ngwr/spinner';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrSpinnerComponent,],})\nexport class MyComponent {}`,
    usage: `<wr-spinner />`,
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle([this.pageTitle, 'Components']);
    this.seoService.setDescription(this.pageDescription);
    this.seoService.setKeywords(['spinner', 'wr-spinner']);
  }
}
