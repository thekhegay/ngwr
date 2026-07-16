import { Component } from '@angular/core';

import { WrTimeline, WrTimelineItem } from 'ngwr/timeline';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-timeline-page',
  templateUrl: './timeline.html',
  imports: [
    WrTimeline,
    WrTimelineItem,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TimelinePageComponent {
  protected readonly snippet = `<wr-timeline>
  <wr-timeline-item title="Created" time="2026-05-01">Initial commit.</wr-timeline-item>
  <wr-timeline-item title="Deployed" time="2026-05-02" color="success">Live.</wr-timeline-item>
</wr-timeline>`;
  protected readonly horizontalSnippet = `<wr-timeline orientation="horizontal">
  <wr-timeline-item title="Plan" time="Q1">Scope agreed.</wr-timeline-item>
  <wr-timeline-item title="Ship" time="Q3" color="success">Released.</wr-timeline-item>
</wr-timeline>`;

  protected readonly timelineApi: readonly DocApiRow[] = [
    {
      name: 'orientation',
      description: 'Layout direction.',
      type: "'vertical' | 'horizontal'",
      default: "'vertical'",
    },
  ];

  protected readonly itemApi: readonly DocApiRow[] = [
    { name: 'title', description: 'Bold event title.', type: 'string', default: "''" },
    { name: 'time', description: 'Muted timestamp shown above the title.', type: 'string', default: "''" },
    {
      name: 'color',
      description: 'Dot color.',
      type: "'primary' | 'success' | 'warning' | 'danger' | 'medium'",
      default: "'primary'",
    },
  ];
}
