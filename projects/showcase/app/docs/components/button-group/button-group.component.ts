import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrButtonModule } from 'ngwr/button';
import { WrTagModule } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
  standalone: true,
  selector: 'ngwr-button-group',
  templateUrl: './button-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CodeComponent, SnippetComponent, WrButtonModule, WrTagModule],
})
export class ButtonGroupComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly pageTitle = 'Button Group';
  protected readonly pageDescription = 'A component to group buttons';

  protected readonly code = {
    import: `import{WrButtonModule}from'ngwr/button';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrButtonModule,],})\nexport class MyComponent {}`,
    usage: '<wr-btn-group>\n<wr-btn>Button</wr-btn>\n<wr-btn>Button</wr-btn>\n<wr-btn>Button</wr-btn>\n</wr-btn-group>',
    colors:
      '<wr-btn color="primary"></wr-btn>\n<wr-btn color="secondary"></wr-btn>\n<wr-btn color="success"></wr-btn>\n<wr-btn color="warning"></wr-btn>\n<wr-btn color="danger"></wr-btn>\n<wr-btn color="light"></wr-btn>\n<wr-btn color="medium"></wr-btn>\n<wr-btn color="dark"></wr-btn>',
    outlined: '<wr-btn outlined></wr-btn>',
    rounded: '<wr-btn rounded></wr-btn>',
    size: '<wr-btn>Default size</wr-btn>\n<wr-btn size="small">Small size</wr-btn>',
    iconProvider:
      "import{provideWrIcons,wrIconAdd}from'ngwr/icon';\n//...\n@Component({\n//...\nimports: [\n//...\nWrButtonComponent],\nproviders: [\n//...\nprovideWrIcons([wrIconAdd])],})\nexport class MyComponent {}",
    icon: '<wr-btn icon="add" iconPosition="start">Add</wr-btn>',
    disabled: '<wr-btn disabled></wr-btn>',
    loading:
      '<wr-btn loading>Loading</wr-btn>\n<wr-btn [loading]="true" color="dark" rounded>You can use long text</wr-btn>\n<wr-btn loading icon="add" color="secondary" outlined>Loading with icon</wr-btn>',
    loadingDisabled: `<wr-btn [isDisabledWhenLoading]="false">Enabled</wr-btn>`,
    block: '<wr-btn block></wr-btn>',
    styling:
      ':root {\n--wr-btn-color: var(--wr-color-dark);\n--wr-btn-bg-color: var(--wr-color-white);\n--wr-btn-border-color: var(--wr-color-light-lighter);\n--wr-btn-icon-size: 1rem;\n--wr-btn-font-size: 0.875rem;\n--wr-btn-font-weight: 500;\n--wr-btn-font-family: var(--wr-font-family-base);\n--wr-btn-line-height: 1.25rem;\n--wr-btn-border-radius: 0.375rem;\n--wr-btn-padding-y: 0.375rem;\n--wr-btn-padding-x: 1rem;\n}',
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle([this.pageTitle, 'Components']);
    this.seoService.setDescription(this.pageDescription);
    this.seoService.setKeywords(['button', 'wr-btn']);
  }
}
