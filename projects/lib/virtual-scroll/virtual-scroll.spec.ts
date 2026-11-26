import { type Direction, Directionality } from '@angular/cdk/bidi';
import { CdkFixedSizeVirtualScroll, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Subject } from 'rxjs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrVirtualScroll } from './virtual-scroll';

@Component({
  imports: [WrVirtualScroll],
  template: `
    <wr-virtual-scroll
      [items]="items()"
      [itemSize]="itemSize()"
      [height]="height()"
      [orientation]="orientation()"
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
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
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

  it('puts the scroller in the tab order so a keyboard can scroll rows with no focusable content', () => {
    expect(viewport().getAttribute('tabindex')).toBe('0');
  });

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

  it('re-measures the viewport when its own height changes', async () => {
    // The CDK measures once and then only on a WINDOW resize, so growing the box
    // through `height` left the rendered window sized for the old one: a blank
    // band under the last row. What is ours to check is that the re-measure is
    // asked for; the band itself is layout, which jsdom has none of.
    const cdk = fixture.debugElement
      .query(By.directive(CdkVirtualScrollViewport))
      .injector.get(CdkVirtualScrollViewport);
    await fixture.whenStable();
    const measure = vi.spyOn(cdk, 'checkViewportSize');

    fixture.componentInstance.height.set(600);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(measure).toHaveBeenCalled();
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

  describe('orientation', () => {
    /**
     * jsdom lays nothing out, so the viewport is given a width and no height by
     * hand: which of the two the CDK reads is then visible in how many items it
     * renders. What this cannot prove is the row itself, the items sitting side by
     * side, which is the stylesheet's and needs a real browser.
     */
    const WIDTH = 640;
    let width: { mockRestore: () => void };

    const settle = async (): Promise<void> => {
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 20));
        fixture.detectChanges();
        await fixture.whenStable();
      }
    };

    const mountAs = async (orientation: 'vertical' | 'horizontal'): Promise<void> => {
      remount(host => host.orientation.set(orientation));
      fixture.detectChanges();
      await settle();
    };

    beforeEach(() => {
      width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(WIDTH);
    });

    afterEach(() => width.mockRestore());

    it('stays vertical by default, with no modifier on the host', async () => {
      await mountAs('vertical');

      const host = root().querySelector('wr-virtual-scroll')!;
      expect(host.classList.contains('wr-virtual-scroll--horizontal')).toBe(false);
      expect(viewport().classList.contains('cdk-virtual-scroll-orientation-vertical')).toBe(true);
      // The width is not what a vertical viewport measures: only the buffer renders.
      expect(rows().length).toBeLessThan(WIDTH / 32);
    });

    it('renders a window of items sized by the viewport width when horizontal', async () => {
      await mountAs('horizontal');

      const host = root().querySelector('wr-virtual-scroll')!;
      expect(host.classList.contains('wr-virtual-scroll--horizontal')).toBe(true);
      expect(viewport().classList.contains('cdk-virtual-scroll-orientation-horizontal')).toBe(true);
      expect(rows()[0]).toBe('0:Row 0');
      expect(rows().length).toBeGreaterThanOrEqual(WIDTH / 32);
      expect(rows().length).toBeLessThan(1000);
      // The strip keeps the height it was given.
      expect(viewport().style.height).toBe('256px');
    });

    it('scrolls a horizontal viewport on the inline axis', async () => {
      await mountAs('horizontal');
      const el = viewport();
      el.scrollTo = ((options: ScrollToOptions): void => {
        if (options.left != null) el.scrollLeft = options.left;
        if (options.top != null) el.scrollTop = options.top;
      }) as typeof el.scrollTo;

      const scroller = fixture.debugElement.query(By.directive(WrVirtualScroll)).componentInstance as WrVirtualScroll;
      scroller.scrollToIndex(100);
      el.dispatchEvent(new Event('scroll'));
      await settle();

      expect([el.scrollLeft, el.scrollTop]).toEqual([3200, 0]);
      expect(rows()).toContain('100:Row 100');
      expect(rows()).not.toContain('0:Row 0');
    });

    // The CDK reads the direction from `Directionality`, never from a `dir` in the DOM.
    it('renders the window toward the inline start under an RTL Directionality', async () => {
      fixture.destroy();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Directionality,
            useValue: { value: 'rtl', valueSignal: signal<Direction>('rtl'), change: new Subject<Direction>() },
          },
        ],
      });
      fixture = TestBed.createComponent(Host);
      fixture.componentInstance.orientation.set('horizontal');
      fixture.detectChanges();
      await settle();
      const el = viewport();
      // jsdom keeps a positive `scrollLeft` under RTL, the CDK's "inverted" axis.
      el.scrollTo = ((options: ScrollToOptions): void => {
        if (options.left != null) el.scrollLeft = options.left;
      }) as typeof el.scrollTo;

      const scroller = fixture.debugElement.query(By.directive(WrVirtualScroll)).componentInstance as WrVirtualScroll;
      scroller.scrollToIndex(100);
      el.dispatchEvent(new Event('scroll'));
      await settle();

      expect(rows()).toContain('100:Row 100');
      expect(rows()).not.toContain('0:Row 0');
      const wrapper = root().querySelector<HTMLElement>('.cdk-virtual-scroll-content-wrapper')!;
      expect(wrapper.style.transform).toMatch(/^translateX\(-\d+px\)$/);
    });

    it('re-measures when the orientation changes', async () => {
      await mountAs('vertical');
      const before = rows().length;

      fixture.componentInstance.orientation.set('horizontal');
      fixture.detectChanges();
      await settle();

      expect(rows().length).toBeGreaterThan(before);
    });
  });
});
