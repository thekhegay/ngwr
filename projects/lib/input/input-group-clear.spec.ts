import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInput, WrInputSuffix } from './directives';
import { WrInputGroup } from './input-group';

@Component({
  imports: [FormsModule, WrInput, WrInputGroup, WrInputSuffix],
  template: `
    <wr-input-group
      [clearable]="clearable()"
      [clearLabel]="clearLabel()"
      [loading]="loading()"
      (cleared)="cleared = cleared + 1"
    >
      <input
        wrInput
        aria-label="Search"
        [(ngModel)]="query"
        [disabled]="disabled()"
        [readonly]="readonly()"
        (input)="inputs = inputs + 1"
      />
      @if (suffix()) {
        <span wrInputSuffix>USD</span>
      }
    </wr-input-group>
  `,
})
class Host {
  readonly query = signal('');
  readonly clearable = signal(true);
  readonly clearLabel = signal<string | null>(null);
  readonly loading = signal(false);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly suffix = signal(false);
  cleared = 0;
  inputs = 0;
}

/**
 * `wrInput` is a directive on a native field and cannot draw inside it, so the
 * group draws the × and the spinner for the field it wraps. The field's value is
 * not a signal: the group has to notice typing AND a model write, which reaches
 * the element with no event at all.
 */
describe('WrInputGroup clearable and loading', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (): HTMLInputElement => root().querySelector<HTMLInputElement>('input')!;
  const clear = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-input-group__clear');
  const spinner = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-input-group__spinner');

  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const type = async (text: string): Promise<void> => {
    field().value = text;
    field().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(root());
    await settle();
  });

  afterEach(() => {
    root().remove();
    fixture.destroy();
  });

  it('draws no clear button over an empty field', () => {
    expect(clear()).toBeNull();
  });

  // Clearing used to drop the × and narrow the group by its width.
  it('holds the room of the clear button while the field is empty', async () => {
    const space = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-input-group__clear-space');
    expect(space()?.getAttribute('aria-hidden')).toBe('true');

    await type('ada');
    expect(space()).toBeNull();
    expect(clear()).not.toBeNull();

    clear()!.click();
    await settle();
    expect(clear()).toBeNull();
    expect(space()).not.toBeNull();

    fixture.componentInstance.clearable.set(false);
    await settle();
    expect(space()).toBeNull();
  });

  it('shows the clear button once text is typed', async () => {
    await type('ada');

    expect(clear()).not.toBeNull();
  });

  it('shows the clear button for a value the model wrote, with no input event', async () => {
    fixture.componentInstance.query.set('from the model');
    await settle();

    expect(field().value).toBe('from the model');
    expect(clear()).not.toBeNull();
  });

  it('draws nothing unless `clearable` is set', async () => {
    fixture.componentInstance.clearable.set(false);
    await type('ada');

    expect(clear()).toBeNull();
  });

  it.each(['disabled', 'readonly'] as const)('hides the clear button while the field is %s', async state => {
    await type('ada');
    fixture.componentInstance[state].set(true);
    await settle();

    expect(clear()).toBeNull();

    fixture.componentInstance[state].set(false);
    await settle();
    expect(clear()).not.toBeNull();
  });

  it('is a named button that stays out of the tab order', async () => {
    await type('ada');

    expect(clear()!.getAttribute('role')).toBe('button');
    expect(clear()!.getAttribute('aria-label')).toBe('Clear');
    expect(clear()!.getAttribute('tabindex')).toBe('-1');
    expect(clear()!.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('takes its name from `clearLabel`', async () => {
    fixture.componentInstance.clearLabel.set('Clear search');
    await type('ada');

    expect(clear()!.getAttribute('aria-label')).toBe('Clear search');
  });

  it('clears as an edit: the model, the listeners and `cleared` all hear it', async () => {
    await type('ada');
    const before = fixture.componentInstance.inputs;

    clear()!.click();
    await settle();

    expect(field().value).toBe('');
    expect(fixture.componentInstance.query()).toBe('');
    expect(fixture.componentInstance.inputs).toBe(before + 1);
    expect(fixture.componentInstance.cleared).toBe(1);
    expect(clear()).toBeNull();
  });

  it('puts focus back in the field', async () => {
    await type('ada');

    clear()!.click();

    expect(document.activeElement).toBe(field());
  });

  it('draws the clear button and the spinner between the field and a suffix', async () => {
    fixture.componentInstance.suffix.set(true);
    fixture.componentInstance.loading.set(true);
    await type('ada');

    const group = root().querySelector('wr-input-group')!;
    expect([...group.children].map(el => el.className.split(' ')[0])).toEqual([
      'wr-input',
      'wr-input-group__clear',
      'wr-spinner',
      'wr-input-group__affix',
    ]);
  });

  it('marks the field busy and draws a spinner while loading', async () => {
    expect(spinner()).toBeNull();
    expect(field().hasAttribute('aria-busy')).toBe(false);

    fixture.componentInstance.loading.set(true);
    await settle();

    expect(spinner()).not.toBeNull();
    // The field carries the state, so the spinner is not announced a second time.
    expect(spinner()!.getAttribute('aria-hidden')).toBe('true');
    expect(field().getAttribute('aria-busy')).toBe('true');

    fixture.componentInstance.loading.set(false);
    await settle();
    expect(spinner()).toBeNull();
    expect(field().hasAttribute('aria-busy')).toBe(false);
  });

  it('keeps the field editable while loading', async () => {
    fixture.componentInstance.loading.set(true);
    await settle();

    expect(field().disabled).toBe(false);
    expect(field().readOnly).toBe(false);
    await type('still typing');
    expect(fixture.componentInstance.query()).toBe('still typing');
  });
});
