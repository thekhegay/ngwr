import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrTransferItem } from './interfaces';
import { WrTransfer } from './transfer';

const ITEMS: readonly WrTransferItem[] = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'delete', label: 'Delete' },
  { value: 'audit', label: 'Audit', disabled: true },
];

@Component({
  imports: [WrTransfer],
  template: `
    <wr-transfer
      [items]="items()"
      [value]="granted()"
      [searchable]="searchable()"
      [disabled]="disabled()"
      (valueChange)="granted.set($event)"
      (touch)="touched = touched + 1"
    />
  `,
})
class Host {
  readonly items = signal<readonly WrTransferItem[]>(ITEMS);
  readonly granted = signal<readonly unknown[]>([]);
  readonly searchable = signal(false);
  readonly disabled = signal(false);
  touched = 0;

  /** What a classic-forms bridge does on reset, whatever the declared type says. */
  writeNull(): void {
    this.granted.set(null as unknown as readonly unknown[]);
  }
}

/**
 * The value is the RIGHT pane and nothing else: the checked boxes inside a pane
 * are transient staging, which is what makes the interesting failures possible —
 * staging and the value can disagree, and so can staging and what the pane is
 * actually showing.
 *
 * The panes are plain `<ul>`s of checkboxes on purpose (a `role="option"` may not
 * contain an interactive control, and the axe gate says so), so these specs pin
 * the ABSENCE of listbox semantics too — otherwise a future "improvement" reads
 * as an obvious win instead of a regression.
 */
describe('WrTransfer', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const panes = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-transfer__pane')];
  const rowLabels = (side: 0 | 1): string[] =>
    [...panes()[side].querySelectorAll('.wr-transfer__item .wr-checkbox__text')].map(el => el.textContent.trim());
  const rowBoxes = (side: 0 | 1): HTMLInputElement[] => [
    ...panes()[side].querySelectorAll<HTMLInputElement>('.wr-transfer__item input.wr-checkbox__input'),
  ];
  const headBox = (side: 0 | 1): HTMLInputElement =>
    panes()[side].querySelector<HTMLInputElement>('.wr-transfer__head input.wr-checkbox__input')!;
  const buttons = (): HTMLButtonElement[] => [...root().querySelectorAll<HTMLButtonElement>('button')];
  const toRight = (): HTMLButtonElement => buttons()[0];
  const toLeft = (): HTMLButtonElement => buttons()[1];
  const granted = (): readonly unknown[] => fixture.componentInstance.granted();

  const check = (side: 0 | 1, index: number): void => {
    rowBoxes(side)[index].click();
    fixture.detectChanges();
  };

  const search = (side: 0 | 1, query: string): void => {
    const input = panes()[side].querySelector<HTMLInputElement>('.wr-transfer__search input')!;
    input.value = query;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  /** A disabled `<button>` swallows `.click()` before Angular's listener sees it. */
  const press = (button: HTMLButtonElement): void => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('splits the items by the value, leaving everything else on the left', () => {
    expect(rowLabels(0)).toEqual(['Read', 'Write', 'Delete', 'Audit']);
    expect(rowLabels(1)).toEqual([]);
    expect(panes()[1].querySelector('.wr-transfer__empty')).not.toBeNull();

    fixture.componentInstance.granted.set(['write']);
    fixture.detectChanges();
    expect(rowLabels(0)).toEqual(['Read', 'Delete', 'Audit']);
    expect(rowLabels(1)).toEqual(['Write']);
  });

  it('reads the right pane back in the order the user built it', () => {
    // Not `items` order: the sequence someone assembled is the one they expect.
    fixture.componentInstance.granted.set(['delete', 'read']);
    fixture.detectChanges();
    expect(rowLabels(1)).toEqual(['Delete', 'Read']);
  });

  it('stays a pair of plain lists rather than a listbox', () => {
    expect(root().querySelectorAll('[role="listbox"]').length).toBe(0);
    expect(root().querySelectorAll('[role="option"]').length).toBe(0);
    expect(panes()[0].querySelector('ul.wr-transfer__list')).not.toBeNull();
  });

  it('keeps staging out of the value until a move commits it', () => {
    check(0, 0);
    expect(granted()).toEqual([]);
    expect(rowBoxes(0)[0].checked).toBe(true);

    press(toRight());
    expect(granted()).toEqual(['read']);
    // Staging is spent, not remembered.
    expect(rowBoxes(0).every(box => !box.checked)).toBe(true);
    expect(fixture.componentInstance.touched).toBe(1);
  });

  it('moves rows back out again', () => {
    fixture.componentInstance.granted.set(['read', 'write']);
    fixture.detectChanges();
    check(1, 1);
    press(toLeft());
    expect(granted()).toEqual(['read']);
  });

  it('offers no move until something is staged', () => {
    expect(toRight().disabled).toBe(true);
    expect(toLeft().disabled).toBe(true);

    check(0, 0);
    expect(toRight().disabled).toBe(false);
  });

  it('refuses to stage a disabled row', () => {
    // 'Audit' is disabled; clicking through it must not stage it, or a move would
    // commit a row the consumer marked untouchable.
    const audit = rowBoxes(0)[3];
    expect(audit.disabled).toBe(true);
    audit.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(toRight().disabled).toBe(true);
  });

  it('stages every enabled row the pane is showing when the header is ticked', () => {
    headBox(0).click();
    fixture.detectChanges();
    // Three enabled rows staged, the disabled one left alone.
    expect(rowBoxes(0).filter(box => box.checked).length).toBe(3);

    press(toRight());
    expect(granted()).toEqual(['read', 'write', 'delete']);
  });

  it('counts only what the filter left visible', () => {
    fixture.componentInstance.searchable.set(true);
    fixture.detectChanges();
    search(0, 'te');
    expect(rowLabels(0)).toEqual(['Write', 'Delete']);

    check(0, 0);
    expect(panes()[0].querySelector('.wr-transfer__count')!.textContent.trim()).toBe('1 / 2');
  });

  it('commits only the rows the pane showed as checked', () => {
    // Stage under one filter, then change the filter: the rows that scrolled out of
    // view are no longer counted, no longer ticked, and must no longer move. They
    // used to ride along, so a user who saw one row checked watched two leave.
    fixture.componentInstance.searchable.set(true);
    fixture.detectChanges();

    search(0, 'read');
    check(0, 0);
    search(0, 'write');
    expect(rowLabels(0)).toEqual(['Write']);
    check(0, 0);

    press(toRight());
    expect(granted()).toEqual(['write']);
  });

  it('removes only the rows the right pane showed as checked', () => {
    // The mirror image of the commit rule, and it fails differently: a staged row
    // the filter has hidden is still IN the value, so moving left would take it out
    // along with the visible one.
    fixture.componentInstance.granted.set(['read', 'write', 'delete']);
    fixture.componentInstance.searchable.set(true);
    fixture.detectChanges();

    search(1, 'read');
    check(1, 0);
    search(1, 'write');
    expect(rowLabels(1)).toEqual(['Write']);
    check(1, 0);

    press(toLeft());
    expect(granted()).toEqual(['read', 'delete']);
  });

  it('never lands the same value on the right twice', () => {
    // Staging survives an external write to `value`, so the staged row can already
    // be on the right by the time the move happens.
    fixture.componentInstance.searchable.set(true);
    fixture.detectChanges();

    search(0, 'read');
    check(0, 0);
    fixture.componentInstance.granted.set(['read']);
    fixture.detectChanges();

    search(0, 'write');
    check(0, 0);
    press(toRight());

    expect(granted()).toEqual(['read', 'write']);
  });

  it('unchecks a row whose value is not equal to itself', () => {
    // `WrTransferItem['value']` is documented as compared with SameValueZero, and
    // `NaN !== NaN`, so a plain `!==` filter can never remove it: the row stayed
    // staged while showing itself as unchecked.
    fixture.componentInstance.items.set([{ value: Number.NaN, label: 'Unknown' }]);
    fixture.detectChanges();

    check(0, 0);
    expect(toRight().disabled).toBe(false);
    check(0, 0);
    expect(rowBoxes(0)[0].checked).toBe(false);
    expect(toRight().disabled).toBe(true);
  });

  it('survives the null a classic-forms binding writes on reset', () => {
    // The declared type says `readonly unknown[]`, but `[(ngModel)]` and a reactive
    // `reset()` both write null through the bridge. `wr-checkbox-group` normalises
    // every read for exactly this reason.
    fixture.componentInstance.granted.set(['read']);
    fixture.detectChanges();

    fixture.componentInstance.writeNull();
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(rowLabels(1)).toEqual([]);
    expect(rowLabels(0)).toEqual(['Read', 'Write', 'Delete', 'Audit']);
  });

  it('shows select-all as inert when it has nothing to select', () => {
    // Every visible row disabled: ticking the header staged nothing, but the box
    // still drew itself checked — a one-way `[checked]` is only written back when
    // the expression CHANGES, and it stayed false.
    fixture.componentInstance.items.set([
      { value: 'audit', label: 'Audit', disabled: true },
      { value: 'trace', label: 'Trace', disabled: true },
    ]);
    fixture.detectChanges();

    expect(headBox(0).disabled).toBe(true);
  });

  it('gives select-all a name of its own', () => {
    // The pane heading already names the list; reusing it here leaves a screen
    // reader announcing two different things identically. `wr-table` routes its
    // own `table.selectAll` string for the same control.
    const heading = panes()[0].querySelector('.wr-transfer__title')!.textContent.trim();
    const name = headBox(0).getAttribute('aria-label');

    expect(name).toBeTruthy();
    expect(name).not.toBe(heading);
  });

  it('shuts down completely when disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(root().querySelector('.wr-transfer--disabled')).not.toBeNull();
    expect(toRight().disabled).toBe(true);
    expect(rowBoxes(0).every(box => box.disabled)).toBe(true);
    expect(headBox(0).disabled).toBe(true);
  });
});
