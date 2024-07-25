import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit, ViewEncapsulation } from '@angular/core';

import { provideWrIcons, WrIconComponent, wrIconSet } from 'ngwr/icon';
import { WrTagComponent } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';

@Component({
  standalone: true,
  selector: 'ngwr-icon',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CdkCopyToClipboard, WrTagComponent, WrIconComponent, CodeComponent, SnippetComponent],
  providers: [provideWrIcons(wrIconSet)],
})
export class IconComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly title = 'Icon';
  protected readonly description = 'Component to display icons';
  protected readonly icons = wrIconSet.filter(i => !i.name.startsWith('logo'));
  protected readonly logoIcons = wrIconSet.filter(i => i.name.startsWith('logo'));

  protected readonly code = {
    import: `import{WrIconModule}from'ngwr/icon';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrIconModule,],})\nexport class MyComponent {}`,
    provider: `//...\nimport{provideWrIcons,logoAngular}from'ngwr/icon';\n//...\n@Component({\n//...\nproviders: [\n//...\nprovideWrIcons([logoAngular]),],})\nexport class MyComponent {}`,
    usage: '<wr-icon name="logo-angular" />',
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle([this.title, 'Components']);
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['icon', 'wr-icon']);
  }

  camelize(value: string): string {
    return value.replace(/-./g, x => x[1].toUpperCase());
  }
}
