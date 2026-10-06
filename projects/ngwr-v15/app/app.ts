import { Component, ViewEncapsulation, inject, signal } from '@angular/core';

import { WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { type WrCalendarEvent, type WrCalendarEventChange, WrEventCalendar } from 'ngwr/event-calendar';
import { WrIcon } from 'ngwr/icon';
import {
  type WrTableColumns,
  type WrTableSortState,
  WrTable,
  WrTableCell,
  WrTableExpand,
  WrTableGroupHeader,
} from 'ngwr/table';
import { WrTheme } from 'ngwr/theme';

interface Row {
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly score: number;
}

/** The sandbox host. Everything below is a docs snippet, copied as written. */
@Component({
  selector: 'sbx-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [WrButton, WrEventCalendar, WrIcon, WrTable, WrTableCell, WrTableExpand, WrTableGroupHeader, WrTag],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);

  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }

  protected readonly columns: WrTableColumns = {
    name: { title: 'Name', sortable: true },
    email: { title: 'Email' },
    role: {
      title: 'Role',
      sortable: true,
      filterItems: [
        { title: 'Admin', value: 'admin' },
        { title: 'Editor', value: 'editor' },
        { title: 'Viewer', value: 'viewer' },
      ],
    },
    score: { title: 'Score', sortable: true, summary: 'sum' },
  };

  protected readonly rows: readonly Row[] = [
    { name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin', score: 42 },
    { name: 'Alan Turing', email: 'alan@example.com', role: 'editor', score: 31 },
    { name: 'Grace Hopper', email: 'grace@example.com', role: 'admin', score: 57 },
    { name: 'Margaret Hamilton', email: 'margaret@example.com', role: 'viewer', score: 18 },
  ];

  protected readonly sort = signal<readonly WrTableSortState[]>([]);
  protected readonly selected = signal<readonly unknown[]>([]);
  protected readonly expanded = signal<readonly unknown[]>([]);
  protected readonly collapsed = signal<readonly unknown[]>([]);
  protected readonly page = signal(1);
  protected readonly loading = signal(false);

  protected onFilter(e: unknown): void {
    void e;
  }
  protected remove(row: unknown): void {
    void row;
  }

  // --- Event calendar -----------------------------------------------------
  protected readonly events = signal<readonly WrCalendarEvent[]>([
    { id: '1', title: 'Standup', start: new Date(2026, 9, 6, 9, 30), end: new Date(2026, 9, 6, 10, 0) },
    { id: '2', title: 'Design review', start: new Date(2026, 9, 7, 14, 0), end: new Date(2026, 9, 7, 15, 30) },
    { id: '3', title: 'Retro', start: new Date(2026, 9, 9, 16, 0), end: new Date(2026, 9, 9, 17, 0) },
  ]);

  protected onEventChange(change: WrCalendarEventChange): void {
    this.events.update(list =>
      list.map(x => (x.id === change.event.id ? { ...x, start: change.start, end: change.end } : x))
    );
  }
}
