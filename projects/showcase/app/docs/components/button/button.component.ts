import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrButtonComponent } from 'ngwr/button';
import { wrThemeColors } from 'ngwr/cdk/types';
import { provideWrIcons, add, addCircle, alertCircle, copyOutline, download, warning } from 'ngwr/icon';
import { WrTagComponent } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';
import { routes } from '#routing';

@Component({
    selector: 'ngwr-button',
    templateUrl: './button.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, WrButtonComponent, WrTagComponent, CodeComponent, SnippetComponent],
    providers: [provideWrIcons([addCircle, add, copyOutline, download, warning, alertCircle])]
})
export class ButtonComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly pageTitle = 'Button';
  protected readonly pageDescription = 'A component to trigger an operations';
  protected readonly colors = wrThemeColors;
  protected readonly routes = routes;
  protected readonly loading = signal(false);

  protected readonly code = {
    import: `import{WrButtonModule}from'ngwr/button';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrButtonModule,],})\nexport class MyComponent {}`,
    usage: `<wr-btn>Button Component</wr-btn>\n<button wr-btn>Native Button</button>\n<a wr-btn>Anchor Button</a>`,
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
