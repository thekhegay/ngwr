import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTable } from './table';

@Component({
  imports: [WrTable],
  template: `<wr-table [columns]="columns" [items]="items()" rowKey="id" />`,
})
class EmptyHost {
  protected readonly columns = { name: { title: 'Name' } };
  readonly items = signal<{ id: number; name: string }[]>([]);
}

/** jsdom lays nothing out: the scroll box's width is stubbed and its observer driven by hand. */
describe('WrTable empty label width', () => {
  let fixture: ComponentFixture<EmptyHost>;
  let callbacks: (() => void)[];
  let width: number;

  const label = (): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.wr-table__empty-label');

  beforeEach(() => {
    callbacks = [];
    width = 320;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          callbacks.push(callback);
        }
        observe = vi.fn();
        disconnect = vi.fn();
      }
    );
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
    fixture = TestBed.createComponent(EmptyHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sizes the label to the scroll box and follows it', () => {
    expect(label()!.style.inlineSize).toBe('320px');
    width = 180;
    callbacks.forEach(callback => callback());
    fixture.detectChanges();
    expect(label()!.style.inlineSize).toBe('180px');
  });

  it('sets no size once rows show', () => {
    fixture.componentInstance.items.set([{ id: 1, name: 'Ada' }]);
    fixture.detectChanges();
    expect(label()).toBeNull();
    fixture.componentInstance.items.set([]);
    fixture.detectChanges();
    expect(label()!.style.inlineSize).toBe('320px');
  });
});
