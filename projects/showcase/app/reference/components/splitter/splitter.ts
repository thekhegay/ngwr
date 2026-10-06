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

  // Same reason as the carousel's: the panes fill the host, so a splitter with
  // no height of its own comes out 32px tall with a drag handle in it.
  protected readonly snippet = `<!-- The height is yours: the panes fill the splitter. -->
<wr-splitter [(position)]="pos" style="height: 20rem">
  <div wrSplitterStart>Files</div>
  <div wrSplitterEnd>Editor</div>
</wr-splitter>`;

  protected readonly verticalSnippet = `<!-- The slot directives do not change with the orientation: \`start\` is the
     top pane and \`end\` the bottom one, the same way they are left and right. -->
<wr-splitter [(position)]="pos" orientation="vertical" style="height: 20rem">
  <div wrSplitterStart>Preview</div>
  <div wrSplitterEnd>Logs</div>
</wr-splitter>`;

  protected readonly api = API.WrSplitter;
}
