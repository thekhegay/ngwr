import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrBreadcrumbItemComponent, WrBreadcrumbsComponent } from 'ngwr/breadcrumbs';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-breadcrumbs-page',
  templateUrl: './breadcrumbs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrBreadcrumbsComponent,
    WrBreadcrumbItemComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class BreadcrumbsPageComponent {
  protected readonly snippets = {
    install: `import { WrBreadcrumbsComponent, WrBreadcrumbItemComponent } from 'ngwr/breadcrumbs';

@Component({ imports: [WrBreadcrumbsComponent, WrBreadcrumbItemComponent] })
export class MyComponent {}`,
    basic: `<wr-breadcrumbs>
  <wr-breadcrumb-item routerLink="/">Home</wr-breadcrumb-item>
  <wr-breadcrumb-item routerLink="/docs">Docs</wr-breadcrumb-item>
  <wr-breadcrumb-item>Breadcrumbs</wr-breadcrumb-item>
</wr-breadcrumbs>`,
    separator: `<wr-breadcrumbs separator="›">
  <wr-breadcrumb-item routerLink="/">Home</wr-breadcrumb-item>
  <wr-breadcrumb-item>Current</wr-breadcrumb-item>
</wr-breadcrumbs>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'separator', description: 'Symbol between items.', type: 'string', default: "'/'" },
  ];

  protected readonly itemApi: readonly DocApiRow[] = [
    {
      name: 'routerLink',
      description: 'Router target. Omit for the current/last item.',
      type: 'string | readonly string[] | null',
      default: 'null',
    },
  ];
}
