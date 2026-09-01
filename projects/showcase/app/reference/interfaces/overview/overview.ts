import { Component } from '@angular/core';

import { DocPageComponent, DocSectionComponent, DocSeeAlsoComponent, type DocSeeAlsoLink } from '#core/components';

@Component({
  selector: 'ngwr-interfaces-overview',
  templateUrl: './overview.html',
  imports: [DocPageComponent, DocSectionComponent, DocSeeAlsoComponent],
})
export default class InterfacesOverviewPage {
  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Util',
      title: 'Catalog',
      url: ['/reference/interfaces', 'catalog'],
      description: 'The public types you meet most often, in one table.',
    },
    {
      kind: 'Util',
      title: 'Common types',
      url: ['/reference/interfaces', 'common'],
      description: 'The `Maybe<T>` and `SafeAny` aliases every entry point leans on.',
    },
    {
      kind: 'Util',
      title: 'Theme types',
      url: ['/reference/interfaces', 'theme'],
      description: 'The colour and mode unions — `WrColor`, `WrThemeMode`, `WrResolvedTheme`.',
    },
  ];
}
