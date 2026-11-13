import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTag } from './tag';
import type { WrTagSize } from './types';

@Component({
  imports: [WrTag],
  template: `<wr-tag closable [size]="size()">Angular</wr-tag>`,
})
class Host {
  readonly size = signal<WrTagSize>('md');
}

/**
 * The class half of `size`. What each size does to the hooks, the remove
 * button's among them, is read off the compiled sheet in `size-hooks.spec.ts`.
 */
describe('WrTag size', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-tag')!;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('paints no size modifier at md, the default', () => {
    expect(host().classList.contains('wr-tag')).toBe(true);
    expect(host().className).not.toMatch(/wr-tag--(sm|md|lg)/);
  });

  it.each(['sm', 'lg'] as const)('adds wr-tag--%s and drops it on the way back to md', async size => {
    fixture.componentInstance.size.set(size);
    await fixture.whenStable();

    expect(host().classList.contains(`wr-tag--${size}`)).toBe(true);
    // The remove button is the same element at every size: the sheet resizes it.
    expect(host().querySelector('.wr-tag__remove')).not.toBeNull();

    fixture.componentInstance.size.set('md');
    await fixture.whenStable();

    expect(host().className).not.toMatch(/wr-tag--(sm|md|lg)/);
  });
});
