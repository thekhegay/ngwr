import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrTimelineComponent, WrTimelineItemComponent } from 'ngwr/timeline';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-timeline-page',
  templateUrl: './timeline.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrTimelineComponent,
    WrTimelineItemComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
  ],
})
export default class TimelinePageComponent {
  protected readonly snippet = `<wr-timeline>
  <wr-timeline-item title="Created" time="2026-05-01">Initial commit.</wr-timeline-item>
  <wr-timeline-item title="Deployed" time="2026-05-02" color="success">Live.</wr-timeline-item>
</wr-timeline>`;
}
