import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-with-render-on-navigation-page',
  templateUrl: './with-render-on-navigation.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent, DocSeeAlsoComponent],
})
export default class WithRenderOnNavigationPage {
  protected readonly snippet = `import { provideWr } from 'ngwr';
import { withRenderOnNavigation } from 'ngwr/utils/router';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideWr(withRenderOnNavigation())],
};`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'withRenderOnNavigation()',
      description:
        'A `provideWr()` feature. Runs a change detection tick in a microtask right after `NavigationEnd`, before the browser paints the routed page. The tick Angular had scheduled is cancelled by it, so nothing runs twice.',
      type: '() => WrFeature<"render-on-navigation">',
      default: '-',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Guide', title: 'Configuration', url: ['/docs', 'configuration'] },
    { kind: 'Util', title: 'wrQueryParam', url: ['/reference/utils', 'wr-query-param'] },
  ];
}
