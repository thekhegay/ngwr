import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, disabled, form, readonly } from '@angular/forms/signals';

import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCalendar } from './calendar';
import type { WrCalendarRange, WrCalendarValue } from './types';

interface Model {
  due: Date | null;
  stay: WrCalendarRange | null;
}

@Component({
  imports: [FormField, WrCalendar],
  template: `
    <wr-calendar data-k="due" [formField]="f.due" />
    <wr-calendar data-k="stay" mode="range" [formField]="f.stay" />
    <button type="button" data-k="outside">Outside</button>
  `,
})
class FormHost {
  readonly locked = signal(false);
  readonly off = signal(false);
  readonly model = signal<Model>({ due: new Date(2026, 0, 15), stay: null });
  readonly f = form(this.model, path => {
    readonly(path.due, () => this.locked());
    readonly(path.stay, () => this.locked());
    disabled(path.due, () => this.off());
  });
}

@Component({
  imports: [WrCalendar],
  template: `<wr-calendar
      [(date)]="date"
      [(value)]="value"
      [readonly]="locked()"
      (touch)="touches.set(touches() + 1)"
    />
    <button type="button" data-k="outside">Outside</button>`,
})
class SingleHost {
  readonly date = signal<Date | null>(new Date(2026, 0, 15));
  readonly value = signal<WrCalendarValue>(null);
  readonly locked = signal(false);
  readonly touches = signal(0);
}

@Component({
  imports: [WrCalendar],
  template: `<wr-calendar mode="range" [(range)]="range" [(value)]="value" [readonly]="locked()" />`,
})
class RangeHost {
  readonly range = signal<WrCalendarRange>([new Date(2026, 0, 10), null]);
  readonly value = signal<WrCalendarValue>(null);
  readonly locked = signal(false);
}

describe('WrCalendar as a form control', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWr(withDates({ locale: 'en-GB' }))] });
  });

  const settle = async (fixture: { detectChanges(): void; whenStable(): Promise<unknown> }): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const day = (root: Element, n: number): HTMLButtonElement =>
    [...root.querySelectorAll<HTMLButtonElement>('.wr-calendar__day:not(.wr-calendar__day--out-of-month)')].find(
      el => el.textContent?.trim() === String(n)
    )!;

  const selected = (root: Element): string[] =>
    [...root.querySelectorAll('.wr-calendar__day--selected')].map(el => el.textContent?.trim() ?? '');

  const press = (el: Element, key: string): void => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  };

  describe('bound with [formField]', () => {
    let fixture: ReturnType<typeof TestBed.createComponent<FormHost>>;
    const cal = (key: string): HTMLElement =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`wr-calendar[data-k="${key}"]`)!;

    beforeEach(async () => {
      fixture = TestBed.createComponent(FormHost);
      await settle(fixture);
    });

    afterEach(() => fixture.destroy());

    it('draws the date the field holds', () => {
      expect(selected(cal('due'))).toEqual(['15']);
      expect(cal('due').querySelector('.wr-calendar__label')?.textContent).toContain('January 2026');
    });

    it('follows a date written to the field', async () => {
      fixture.componentInstance.f.due().value.set(new Date(2026, 2, 9));
      await settle(fixture);

      expect(selected(cal('due'))).toEqual(['9']);
      expect(cal('due').querySelector('.wr-calendar__label')?.textContent).toContain('March 2026');
    });

    it('writes a picked day to the field and marks it dirty', async () => {
      day(cal('due'), 20).click();
      await settle(fixture);

      const due = fixture.componentInstance.model().due!;
      expect([due.getFullYear(), due.getMonth(), due.getDate()]).toEqual([2026, 0, 20]);
      expect(fixture.componentInstance.f.due().dirty()).toBe(true);
    });

    it('leaves an untouched field pristine', () => {
      expect(fixture.componentInstance.f.due().dirty()).toBe(false);
      expect(fixture.componentInstance.f.stay().dirty()).toBe(false);
      expect(fixture.componentInstance.model().stay).toBeNull();
    });

    it('reads and writes a range field in range mode', async () => {
      fixture.componentInstance.f.stay().value.set([new Date(2026, 4, 4), new Date(2026, 4, 8)]);
      await settle(fixture);
      expect(selected(cal('stay'))).toEqual(['4', '8']);

      day(cal('stay'), 12).click();
      await settle(fixture);
      expect(fixture.componentInstance.model().stay?.[0]?.getDate()).toBe(12);
      expect(fixture.componentInstance.model().stay?.[1]).toBeNull();

      day(cal('stay'), 14).click();
      await settle(fixture);
      expect(fixture.componentInstance.model().stay?.map(d => d?.getDate())).toEqual([12, 14]);
    });

    it('clears the grid when the range field goes back to null', async () => {
      fixture.componentInstance.f.stay().value.set([new Date(2026, 4, 4), new Date(2026, 4, 8)]);
      await settle(fixture);
      fixture.componentInstance.f.stay().value.set(null);
      await settle(fixture);

      expect(selected(cal('stay'))).toEqual([]);
    });

    it('follows disabled from the field', async () => {
      fixture.componentInstance.off.set(true);
      await settle(fixture);

      expect(cal('due').classList).toContain('wr-calendar--disabled');
      expect(day(cal('due'), 20).disabled).toBe(true);
      expect(cal('stay').classList).not.toContain('wr-calendar--disabled');
    });

    it('follows readonly from the field and refuses the pick', async () => {
      fixture.componentInstance.locked.set(true);
      await settle(fixture);

      expect(cal('due').classList).toContain('wr-calendar--readonly');
      expect(cal('due').querySelector('[role="grid"]')?.getAttribute('aria-readonly')).toBe('true');

      day(cal('due'), 20).click();
      day(cal('stay'), 12).click();
      await settle(fixture);

      expect(fixture.componentInstance.model().due?.getDate()).toBe(15);
      expect(fixture.componentInstance.model().stay).toBeNull();
      expect(selected(cal('due'))).toEqual(['15']);
    });

    it('marks the field touched when focus leaves the calendar, not when it moves inside it', async () => {
      const due = fixture.componentInstance.f.due();
      const from = day(cal('due'), 15);

      from.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: day(cal('due'), 16) }));
      await settle(fixture);
      expect(due.touched()).toBe(false);

      const outside = (fixture.nativeElement as HTMLElement).querySelector('[data-k="outside"]');
      from.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
      await settle(fixture);
      expect(due.touched()).toBe(true);
      expect(fixture.componentInstance.f.stay().touched()).toBe(false);
    });
  });

  describe('readonly', () => {
    let fixture: ReturnType<typeof TestBed.createComponent<SingleHost>>;
    const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const active = (): string | undefined =>
      root().querySelector('.wr-calendar__day[tabindex="0"]')?.textContent?.trim();

    beforeEach(async () => {
      fixture = TestBed.createComponent(SingleHost);
      fixture.componentInstance.locked.set(true);
      await settle(fixture);
    });

    afterEach(() => fixture.destroy());

    it('keeps every enabled day enabled and one of them in the tab order', () => {
      expect(day(root(), 20).disabled).toBe(false);
      expect(active()).toBe('15');
      expect(root().querySelector('[role="grid"]')?.getAttribute('aria-disabled')).toBeNull();
    });

    it('still moves the cursor with the arrows', async () => {
      press(root().querySelector('wr-calendar')!, 'ArrowRight');
      await settle(fixture);

      expect(active()).toBe('16');
    });

    it('does not pick on a click, on Enter or on Space', async () => {
      day(root(), 20).click();
      press(root().querySelector('wr-calendar')!, 'ArrowRight');
      press(root().querySelector('wr-calendar')!, 'Enter');
      press(root().querySelector('wr-calendar')!, ' ');
      await settle(fixture);

      expect(fixture.componentInstance.date()?.getDate()).toBe(15);
      expect(selected(root())).toEqual(['15']);
    });

    it('still pages with the header and opens the month and year views', async () => {
      root().querySelector<HTMLButtonElement>('.wr-calendar__nav--next')!.click();
      await settle(fixture);
      expect(root().querySelector('.wr-calendar__label')?.textContent).toContain('February 2026');

      root().querySelector<HTMLButtonElement>('.wr-calendar__label')!.click();
      await settle(fixture);
      const march = [...root().querySelectorAll<HTMLButtonElement>('.wr-calendar__chip')][2];
      expect(march.disabled).toBe(false);
      march.click();
      await settle(fixture);

      expect(root().querySelector('.wr-calendar__label')?.textContent).toContain('March 2026');
      expect(fixture.componentInstance.date()?.getMonth()).toBe(0);
    });

    it('picks again once the lock is lifted', async () => {
      fixture.componentInstance.locked.set(false);
      await settle(fixture);
      day(root(), 20).click();
      await settle(fixture);

      expect(fixture.componentInstance.date()?.getDate()).toBe(20);
    });

    it('draws no range preview under the pointer', async () => {
      const range = TestBed.createComponent(RangeHost);
      range.componentInstance.locked.set(true);
      await settle(range);
      const el = range.nativeElement as HTMLElement;

      day(el, 14).dispatchEvent(new MouseEvent('mouseenter'));
      await settle(range);
      expect(el.querySelectorAll('.wr-calendar__day--range-preview')).toHaveLength(0);

      range.componentInstance.locked.set(false);
      await settle(range);
      day(el, 14).dispatchEvent(new MouseEvent('mouseenter'));
      await settle(range);
      expect(el.querySelectorAll('.wr-calendar__day--range-preview')).toHaveLength(3);
      range.destroy();
    });
  });

  describe('value beside [(date)] and [(range)]', () => {
    it('mirrors a bound date onto value without touching the date', async () => {
      const fixture = TestBed.createComponent(SingleHost);
      const before = fixture.componentInstance.date();
      await settle(fixture);

      expect(fixture.componentInstance.date()).toBe(before);
      expect(fixture.componentInstance.value()).toBe(before);
    });

    it('writes a pick to both', async () => {
      const fixture = TestBed.createComponent(SingleHost);
      await settle(fixture);
      day(fixture.nativeElement as HTMLElement, 20).click();
      await settle(fixture);

      expect(fixture.componentInstance.date()?.getDate()).toBe(20);
      expect(fixture.componentInstance.value()).toBe(fixture.componentInstance.date());
    });

    it('carries a write to either side over to the other', async () => {
      const fixture = TestBed.createComponent(SingleHost);
      await settle(fixture);

      const viaDate = new Date(2026, 0, 3);
      fixture.componentInstance.date.set(viaDate);
      await settle(fixture);
      expect(fixture.componentInstance.value()).toBe(viaDate);

      const viaValue = new Date(2026, 0, 27);
      fixture.componentInstance.value.set(viaValue);
      await settle(fixture);
      expect(fixture.componentInstance.date()).toBe(viaValue);
      expect(selected(fixture.nativeElement as HTMLElement)).toEqual(['27']);

      fixture.componentInstance.value.set(null);
      await settle(fixture);
      expect(fixture.componentInstance.date()).toBeNull();
    });

    it('mirrors a bound range, and leaves the bound tuple the one the host reads', async () => {
      const fixture = TestBed.createComponent(RangeHost);
      const before = fixture.componentInstance.range();
      await settle(fixture);

      expect(fixture.componentInstance.range()).toBe(before);
      expect(fixture.componentInstance.value()).toBe(before);

      day(fixture.nativeElement as HTMLElement, 14).click();
      await settle(fixture);
      expect(fixture.componentInstance.range().map(d => d?.getDate())).toEqual([10, 14]);
      expect(fixture.componentInstance.value()).toBe(fixture.componentInstance.range());
    });

    it('reads an emptied range as null, and null as an empty range', async () => {
      const fixture = TestBed.createComponent(RangeHost);
      await settle(fixture);

      fixture.componentInstance.range.set([null, null]);
      await settle(fixture);
      expect(fixture.componentInstance.value()).toBeNull();

      fixture.componentInstance.value.set([new Date(2026, 0, 5), new Date(2026, 0, 7)]);
      await settle(fixture);
      expect(fixture.componentInstance.range().map(d => d?.getDate())).toEqual([5, 7]);

      fixture.componentInstance.value.set(null);
      await settle(fixture);
      expect(fixture.componentInstance.range()).toEqual([null, null]);
    });
  });

  describe('focus()', () => {
    it('lands on the day holding the tab stop, and on the chip in the month view', async () => {
      const fixture = TestBed.createComponent(FormHost);
      document.body.appendChild(fixture.nativeElement as HTMLElement);
      await settle(fixture);
      const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-calendar[data-k="due"]')!;

      fixture.componentInstance.f.due().focusBoundControl();
      expect(document.activeElement).toBe(root.querySelector('.wr-calendar__day[tabindex="0"]'));
      expect(document.activeElement?.textContent?.trim()).toBe('15');

      root.querySelector<HTMLButtonElement>('.wr-calendar__label')!.click();
      await settle(fixture);
      fixture.componentInstance.f.due().focusBoundControl();
      expect(document.activeElement).toBe(root.querySelector('.wr-calendar__chip[tabindex="0"]'));

      fixture.destroy();
    });
  });

  describe('touch', () => {
    it('is emitted once focus leaves, also to nowhere', async () => {
      const fixture = TestBed.createComponent(SingleHost);
      await settle(fixture);
      const root = fixture.nativeElement as HTMLElement;

      day(root, 15).dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: root.querySelector('.wr-calendar__nav--next') })
      );
      expect(fixture.componentInstance.touches()).toBe(0);

      day(root, 15).dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      expect(fixture.componentInstance.touches()).toBe(1);
    });
  });
});
