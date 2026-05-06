import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { provideWrIcons, WrIconComponent, wrIconSet } from 'ngwr/icon';

import { MetaService } from '#core/services';
import { CodeSnippetComponent } from '#core/components';

@Component({
  standalone: true,
  selector: 'ngwr-icon',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrIconComponent, CodeSnippetComponent],
  providers: [provideWrIcons(wrIconSet)],
})
export default class IconComponent implements OnInit {
  private readonly metaService = inject(MetaService);

  protected readonly pageTitle = 'Icon';
  protected readonly pageDescription = 'Component to display icons';

  // protected readonly icons = wrIconSet.filter(i => !i.name.startsWith('logo'));
  // protected readonly logoIcons = wrIconSet.filter(i => i.name.startsWith('logo'));
  //
  // protected readonly code = {
  //   import: `import{WrIconComponent}from'ngwr/icon';`,
  //   component: `@Component({\n//...\nimports: [\n//...\nWrIconComponent,],})\nexport class MyComponent {}`,
  //   provider: `//...\nimport{provideWrIcons,logoAngular}from'ngwr/icon';\n//...\n@Component({\n//...\nproviders: [\n//...\nprovideWrIcons([logoAngular]),],})\nexport class MyComponent {}`,
  //   usage: '<wr-icon name="logo-angular" />',
  // };

  ngOnInit(): void {
    this.metaService.setCanonicalURL();
    this.metaService.setTitle([this.pageTitle, 'Components']);
    this.metaService.setDescription(this.pageDescription);
    this.metaService.setKeywords(['icon', 'wr-icon']);
  }
  //
  // camelize(value: string): string {
  //   return value.replace(/-./g, x => x[1].toUpperCase());
  // }
}
