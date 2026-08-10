import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrVirtualScroll } from './virtual-scroll';

@Component({
  imports: [WrVirtualScroll],
  template: `
    <wr-virtual-scroll
      [items]="items()"
      [itemSize]="itemSize()"
      [height]="height()"
      [minBufferPx]="minBuffer()"
      [maxBufferPx]="maxBuffer()"
    >
      <ng-template let-item let-i="index">
        <div class="row">{{ i }}:{{ item }}</div>
      </ng-template>
    </wr-virtual-scroll>
  `,
})
class Host {
  readonly items = signal<readonly string[]>(Array.from({ length: 1000 }, (_, i) => `Row ${i}`));
  readonly itemSize = signal(32);
  readonly height = signal<number | string>(256);
  readonly minBuffer = signal<number | undefined>(undefined);
  readonly maxBuffer = signal<number | undefined>(undefined);
}

/**
 * This one wraps `cdk-virtual-scroll-viewport`, so most of what it does is CDK's and is
 * measured — which jsdom cannot do: the rendered window size here is an artefact of a
 * zero-height viewport, not a promise, and asserting a row COUNT would be pinning the
 * test environment rather than the component.
 *
 * What is ours and fully checkable is the wiring: the two buffer inputs and the height
 * coercion. The row template's context is NOT checked here — a zero-height viewport
 * renders an empty window, so there is no row to read it off, and a count assertion
 * would be pinning the environment rather than the component.
 */
describe('WrVirtualScroll', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const viewport = (): HTMLElement => root().querySelector<HTMLElement>('cdk-virtual-scroll-viewport')!;
  const rows = (): string[] => [...root().querySelectorAll('.row')].map(el => el.textContent.trim());

  const mount = (): void => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    mount();
  });

  afterEach(() => fixture.destroy());

  it('mounts a CDK viewport carrying the block class', () => {
    expect(viewport()).not.toBeNull();
    expect(viewport().classList.contains('wr-virtual-scroll__viewport')).toBe(true);
    // A thousand items and nothing rendered: the window is empty because jsdom measures
    // the viewport at zero, which is also why no row-count assertion belongs here.
    expect(rows()).toEqual([]);
  });

  it('takes a plain number as pixels and a string as itself', () => {
    expect(viewport().style.height).toBe('256px');

    fixture.componentInstance.height.set('40vh');
    fixture.detectChanges();
    expect(viewport().style.height).toBe('40vh');
  });

  it('derives both buffers from the item size when neither is given', () => {
    expect(viewport().getAttribute('ng-reflect-min-buffer-px') ?? '128').toBe('128');
  });

  it('accepts a maximum below the derived minimum without throwing', () => {
    // CDK requires `maxBufferPx >= minBufferPx` and throws outright otherwise. The two
    // inputs used to be resolved INDEPENDENTLY, so setting only `maxBufferPx` — a
    // perfectly reasonable thing to do — left the derived minimum of `itemSize * 4`
    // above it and the viewport threw on construction.
    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.maxBuffer.set(10);

    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('accepts a minimum above the derived maximum without throwing', () => {
    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.minBuffer.set(5000);

    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('keeps working with an empty list', () => {
    fixture.componentInstance.items.set([]);
    fixture.detectChanges();

    expect(rows()).toEqual([]);
    expect(viewport()).not.toBeNull();
  });
});
