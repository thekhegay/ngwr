import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import { describe, expect, it } from 'vitest';

import { WrDatePicker } from './date-picker';

@Component({
  imports: [WrDatePicker],
  template: `<wr-date-picker [showToday]="show()" [(value)]="picked" [max]="max()" format="dd.MM.yyyy" />`,
})
class Host {
  readonly show = signal(true);
  readonly picked = signal<Date | null>(new Date(2020, 0, 15));
  readonly max = signal<Date | undefined>(undefined);
}

describe('WrDatePicker showToday', () => {
  const setup = (): {
    fixture: ComponentFixture<Host>;
    open: () => void;
    button: () => HTMLButtonElement | null;
  } => {
    TestBed.configureTestingModule({ providers: [provideWr(withDates({ locale: 'en-US' }))] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const open = (): void => {
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-date-picker__trigger')!.click();
      fixture.detectChanges();
    };
    const button = (): HTMLButtonElement | null => document.querySelector('.wr-calendar__today');
    return { fixture, open, button };
  };

  it('has no button by default', () => {
    const { fixture, open, button } = setup();
    fixture.componentInstance.show.set(false);
    fixture.detectChanges();
    open();
    expect(button()).toBeNull();
  });

  it('commits today and closes the panel', () => {
    const { fixture, open, button } = setup();
    open();
    button()!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.picked()?.toDateString()).toBe(new Date().toDateString());
    expect(document.querySelector('.wr-calendar')).toBeNull();
  });

  it('is disabled when today is past max', () => {
    const { fixture, open, button } = setup();
    fixture.componentInstance.max.set(new Date(2020, 11, 31));
    fixture.detectChanges();
    open();
    expect(button()!.disabled).toBe(true);
  });
});
