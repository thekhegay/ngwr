import { Component } from '@angular/core';

import { WrAnchor, type WrAnchorLink } from 'ngwr/anchor';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-anchor-page',
  templateUrl: './anchor.html',
  imports: [WrAnchor, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class AnchorPageComponent {
  protected readonly links: readonly WrAnchorLink[] = [
    { id: 'anchor-intro', label: 'Introduction' },
    {
      id: 'anchor-usage',
      label: 'Usage',
      children: [
        { id: 'anchor-basic', label: 'Basic' },
        { id: 'anchor-advanced', label: 'Advanced' },
      ],
    },
    { id: 'anchor-api', label: 'API' },
  ];

  protected readonly snippet = `<wr-anchor [links]="links" [offset]="80" />`;
}
