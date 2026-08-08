import { Component, signal } from '@angular/core';

import {
  WrEventCalendar,
  type WrCalendarEvent,
  type WrCalendarEventChange,
  type WrCalendarView,
} from 'ngwr/event-calendar';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

/** Anchor the demo data to the current week so the page is never stale. */
function at(dayOffset: number, hour: number, minutes = 0): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minutes, 0, 0);
  return date;
}

@Component({
  selector: 'ngwr-event-calendar-page',
  templateUrl: './event-calendar.html',
  imports: [
    WrEventCalendar,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class EventCalendarComponent {
  protected readonly view = signal<WrCalendarView>('month');
  protected readonly weekView = signal<WrCalendarView>('week');
  protected readonly anchor = signal(new Date());

  protected readonly events = signal<readonly WrCalendarEvent[]>([
    { id: 1, title: 'Design review', start: at(0, 10), end: at(0, 11, 30), color: 'primary' },
    { id: 2, title: 'Standup', start: at(1, 9, 30), end: at(1, 9, 45), color: 'info' },
    { id: 3, title: 'Pairing on the table refactor', start: at(1, 10), end: at(1, 12), color: 'success' },
    { id: 4, title: 'Release window', start: at(1, 11), end: at(1, 13), color: 'warning' },
    // Five days — long enough to show a band spanning cells, and it splits into
    // one band per week whenever it straddles a week boundary.
    { id: 5, title: 'Conference', start: at(2, 0), end: at(7, 0), allDay: true, color: 'secondary' },
    { id: 6, title: 'Retro', start: at(4, 15), end: at(4, 16), color: 'danger' },
    { id: 7, title: 'Frozen — no deploys', start: at(6, 0), end: at(7, 0), allDay: true, editable: false },
    // Two more on the busiest day, to push it past `maxLanes` and show “+N more”.
    { id: 8, title: 'Interview', start: at(1, 14), end: at(1, 15), color: 'info' },
    { id: 9, title: 'Budget sync', start: at(1, 15, 30), end: at(1, 16, 30), color: 'medium' },
  ]);

  /** Latest output, echoed under the demo so the flow is visible. */
  protected readonly lastChange = signal<string>('—');

  protected apply(change: WrCalendarEventChange): void {
    this.events.update(events =>
      events.map(event => (event.id === change.event.id ? { ...event, start: change.start, end: change.end } : event))
    );
    const time = change.start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    this.lastChange.set(`${change.kind} — ${change.event.title} → ${time}`);
  }

  protected note(text: string): void {
    this.lastChange.set(text);
  }

  protected readonly api = API.WrEventCalendar;

  protected readonly snippets = {
    install: `import { WrEventCalendar } from 'ngwr/event-calendar';

@Component({ imports: [WrEventCalendar] })
export class MyComponent {}`,
    provider: `import { provideWrDateAdapter } from 'ngwr/date-adapter';
import { provideWrDateFnsAdapter } from 'ngwr/date-adapter-fns';

bootstrapApplication(App, {
  providers: [provideWrDateFnsAdapter()],
});`,
    basic: `<wr-event-calendar [events]="events()" [(view)]="view" [(date)]="anchor" />`,
    events: `protected readonly events = signal<readonly WrCalendarEvent[]>([
  { id: 1, title: 'Design review', start: at(0, 10), end: at(0, 11, 30), color: 'primary' },
  { id: 5, title: 'Conference', start: at(2, 0), end: at(5, 0), allDay: true, color: 'secondary' },
  { id: 7, title: 'Frozen — no deploys', start: at(6, 0), end: at(7, 0), allDay: true, editable: false },
]);`,
    editable: `<wr-event-calendar
  editable
  [events]="events()"
  [(view)]="view"
  [(date)]="anchor"
  (eventChange)="apply($event)"
/>`,
    apply: `protected apply(change: WrCalendarEventChange): void {
  this.events.update(events =>
    events.map(event =>
      event.id === change.event.id ? { ...event, start: change.start, end: change.end } : event
    )
  );
}`,
    time: `<wr-event-calendar
  editable
  view="week"
  [dayStartHour]="8"
  [dayEndHour]="19"
  [slotMinutes]="30"
  [events]="events()"
/>`,
    template: `<wr-event-calendar [events]="events()">
  <ng-template wrCalendarEvent let-event>
    <strong>{{ event.title }}</strong>
    <small>{{ event.data.room }}</small>
  </ng-template>
</wr-event-calendar>`,
    slot: `<wr-event-calendar [events]="events()" (slotClick)="compose($event)" />`,
  };
}
