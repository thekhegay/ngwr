import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTextareaHarness } from './testing';
import { WrTextarea } from './textarea';

@Component({
  imports: [WrTextarea],
  template: `
    <wr-textarea
      ariaLabel="Notes"
      [(value)]="notes"
      [clearable]="clearable()"
      [clearLabel]="clearLabel()"
      [loading]="loading()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      (touch)="touched = touched + 1"
    />
  `,
})
class Host {
  readonly notes = signal('draft');
  readonly clearable = signal(true);
  readonly clearLabel = signal<string | null>(null);
  readonly loading = signal(false);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  touched = 0;
}

describe('WrTextarea clearable and loading', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-textarea')!;
  const native = (): HTMLTextAreaElement => root().querySelector<HTMLTextAreaElement>('.wr-textarea__native')!;
  const clear = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-textarea__clear');
  const spinner = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-textarea__spinner');

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(root());
    fixture.detectChanges();
  });

  afterEach(() => {
    root().remove();
    fixture.destroy();
  });

  it('shows the clear button while there is text', () => {
    expect(clear()).not.toBeNull();

    fixture.componentInstance.notes.set('');
    fixture.detectChanges();
    expect(clear()).toBeNull();
  });

  it('draws nothing unless `clearable` is set', () => {
    fixture.componentInstance.clearable.set(false);
    fixture.detectChanges();

    expect(clear()).toBeNull();
    expect(host().classList.contains('wr-textarea--clearable')).toBe(false);
  });

  it('keeps room for the button whether or not it is on show', () => {
    fixture.componentInstance.notes.set('');
    fixture.detectChanges();

    expect(host().classList.contains('wr-textarea--clearable')).toBe(true);
  });

  it.each(['disabled', 'readonly'] as const)('hides the clear button while the field is %s', state => {
    fixture.componentInstance[state].set(true);
    fixture.detectChanges();

    expect(clear()).toBeNull();
  });

  it('is a named button that stays out of the tab order', () => {
    expect(clear()!.getAttribute('role')).toBe('button');
    expect(clear()!.getAttribute('aria-label')).toBe('Clear');
    expect(clear()!.getAttribute('tabindex')).toBe('-1');

    fixture.componentInstance.clearLabel.set('Clear notes');
    fixture.detectChanges();
    expect(clear()!.getAttribute('aria-label')).toBe('Clear notes');
  });

  it('clears to an empty string, emits touch and puts focus back in the field', () => {
    clear()!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.notes()).toBe('');
    expect(native().value).toBe('');
    expect(fixture.componentInstance.touched).toBe(1);
    expect(document.activeElement).toBe(native());
    expect(clear()).toBeNull();
  });

  it('marks the field busy and draws a spinner while loading', () => {
    expect(spinner()).toBeNull();
    expect(native().hasAttribute('aria-busy')).toBe(false);

    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    expect(spinner()).not.toBeNull();
    // The field carries the state, so the spinner is not announced a second time.
    expect(spinner()!.getAttribute('aria-hidden')).toBe('true');
    expect(native().getAttribute('aria-busy')).toBe('true');
    expect(host().classList.contains('wr-textarea--loading')).toBe(true);
  });

  it('keeps the field editable while loading', () => {
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    expect(native().disabled).toBe(false);
    expect(native().readOnly).toBe(false);
    native().value = 'still typing';
    native().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.notes()).toBe('still typing');
  });

  describe('through the harness', () => {
    it('clicks the clear button and reports the spinner', async () => {
      const harness = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrTextareaHarness);
      expect(await harness.hasClearButton()).toBe(true);
      expect(await harness.isLoading()).toBe(false);

      await harness.clickClear();
      expect(fixture.componentInstance.notes()).toBe('');
      expect(fixture.componentInstance.touched).toBe(1);
      expect(await harness.hasClearButton()).toBe(false);
      await expect(harness.clickClear()).rejects.toThrow(/no clear button/);

      fixture.componentInstance.loading.set(true);
      expect(await harness.isLoading()).toBe(true);
    });
  });
});
