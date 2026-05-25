import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrSplitterComponent } from 'ngwr/splitter';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-splitter-page',
  templateUrl: './splitter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrSplitterComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class SplitterPageComponent {
  protected readonly horizontalPos = signal(40);
  protected readonly verticalPos = signal(50);

  protected readonly snippet = `<wr-splitter [(position)]="pos">
  <div wrSplitterStart>Files</div>
  <div wrSplitterEnd>Editor</div>
</wr-splitter>`;
}
