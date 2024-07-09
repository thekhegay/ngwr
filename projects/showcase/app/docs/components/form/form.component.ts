import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrFormModule } from 'ngwr/form';
import { WrInputModule } from 'ngwr/input';
import { WrTagModule } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';
import { routes } from '#routing';

@Component({
  standalone: true,
  selector: 'ngwr-form',
  templateUrl: './form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, WrFormModule, WrInputModule, WrTagModule, CodeComponent, SnippetComponent],
})
export class FormComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);
  protected readonly pageTitle = 'Form';
  protected readonly pageDescription = 'Form is used to collect, validate, and submit the user input.';
  protected readonly routes = routes;

  protected readonly code = {
    import: `import{WrFormModule}from'ngwr/form';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrFormModule,],})\nexport class MyComponent {}`,
    usage: `<wr-form-item>\n<label>Username</label>\n<wr-input placeholder="Username" />\n</wr-form-item>`,
    errorCode: `<wr-form-item [hasError]="true">\n<label></label>\n<wr-input />\n<wr-form-error>Username is required</wr-form-error>\n</wr-form-item>`,
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle(this.pageTitle);
    this.seoService.setDescription(this.pageDescription);
    this.seoService.setKeywords(['form', 'wr-form-item', 'wr-form-error']);
  }
}
