import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit, ViewEncapsulation } from '@angular/core';

import { provideWrIcons, WrIconComponent, wrIconSet } from 'ngwr/icon';
import { WrTagComponent } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
  standalone: true,
  selector: 'ngwr-icon',
  templateUrl: 'icon.component.html',
  styleUrls: ['icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [WrTagComponent, WrIconComponent, CodeComponent, SnippetComponent],
  providers: [provideWrIcons(wrIconSet)],
})
export class IconComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly title = 'Icon';
  protected readonly description = 'Component to display awesome icons';
  protected readonly icons = wrIconSet;

  protected readonly code = {
    import: `import{provideWrIcons,WrIconComponent,wrIconAdd}from'ngwr/icon';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrButtonComponent,],\nproviders: [\n//...\nproviderWrIcons([wrIconAdd]),],})\nexport class MyComponent {}`,
    usage: '<wr-icon [name]="add" />',
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle([this.title, 'Components']);
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['icon', 'wr-icon']);
  }

  camelize(value: string): string {
    const camel = value.replace(/-./g, x => x[1].toUpperCase());
    return `wrIcon${camel[0].toUpperCase() + camel.slice(1)}`;
  }
}
