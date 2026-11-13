import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTransfer } from './transfer';
import type { WrTransferItem, WrTransferSize } from './types';

const ITEMS: readonly WrTransferItem[] = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
];

@Component({
  imports: [WrTransfer],
  template: `<wr-transfer searchable [items]="items" [size]="size()" />`,
})
class Host {
  readonly items = ITEMS;
  readonly size = signal<WrTransferSize>('md');
}

/**
 * The class half of `size`, and the size it hands the controls it renders. What
 * each size does to the hooks is read off the compiled sheet in
 * `size-hooks.spec.ts`.
 */
describe('WrTransfer size', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-transfer')!;
  const all = (selector: string): HTMLElement[] => [...host().querySelectorAll<HTMLElement>(selector)];
  /** The size modifier each inner control of one kind carries, `md` for none. */
  const sizes = (selector: string, block: string): string[] =>
    all(selector).map(el =>
      el.classList.contains(`${block}--sm`) ? 'sm' : el.classList.contains(`${block}--lg`) ? 'lg' : 'md'
    );
  const controls = (): Record<string, string[]> => ({
    checkboxes: [...new Set(sizes('wr-checkbox', 'wr-checkbox'))],
    search: [...new Set(sizes('.wr-transfer__search input', 'wr-input'))],
    buttons: [...new Set(sizes('.wr-transfer__move', 'wr-btn'))],
  });

  const set = async (size: WrTransferSize): Promise<void> => {
    fixture.componentInstance.size.set(size);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('paints no size modifier at md, the default, and keeps the sm controls it always drew', () => {
    expect(host().className).not.toMatch(/wr-transfer--(sm|md|lg)/);
    expect(controls()).toEqual({ checkboxes: ['sm'], search: ['sm'], buttons: ['sm'] });
  });

  it('adds wr-transfer--sm and keeps the sm controls: they are already the smallest', async () => {
    await set('sm');

    expect(host().classList.contains('wr-transfer--sm')).toBe(true);
    expect(controls()).toEqual({ checkboxes: ['sm'], search: ['sm'], buttons: ['sm'] });
  });

  it('adds wr-transfer--lg and steps every control up to md', async () => {
    await set('lg');

    expect(host().classList.contains('wr-transfer--lg')).toBe(true);
    expect(controls()).toEqual({ checkboxes: ['md'], search: ['md'], buttons: ['md'] });
  });

  it('drops the modifier and the larger controls on the way back to md', async () => {
    await set('lg');
    await set('md');

    expect(host().className).not.toMatch(/wr-transfer--(sm|md|lg)/);
    expect(controls()).toEqual({ checkboxes: ['sm'], search: ['sm'], buttons: ['sm'] });
  });
});
