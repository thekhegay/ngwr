import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
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
  imports: [
    WrButton,
    WrSplitter,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class SplitterPageComponent {
  protected readonly horizontalPos = signal(40);
  protected readonly verticalPos = signal(50);
  protected readonly collapsiblePos = signal(30);
  protected readonly filesClosed = signal(false);

  protected readonly snippet = `<wr-splitter [(position)]="pos" style="height: 20rem">
  <div wrSplitterStart>Files</div>
  <div wrSplitterEnd>Editor</div>
</wr-splitter>`;

  protected readonly verticalSnippet = `<wr-splitter [(position)]="pos" orientation="vertical" style="height: 20rem">
  <div wrSplitterStart>Preview</div>
  <div wrSplitterEnd>Logs</div>
</wr-splitter>`;

  protected readonly collapsibleSnippet = `<wr-btn (click)="closed.set(!closed())">Toggle files</wr-btn>

<wr-splitter collapsible="start" [(collapsed)]="closed" [(position)]="pos" style="height: 20rem">
  <div wrSplitterStart>Files</div>
  <div wrSplitterEnd>Editor</div>
</wr-splitter>`;

  protected readonly api = API.WrSplitter;
}
