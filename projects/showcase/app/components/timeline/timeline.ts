import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrTimeline, WrTimelineItem } from 'ngwr/timeline';

import { DocCodeComponent, DocPageComponent, DocSectionComponent, DocSnippetComponent } from '#core/components';

@Component({
  selector: 'ngwr-timeline-page',
  templateUrl: './timeline.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrTimeline, WrTimelineItem, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent],
})
export default class TimelinePageComponent {
  protected readonly snippet = `<wr-timeline>
  <wr-timeline-item title="Created" time="2026-05-01">Initial commit.</wr-timeline-item>
  <wr-timeline-item title="Deployed" time="2026-05-02" color="success">Live.</wr-timeline-item>
</wr-timeline>`;
}
