import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit } from '@angular/core';

import { WrAlertComponent } from 'ngwr/alert';
import { WrTagComponent } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
  standalone: true,
  selector: 'ngwr-alert',
  templateUrl: './alert.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeComponent, SnippetComponent, WrAlertComponent, WrTagComponent],
})
export class AlertComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly pageTitle = 'Alert';
  protected readonly pageDescription = 'Component that shows some feedback';

  protected readonly code = {
    import: `import{WrAlertComponent}from'ngwr/alert';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrAlertComponent,],})\nexport class MyComponent {}`,
    usage: '<wr-alert title="Title" message="Message" />',
    types: `<wr-alert type="info" title="Info" />\n<wr-alert type="success" title="Success" />\n<wr-alert type="warning" title="Warning" />\n<wr-alert type="danger" title="Danger" />`,
    closeable: '<wr-alert title="Closeable" closeable/>',
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle([this.pageTitle, 'Components']);
    this.seoService.setDescription(this.pageDescription);
    this.seoService.setKeywords(['alert', 'wr-alert']);
  }
}
