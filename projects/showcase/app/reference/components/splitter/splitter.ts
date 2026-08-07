import { Component, signal } from '@angular/core';

import { WrSplitter } from 'ngwr/splitter';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

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

  protected readonly api = API.WrSplitter;
}
