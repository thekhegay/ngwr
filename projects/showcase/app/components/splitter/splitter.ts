import { Component, signal } from '@angular/core';

import { WrSplitter } from 'ngwr/splitter';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-splitter-page',
  templateUrl: './splitter.html',
  imports: [WrSplitter, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class SplitterPageComponent {
  protected readonly horizontalPos = signal(40);
  protected readonly verticalPos = signal(50);

  protected readonly snippet = `<wr-splitter [(position)]="pos">
  <div wrSplitterStart>Files</div>
  <div wrSplitterEnd>Editor</div>
</wr-splitter>`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'position',
      description: 'Divider position as a percentage. Two-way bindable.',
      type: 'number',
      default: '50',
    },
    {
      name: 'orientation',
      description: 'Divider direction and drag axis.',
      type: "'horizontal' | 'vertical'",
      default: "'horizontal'",
    },
    { name: 'minPosition', description: 'Minimum allowed position.', type: 'number', default: '0' },
    { name: 'maxPosition', description: 'Maximum allowed position.', type: 'number', default: '100' },
    { name: 'disabled', description: 'Disable dragging.', type: 'boolean', default: 'false' },
  ];
}
