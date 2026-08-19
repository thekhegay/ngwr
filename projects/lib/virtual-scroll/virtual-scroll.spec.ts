import { CdkFixedSizeVirtualScroll } from '@angular/cdk/scrolling';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

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

  /**
   * The resolved buffers, read off the CDK directive that holds them.
   *
   * They used to be read as `ng-reflect-min-buffer-px`, which Angular 22 emits only
   * when `provideNgReflectAttributes()` is in the injector — nothing here provides
   * it, so `getAttribute` answered `null` and the assertion's own `?? '128'`
   * fallback was the value being compared.
   *
   * `CdkFixedSizeVirtualScroll` is where `[itemSize]` / `[minBufferPx]` /
   * `[maxBufferPx]` land; `CdkVirtualScrollViewport` carries none of the three. And
   * `debugElement.componentInstance` is the host component, so the directive comes
   * out of the element injector.
   */
  const buffers = (): CdkFixedSizeVirtualScroll =>
    fixture.debugElement.query(By.directive(CdkFixedSizeVirtualScroll)).injector.get(CdkFixedSizeVirtualScroll);

  /** Re-mounts so an input can be set BEFORE the viewport is constructed. */
  const remount = (set: (host: Host) => void): void => {
    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    set(fixture.componentInstance);
  };

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
    // itemSize 32, so 32 * 4 and 32 * 8.
    expect([buffers().minBufferPx, buffers().maxBufferPx]).toEqual([128, 256]);
  });

  it('accepts a maximum below the derived minimum, pulling the minimum down to it', () => {
    // CDK requires `maxBufferPx >= minBufferPx` and throws outright otherwise. The two
    // inputs used to be resolved INDEPENDENTLY, so setting only `maxBufferPx` — a
    // perfectly reasonable thing to do — left the derived minimum of `itemSize * 4`
    // above it and the viewport threw on construction. Not throwing is half of it:
    // the landing values are what say the pair was resolved rather than clamped by
    // the CDK.
    remount(host => host.maxBuffer.set(10));

    expect(() => fixture.detectChanges()).not.toThrow();
    expect([buffers().minBufferPx, buffers().maxBufferPx]).toEqual([10, 10]);
  });

  it('accepts a minimum above the derived maximum, pushing the maximum up to it', () => {
    remount(host => host.minBuffer.set(5000));

    expect(() => fixture.detectChanges()).not.toThrow();
    expect([buffers().minBufferPx, buffers().maxBufferPx]).toEqual([5000, 5000]);
  });

  it('sorts a pair given the wrong way round', () => {
    remount(host => {
      host.minBuffer.set(300);
      host.maxBuffer.set(100);
    });

    expect(() => fixture.detectChanges()).not.toThrow();
    expect([buffers().minBufferPx, buffers().maxBufferPx]).toEqual([100, 300]);
  });

  it('keeps working with an empty list', () => {
    fixture.componentInstance.items.set([]);
    fixture.detectChanges();

    expect(rows()).toEqual([]);
    expect(viewport()).not.toBeNull();
  });
});
