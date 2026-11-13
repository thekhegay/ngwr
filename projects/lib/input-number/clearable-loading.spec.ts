import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInputNumber } from './input-number';
import { WrInputNumberHarness } from './testing';

@Component({
  imports: [WrInputNumber],
  template: `
    <wr-input-number
      ariaLabel="Amount"
      suffix="kg"
      [(value)]="amount"
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
  readonly amount = signal<number | null>(5);
  readonly clearable = signal(true);
  readonly clearLabel = signal<string | null>(null);
  readonly loading = signal(false);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  touched = 0;
}

describe('WrInputNumber clearable and loading', () => {
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

  it('shows the clear button while there is a value', async () => {
    expect(clear()).not.toBeNull();

    fixture.componentInstance.amount.set(null);
    await settle();
    expect(clear()).toBeNull();
  });

  it('draws nothing unless `clearable` is set', async () => {
    fixture.componentInstance.clearable.set(false);
    await settle();

    expect(clear()).toBeNull();
  });

  it.each(['disabled', 'readonly'] as const)('hides the clear button while the field is %s', async state => {
    fixture.componentInstance[state].set(true);
    await settle();

    expect(clear()).toBeNull();
  });

  it('is a named button, and `clearLabel` renames it', async () => {
    expect(clear()!.getAttribute('role')).toBe('button');
    expect(clear()!.getAttribute('aria-label')).toBe('Clear');

    fixture.componentInstance.clearLabel.set('Clear amount');
    await settle();
    expect(clear()!.getAttribute('aria-label')).toBe('Clear amount');
  });

  it('clears to null, emits touch and puts focus back in the field', async () => {
    clear()!.click();
    await settle();

    expect(fixture.componentInstance.amount()).toBeNull();
    expect(field().value).toBe('');
    expect(fixture.componentInstance.touched).toBe(1);
    expect(document.activeElement).toBe(field());
    expect(clear()).toBeNull();
  });

  it('draws the clear button and the spinner before the suffix and the steppers', async () => {
    fixture.componentInstance.loading.set(true);
    await settle();

    const group = root().querySelector('wr-input-group')!;
    expect([...group.children].map(el => el.className.split(' ')[0])).toEqual([
      'wr-input',
      'wr-input-group__clear',
      'wr-spinner',
      'wr-input-group__affix',
      'wr-input-group__affix',
    ]);
    expect(group.lastElementChild!.classList.contains('wr-input-number__steppers')).toBe(true);
  });

  it('marks the field busy and draws a spinner while loading', async () => {
    expect(spinner()).toBeNull();
    expect(field().hasAttribute('aria-busy')).toBe(false);

    fixture.componentInstance.loading.set(true);
    await settle();

    expect(spinner()).not.toBeNull();
    expect(spinner()!.getAttribute('aria-hidden')).toBe('true');
    expect(field().getAttribute('aria-busy')).toBe('true');
  });

  it('keeps the field editable while loading', async () => {
    fixture.componentInstance.loading.set(true);
    await settle();

    expect(field().disabled).toBe(false);
    field().value = '42';
    field().dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(fixture.componentInstance.amount()).toBe(42);
  });

  describe('through the harness', () => {
    it('clicks the clear button and reports the spinner', async () => {
      const harness = await TestbedHarnessEnvironment.loader(fixture).getHarness(WrInputNumberHarness);
      expect(await harness.hasClearButton()).toBe(true);
      expect(await harness.isLoading()).toBe(false);

      await harness.clickClear();
      expect(fixture.componentInstance.amount()).toBeNull();
      expect(fixture.componentInstance.touched).toBe(1);
      expect(await harness.hasClearButton()).toBe(false);
      await expect(harness.clickClear()).rejects.toThrow(/no clear button/);

      fixture.componentInstance.loading.set(true);
      expect(await harness.isLoading()).toBe(true);
    });
  });
});
