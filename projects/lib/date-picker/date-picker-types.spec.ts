import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, expect, it } from 'vitest';

import { WrDatePicker } from './date-picker';

/**
 * `strictTemplates` type-checks this host, which is the spec. With no
 * `valueFormat` binding the value is a `Date`: a one-way `[value]` with its own
 * `(valueChange)` handler, the shape that broke when the format came in. With
 * `valueFormat="day"` it is a `YYYY-MM-DD` string.
 */
@Component({
  imports: [WrDatePicker],
  template: `
    <wr-date-picker ariaLabel="Start" [value]="start()" (valueChange)="start.set($event)" />
    <wr-date-picker ariaLabel="End" [(value)]="end" />
    <wr-date-picker ariaLabel="Due" valueFormat="date" [value]="due()" (valueChange)="due.set($event)" />
    <wr-date-picker ariaLabel="Day" valueFormat="day" [value]="day()" (valueChange)="day.set($event)" />
  `,
})
class TypesHost {
  readonly start = signal<Date | null>(null);
  readonly end = signal<Date | null>(null);
  readonly due = signal<Date | null>(null);
  readonly day = signal<string | null>(null);
}

describe('WrDatePicker value types', () => {
  it('types the value as a Date without a value format, and as a day string under day', () => {
    const fixture = TestBed.createComponent(TypesHost);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('wr-date-picker').length).toBe(4);
    fixture.destroy();
  });
});
