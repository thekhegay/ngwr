import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrList } from './list';
import { WrListItem } from './list-item';

@Component({
  imports: [WrList, WrListItem],
  template: `
    <wr-list [ariaLabel]="ariaLabel()">
      <wr-list-item>Plain row</wr-list-item>
      <wr-list-item interactive [disabled]="disabled()" (click)="picks.set(picks() + 1)">
        Interactive row
        <button type="button" class="inner-btn" (click)="inner.set(inner() + 1); $event.stopPropagation()">Go</button>
        <input class="inner-input" />
      </wr-list-item>
    </wr-list>
  `,
})
class Host {
  readonly ariaLabel = signal('Recent files');
  readonly disabled = signal(false);
  readonly picks = signal(0);
  readonly inner = signal(0);
}

/**
 * The list is a `list` / `listitem` structure, and `interactive` layers a click
 * target onto a row without changing that. What has to hold is that the row is
 * reachable AND operable: focusable, activated by Enter and Space, and silent
 * when disabled. A row that takes a tab stop it cannot act on is worse than one
 * that takes none.
 */
describe('WrList', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const items = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('wr-list-item')];
  const plain = (): HTMLElement => items()[0];
  const interactive = (): HTMLElement => items()[1];
  const picks = (): number => fixture.componentInstance.picks();

  const press = (el: HTMLElement, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders a named list of list items', () => {
    const ul = root().querySelector('ul')!;
    expect(ul.getAttribute('role')).toBe('list');
    expect(items().every(i => i.getAttribute('role') === 'listitem')).toBe(true);
    // On the `<ul>`, which is the element carrying `role="list"`. The host is a
    // role-less custom element, where `aria-label` is prohibited and names
    // nothing — this assertion used to pin the attribute's PLACEMENT rather
    // than the list being named, so it passed while the list had no name.
    expect(ul.getAttribute('aria-label')).toBe('Recent files');
    expect(root().querySelector('wr-list')!.hasAttribute('aria-label')).toBe(false);
  });

  it('gives a tab stop only to the interactive row', () => {
    // A plain row is content. A tab stop on it is a stop that does nothing.
    expect(plain().getAttribute('tabindex')).toBeNull();
    expect(interactive().getAttribute('tabindex')).toBe('0');
  });

  it('activates on Enter and on Space', () => {
    press(interactive(), 'Enter');
    expect(picks()).toBe(1);

    press(interactive(), ' ');
    expect(picks()).toBe(2);
  });

  it('swallows Space so the page does not scroll under the user', () => {
    expect(press(interactive(), ' ').defaultPrevented).toBe(true);
  });

  it('leaves Enter and Space on a control inside the row to the control', () => {
    const button = interactive().querySelector<HTMLElement>('.inner-btn')!;
    const input = interactive().querySelector<HTMLElement>('.inner-input')!;

    expect(press(button, 'Enter').defaultPrevented).toBe(false);
    expect(press(input, ' ').defaultPrevented).toBe(false);
    expect(picks()).toBe(0);

    button.click();
    expect(fixture.componentInstance.inner()).toBe(1);
    expect(picks()).toBe(0);
  });

  it('does not activate a plain row', () => {
    press(plain(), 'Enter');
    expect(picks()).toBe(0);
  });

  it('goes quiet and says so while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(interactive().getAttribute('aria-disabled')).toBe('true');

    press(interactive(), 'Enter');
    expect(picks()).toBe(0);
  });

  it('carries the public BEM classes, including the interactive modifier', () => {
    expect(plain().className).toContain('wr-list__item');
    expect(plain().className).not.toContain('wr-list__item--interactive');
    expect(interactive().className).toContain('wr-list__item--interactive');
  });
});

@Component({
  imports: [WrList, WrListItem],
  template: `
    <wr-list
      ariaLabel="Folder"
      [selection]="selection()"
      [(value)]="value"
      [disabled]="disabled()"
      [readonly]="readonly()"
      (touch)="touched.set(touched() + 1)"
    >
      <wr-list-item value="inbox">Inbox</wr-list-item>
      <wr-list-item value="drafts" disabled>Drafts</wr-list-item>
      <wr-list-item value="sent">Sent</wr-list-item>
      <wr-list-item value="spam">Spam</wr-list-item>
    </wr-list>
    <button type="button" class="outside">Outside</button>
  `,
})
class SelectHost {
  readonly selection = signal<'single' | 'multiple' | null>('single');
  readonly value = signal<unknown>(null);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly touched = signal(0);
}

@Component({
  imports: [WrList, WrListItem],
  template: `
    <wr-list ariaLabel="Mail" selection="single" [(value)]="value">
      <div role="group" aria-label="Folders">
        <wr-list-item value="inbox">Inbox</wr-list-item>
        <wr-list-item value="sent">
          Sent
          <wr-list ariaLabel="Labels" selection="single">
            <wr-list-item value="work">Work</wr-list-item>
          </wr-list>
        </wr-list-item>
      </div>
    </wr-list>
  `,
})
class WrappedHost {
  readonly value = signal<unknown>(null);
}

describe('WrList selection with wrapped rows', () => {
  it('navigates and picks rows inside a wrapper, but not the rows of a nested list', () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(WrappedHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const [inbox, sent, work] = [...root.querySelectorAll<HTMLElement>('wr-list-item')];

    expect([inbox, sent, work].map(row => row.getAttribute('tabindex'))).toEqual(['0', '-1', '0']);

    inbox.focus();
    inbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(sent);

    sent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(document.activeElement).toBe(sent);

    sent.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('sent');

    root.remove();
    fixture.destroy();
  });
});

/**
 * `selection` switches the WHOLE container: a listbox of options, never an
 * option inside a `role="list"`. jsdom lays nothing out, so nothing here says
 * the selected row is visibly marked or that the focus ring is drawn.
 */
describe('WrList selection', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SelectHost>>;

  const host = (): SelectHost => fixture.componentInstance;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const ul = (): HTMLElement => root().querySelector('ul')!;
  const items = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('wr-list-item')];
  const selected = (): (string | null)[] => items().map(i => i.getAttribute('aria-selected'));
  const tabindexes = (): (string | null)[] => items().map(i => i.getAttribute('tabindex'));

  const press = (el: HTMLElement, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };
  const click = (el: HTMLElement): void => {
    el.click();
    fixture.detectChanges();
  };
  const set = (apply: () => void): void => {
    apply();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(SelectHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    (fixture.nativeElement as HTMLElement).remove();
    fixture.destroy();
  });

  it('stays a plain list while selection is null, and goes back to one', () => {
    set(() => host().selection.set(null));

    expect(ul().getAttribute('role')).toBe('list');
    expect(items().map(i => i.getAttribute('role'))).toEqual(['listitem', 'listitem', 'listitem', 'listitem']);
    expect(selected()).toEqual([null, null, null, null]);
    expect(tabindexes()).toEqual([null, null, null, null]);
    expect(ul().hasAttribute('aria-multiselectable')).toBe(false);
    expect(items()[0].className).not.toContain('wr-list__item--selectable');

    click(items()[0]);
    expect(host().value()).toBeNull();
  });

  it('is a listbox of options with one tab stop', () => {
    expect(ul().getAttribute('role')).toBe('listbox');
    expect(ul().getAttribute('aria-label')).toBe('Folder');
    expect(ul().hasAttribute('aria-multiselectable')).toBe(false);
    expect(items().every(i => i.getAttribute('role') === 'option')).toBe(true);
    expect(selected()).toEqual(['false', 'false', 'false', 'false']);
    // The disabled row is out of the tab order and says so.
    expect(tabindexes()).toEqual(['0', null, '-1', '-1']);
    expect(items()[1].getAttribute('aria-disabled')).toBe('true');
  });

  it('selects one row on click, Enter and Space', () => {
    click(items()[2]);
    expect(host().value()).toBe('sent');
    expect(selected()).toEqual(['false', 'false', 'true', 'false']);
    expect(items()[2].className).toContain('wr-list__item--selected');

    expect(press(items()[0], 'Enter').defaultPrevented).toBe(true);
    expect(host().value()).toBe('inbox');

    expect(press(items()[3], ' ').defaultPrevented).toBe(true);
    expect(host().value()).toBe('spam');
    expect(selected()).toEqual(['false', 'false', 'false', 'true']);

    // A second pick of the same row keeps it: single selection has no "none" gesture.
    click(items()[3]);
    expect(host().value()).toBe('spam');
  });

  it('toggles rows under multiple and says it is multiselectable', () => {
    set(() => {
      host().selection.set('multiple');
      host().value.set([]);
    });
    expect(ul().getAttribute('aria-multiselectable')).toBe('true');

    click(items()[0]);
    press(items()[2], ' ');
    expect(host().value()).toEqual(['inbox', 'sent']);
    expect(selected()).toEqual(['true', 'false', 'true', 'false']);

    click(items()[0]);
    expect(host().value()).toEqual(['sent']);
  });

  it('reflects a value written from outside and puts the tab stop on it', () => {
    set(() => host().value.set('sent'));

    expect(selected()).toEqual(['false', 'false', 'true', 'false']);
    expect(tabindexes()).toEqual(['-1', null, '0', '-1']);
  });

  it('moves focus with the arrows, Home and End, past a disabled row', () => {
    items()[0].focus();
    fixture.detectChanges();

    expect(press(items()[0], 'ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items()[2]);
    expect(tabindexes()).toEqual(['-1', null, '0', '-1']);

    press(items()[2], 'End');
    expect(document.activeElement).toBe(items()[3]);

    press(items()[3], 'ArrowDown');
    expect(document.activeElement).toBe(items()[3]);

    press(items()[3], 'ArrowUp');
    expect(document.activeElement).toBe(items()[2]);

    press(items()[2], 'Home');
    expect(document.activeElement).toBe(items()[0]);

    // Moving the focus picks nothing.
    expect(host().value()).toBeNull();
  });

  it('jumps to a row by its first letters', () => {
    items()[0].focus();

    press(items()[0], 's');
    expect(document.activeElement).toBe(items()[2]);

    press(items()[2], 'p');
    expect(document.activeElement).toBe(items()[3]);

    // A disabled row is never a match.
    press(items()[3], 'd');
    expect(document.activeElement).toBe(items()[3]);
  });

  it('never selects a disabled row', () => {
    click(items()[1]);
    press(items()[1], 'Enter');

    expect(host().value()).toBeNull();
  });

  it('takes every row out of the tab order while disabled', () => {
    set(() => host().disabled.set(true));

    expect(ul().getAttribute('aria-disabled')).toBe('true');
    expect(tabindexes()).toEqual([null, null, null, null]);
    expect(items().every(i => i.getAttribute('aria-disabled') === 'true')).toBe(true);

    click(items()[0]);
    expect(host().value()).toBeNull();
  });

  it('keeps focus and the value but refuses a pick while readonly', () => {
    set(() => {
      host().value.set('inbox');
      host().readonly.set(true);
    });

    expect(ul().getAttribute('aria-readonly')).toBe('true');
    expect(root().querySelector('wr-list')!.className).toContain('wr-list--readonly');
    expect(tabindexes()).toEqual(['0', null, '-1', '-1']);

    click(items()[2]);
    press(items()[3], ' ');
    expect(host().value()).toBe('inbox');

    items()[0].focus();
    press(items()[0], 'ArrowDown');
    expect(document.activeElement).toBe(items()[2]);
  });

  it('emits touch when focus leaves the list, not between rows', () => {
    items()[0].focus();
    press(items()[0], 'ArrowDown');
    expect(host().touched()).toBe(0);

    root().querySelector<HTMLElement>('.outside')!.focus();
    expect(host().touched()).toBe(1);
  });
});
