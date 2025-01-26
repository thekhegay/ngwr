import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { wrThemeColors } from 'ngwr/cdk/types';
import { WrTagComponent } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
  standalone: true,
  selector: 'ngwr-tag',
  templateUrl: './tag.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, WrTagComponent, CodeComponent, SnippetComponent],
})
export class TagComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly pageTitle = 'Tag';
  protected readonly pageDescription: string = 'Tag component';

  protected readonly colors = wrThemeColors;

  protected readonly code = {
    import: `import{WrTagComponent}from'ngwr/tag';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrTagComponent,],})\nexport class MyComponent {}`,
    usage: `<wr-tag>Tag Component</wr-tag>`,
    colors:
      '<wr-tag color="primary"></wr-tag>\n<wr-tag color="secondary"></wr-tag>\n<wr-tag color="success"></wr-tag>\n<wr-tag color="warning"></wr-tag>\n<wr-tag color="danger"></wr-tag>\n<wr-tag color="light"></wr-tag>\n<wr-tag color="medium"></wr-tag>\n<wr-tag color="dark"></wr-tag>',
    outlined: '<wr-tag outlined></wr-tag>',
    rounded: '<wr-tag rounded></wr-tag>',
    transparent: '<wr-tag transparent></wr-tag>',
    hoverable: '<wr-tag hoverable></wr-tag>',
    iconProvider:
      "import{provideWrIcons,wrIconAdd}from'ngwr/icon';\n//...\n@Component({\n//...\nimports: [\n//...\nWrButtonComponent],\nproviders: [\n//...\nprovideWrIcons([wrIconAdd])],})\nexport class MyComponent {}",
    icon: '<wr-tag icon="add" iconPosition="start">Add</wr-tag>',
    loading:
      '<wr-tag loading>Loading</wr-tag>\n<wr-tag [loading]="true" color="dark" rounded>You can use long text</wr-tag>\n<wr-tag loading icon="add" color="secondary" outlined>Loading with icon</wr-tag>',
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle(this.pageTitle);
    this.seoService.setDescription(this.pageDescription);
    this.seoService.setKeywords(['tag', 'wr-tag']);
  }
}
