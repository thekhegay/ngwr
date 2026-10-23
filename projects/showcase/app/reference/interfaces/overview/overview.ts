import { Component } from '@angular/core';

import {
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-interfaces-overview',
  templateUrl: './overview.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocSeeAlsoComponent],
})
export default class InterfacesOverviewPage {
  protected readonly snippet = `import type { WrSelectMode } from 'ngwr/select';
import type { Maybe } from 'ngwr/utils';

interface Filters {
  mode: WrSelectMode;
  owner: Maybe<string>;
}`;

  protected readonly related: readonly DocSeeAlsoLink[] = [
    { kind: 'Util', title: 'Catalog', url: ['/reference/interfaces', 'catalog'] },
    { kind: 'Util', title: 'Common types', url: ['/reference/interfaces', 'common'] },
    { kind: 'Util', title: 'Theme types', url: ['/reference/interfaces', 'theme'] },
  ];
}
