import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import { beforeEach, describe, expect, it } from 'vitest';

import { WrCalendar } from './calendar';
import type { WrCalendarGranularity, WrCalendarMode, WrCalendarRange } from './types';

@Component({
  imports: [WrCalendar],
  template: `
    <wr-calendar
      [mode]="mode()"
      [granularity]="granularity()"
      [(date)]="date"
      [(range)]="range"
      [min]="min()"
      [max]="max()"
      [dateFilter]="filter()"
      [readonly]="readonly()"
    />
  `,
})
class Host {
  readonly mode = signal<WrCalendarMode>('single');
  readonly granularity = signal<WrCalendarGranularity>('month');
  readonly date = signal<Date | null>(new Date(2026, 2, 18));
  readonly range = signal<WrCalendarRange>([null, null]);
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly filter = signal<((d: Date) => boolean) | null>(null);
  readonly readonly = signal(false);
}

const ymd = (date: Date | null): string | null =>
  date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : null;

/**
 * `granularity` on `<wr-calendar>`: what a pick names. Read off the rendered
 * DOM, as a consumer and the date picker both do. `en-GB` so a week starts on
 * Monday, which makes the week numbers the ISO ones.
 */
describe('WrCalendar granularity', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const calendar = (): HTMLElement => root().querySelector<HTMLElement>('wr-calendar')!;
  const chips = (): HTMLButtonElement[] => [...root().querySelectorAll<HTMLButtonElement>('.wr-calendar__chip')];
  const chip = (label: string): HTMLButtonElement => chips().find(c => c.textContent?.trim() === label)!;
  const labels = (selector: string): string[] =>
    [...root().querySelectorAll(selector)].map(el => el.textContent?.trim() ?? '');
  const header = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('.wr-calendar__label')!;
  const day = (date: number): HTMLButtonElement =>
    [...root().querySelectorAll<HTMLButtonElement>('.wr-calendar__day')]
      .filter(cell => !cell.classList.contains('wr-calendar__day--out-of-month'))
      .find(cell => cell.textContent?.trim() === String(date))!;
  const key = (name: string): void => {
    calendar().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  };

  async function render(setup: (host: Host) => void = () => undefined): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideWr(withDates({ locale: 'en-GB' }))] });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    setup(host);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  describe('month', () => {
    beforeEach(() => render());

    it('opens on the month view, with no day grid', () => {
      expect(root().querySelector('.wr-calendar__months')).not.toBeNull();
      expect(root().querySelector('[role="grid"]')).toBeNull();
      expect(header().textContent?.trim()).toBe('2026');
      expect(calendar().classList).toContain('wr-calendar--month');
    });

    it('marks the month the date is in, wherever in the month it falls', () => {
      expect(labels('.wr-calendar__chip--selected')).toEqual(['Mar']);
      expect(chip('Mar').getAttribute('aria-selected')).toBe('true');
    });

    it('picks the first day of the clicked month and stays on the month view', async () => {
      chip('Jun').click();
      await settle();

      expect(ymd(host.date())).toBe('2026-6-1');
      expect(host.date()!.getHours()).toBe(0);
      expect(root().querySelector('.wr-calendar__months')).not.toBeNull();
      expect(labels('.wr-calendar__chip--selected')).toEqual(['Jun']);
    });

    it('goes up to the years from the header and comes back to the months, picking nothing on the way', async () => {
      header().click();
      await settle();
      expect(root().querySelector('.wr-calendar__years')).not.toBeNull();

      chip('2027').click();
      await settle();

      expect(root().querySelector('.wr-calendar__months')).not.toBeNull();
      expect(header().textContent?.trim()).toBe('2027');
      expect(ymd(host.date())).toBe('2026-3-18');

      chip('Feb').click();
      await settle();
      expect(ymd(host.date())).toBe('2027-2-1');
    });

    it('moves the ring with the arrows and keeps one tab stop', async () => {
      key('ArrowRight');
      await settle();

      expect(
        chips()
          .filter(c => c.getAttribute('tabindex') === '0')
          .map(c => c.textContent?.trim())
      ).toEqual(['Apr']);

      key('ArrowDown');
      await settle();
      expect(
        chips()
          .filter(c => c.getAttribute('tabindex') === '0')
          .map(c => c.textContent?.trim())
      ).toEqual(['Jul']);
    });

    it('writes nothing while read-only', async () => {
      host.readonly.set(true);
      await settle();

      chip('Jun').click();
      await settle();

      expect(ymd(host.date())).toBe('2026-3-18');
    });
  });

  describe('bounds at the granularity', () => {
    it('keeps a month open while one of its days is, and closes it when none is', async () => {
      await render(h => {
        h.min.set(new Date(2026, 2, 15));
        h.max.set(new Date(2026, 5, 1));
      });

      // March to June stay open: by index, since ICU builds abbreviate September differently.
      const open = chips().flatMap((c, i) => (c.disabled ? [] : [i]));
      expect(open).toEqual([2, 3, 4, 5]);
      expect(chip('Mar').getAttribute('aria-disabled')).toBe('false');

      // A month that opens before `min` is still picked as its first day.
      chip('Mar').click();
      await settle();
      expect(ymd(host.date())).toBe('2026-3-1');
    });

    it('closes a month whose every day the filter refuses', async () => {
      await render(h => h.filter.set(d => d.getMonth() !== 1 && !(d.getMonth() === 3 && d.getDate() > 1)));

      expect(chip('Feb').disabled).toBe(true);
      // April keeps one day, so it stays open.
      expect(chip('Apr').disabled).toBe(false);
    });

    it('leaves a filtered month open on the way to the day grid, where the days say which are closed', async () => {
      await render(h => {
        h.granularity.set('day');
        h.filter.set(d => d.getMonth() !== 1);
      });
      header().click();
      await settle();

      expect(chip('Feb').disabled).toBe(false);
    });

    it('closes quarters and years the same way', async () => {
      await render(h => {
        h.granularity.set('quarter');
        h.min.set(new Date(2026, 2, 31));
        h.max.set(new Date(2026, 6, 1));
      });
      expect(chips().map(c => c.disabled)).toEqual([false, false, false, true]);

      host.granularity.set('year');
      await settle();
      expect(chip('2025').disabled).toBe(true);
      expect(chip('2026').disabled).toBe(false);
      expect(chip('2027').disabled).toBe(true);
    });
  });

  describe('year', () => {
    beforeEach(() => render(h => h.granularity.set('year')));

    it('opens on the year view, where the header has nowhere further to go', () => {
      expect(root().querySelector('.wr-calendar__years')).not.toBeNull();
      expect(header().disabled).toBe(true);
      expect(labels('.wr-calendar__chip--selected')).toEqual(['2026']);
    });

    it('picks 1 January of the clicked year', async () => {
      chip('2027').click();
      await settle();

      expect(ymd(host.date())).toBe('2027-1-1');
      expect(root().querySelector('.wr-calendar__years')).not.toBeNull();
    });
  });

  describe('quarter', () => {
    beforeEach(() => render(h => h.granularity.set('quarter')));

    it('renders four quarters of the year in the header, as a named listbox', () => {
      const list = root().querySelector<HTMLElement>('.wr-calendar__quarters')!;

      expect(list.getAttribute('role')).toBe('listbox');
      expect(list.getAttribute('aria-label')).toBe('Quarters');
      expect(labels('.wr-calendar__chip')).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
      expect(header().textContent?.trim()).toBe('2026');
      expect(labels('.wr-calendar__chip--selected')).toEqual(['Q1']);
    });

    it('picks the first day of the quarter', async () => {
      chip('Q3').click();
      await settle();

      expect(ymd(host.date())).toBe('2026-7-1');
      expect(labels('.wr-calendar__chip--selected')).toEqual(['Q3']);
    });

    it('pages by a year, and names the arrows for it', async () => {
      const prev = root().querySelector<HTMLButtonElement>('.wr-calendar__nav--prev')!;
      expect(prev.getAttribute('aria-label')).toBe('Previous year');

      prev.click();
      await settle();
      chip('Q4').click();
      await settle();

      expect(ymd(host.date())).toBe('2025-10-1');
    });

    it('comes back to the quarters from the year view', async () => {
      header().click();
      await settle();
      chip('2027').click();
      await settle();

      expect(root().querySelector('.wr-calendar__quarters')).not.toBeNull();
      expect(header().textContent?.trim()).toBe('2027');
      expect(ymd(host.date())).toBe('2026-3-18');
    });

    it('steps one quarter along a row and two between rows', async () => {
      const ring = (): string[] =>
        chips()
          .filter(c => c.getAttribute('tabindex') === '0')
          .map(c => c.textContent?.trim() ?? '');
      expect(ring()).toEqual(['Q1']);

      key('ArrowRight');
      await settle();
      expect(ring()).toEqual(['Q2']);

      key('ArrowDown');
      await settle();
      expect(ring()).toEqual(['Q4']);

      key('Home');
      await settle();
      expect(ring()).toEqual(['Q1']);
    });
  });

  describe('week', () => {
    beforeEach(() => render(h => h.granularity.set('week')));

    it('keeps the day grid and shows the week of the date as a band', () => {
      expect(root().querySelector('[role="grid"]')).not.toBeNull();
      expect(labels('.wr-calendar__day--selected')).toEqual(['16', '22']);
      expect(labels('.wr-calendar__day--in-range')).toEqual(['17', '18', '19', '20', '21']);
      expect(labels('.wr-calendar__day[aria-selected="true"]')).toEqual(['16', '17', '18', '19', '20', '21', '22']);
    });

    it('picks the first day of the clicked day’s week', async () => {
      day(26).click();
      await settle();

      expect(ymd(host.date())).toBe('2026-3-23');
      expect(labels('.wr-calendar__day--selected')).toEqual(['23', '29']);
    });

    it('previews the whole week under the pointer', async () => {
      day(11).dispatchEvent(new MouseEvent('mouseenter'));
      await settle();
      expect(labels('.wr-calendar__day--range-preview')).toEqual(['9', '10', '11', '12', '13', '14', '15']);

      root().querySelector('.wr-calendar__grid')!.dispatchEvent(new MouseEvent('mouseleave'));
      await settle();
      expect(labels('.wr-calendar__day--range-preview')).toEqual([]);
    });

    it('picks the week of the roving day on Enter', async () => {
      key('ArrowDown');
      await settle();
      key('Enter');
      await settle();

      // The ring started on the 18th, so it is on the 25th.
      expect(ymd(host.date())).toBe('2026-3-23');
    });

    it('does not page back when the picked week opens in the month before', async () => {
      const next = root().querySelector<HTMLButtonElement>('.wr-calendar__nav--next')!;
      next.click();
      await settle();
      expect(header().textContent?.trim()).toBe('April 2026');

      // Wednesday 1 April: its week opens on Monday 30 March.
      day(1).click();
      await settle();

      expect(ymd(host.date())).toBe('2026-3-30');
      expect(header().textContent?.trim()).toBe('April 2026');
    });
  });

  describe('a range of periods', () => {
    beforeEach(() =>
      render(h => {
        h.mode.set('range');
        h.date.set(null);
      })
    );

    it('runs from the first day of the start month to the last day of the end month', async () => {
      chip('Mar').click();
      await settle();
      expect(host.range().map(ymd)).toEqual(['2026-3-1', null]);

      chip('Jun').click();
      await settle();

      expect(host.range().map(ymd)).toEqual(['2026-3-1', '2026-6-30']);
      expect(labels('.wr-calendar__chip--selected')).toEqual(['Mar', 'Jun']);
      expect(labels('.wr-calendar__chip--in-range')).toEqual(['Apr', 'May']);
    });

    it('widens each end to the side it lands on when the second pick is the earlier one', async () => {
      chip('Jun').click();
      await settle();
      chip('Feb').click();
      await settle();

      expect(host.range().map(ymd)).toEqual(['2026-2-1', '2026-6-30']);
    });

    it('previews the months a second click would take', async () => {
      chip('Mar').click();
      await settle();
      chip('Jun').dispatchEvent(new MouseEvent('mouseenter'));
      await settle();

      expect(labels('.wr-calendar__chip--range-preview')).toEqual(['Apr', 'May', 'Jun']);
    });

    it('does the same for quarters and years', async () => {
      host.granularity.set('quarter');
      await settle();
      chip('Q1').click();
      await settle();
      chip('Q2').click();
      await settle();
      expect(host.range().map(ymd)).toEqual(['2026-1-1', '2026-6-30']);

      host.granularity.set('year');
      await settle();
      chip('2026').click();
      await settle();
      chip('2027').click();
      await settle();
      expect(host.range().map(ymd)).toEqual(['2026-1-1', '2027-12-31']);
    });
  });
});
