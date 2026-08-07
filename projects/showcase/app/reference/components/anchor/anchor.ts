import { Component } from '@angular/core';

import { WrAnchor, type WrAnchorLink } from 'ngwr/anchor';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
  type DocApiRow,
} from '#core/components';

@Component({
  selector: 'ngwr-anchor-page',
  templateUrl: './anchor.html',
  imports: [WrAnchor, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
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

  protected readonly typeSnippet = `interface WrAnchorLink {
  id: string;
  label: string;
  children?: readonly WrAnchorLink[];
}`;

  protected readonly api: readonly DocApiRow[] = [
    { name: 'links', description: 'Entries rendered in the rail.', type: 'readonly WrAnchorLink[]', default: '[]' },
    {
      name: 'offset',
      description: 'Pixels subtracted when scrolling to a target — clears a sticky header.',
      type: 'number',
      default: '0',
    },
    {
      name: 'hitArea',
      description: 'Height in pixels of the band at the top of the viewport that marks a section active.',
      type: 'number',
      default: '80',
    },
  ];

  protected readonly typeRows: readonly DocApiRow[] = [
    { name: 'WrAnchorLink', description: 'One entry in the rail.', type: 'interface' },
    { name: 'id', description: 'Target element id (without #).', type: 'string', required: true, sub: true },
    { name: 'label', description: 'Visible text.', type: 'string', required: true, sub: true },
    { name: 'children', description: 'One level of nested links.', type: 'readonly WrAnchorLink[]', sub: true },
  ];
}
