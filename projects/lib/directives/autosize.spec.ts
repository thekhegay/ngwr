import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrAutosize } from './autosize';

/**
 * What this spec can and cannot see, stated up front because it shapes every
 * case below.
 *
 * `WrAutosize` computes a height from `scrollHeight`, and jsdom lays nothing out:
 * `scrollHeight` is 0 for every element, always. So a MEASURED height — "three
 * rows of text produce three rows of height" — is not observable here, and the
 * block below does not pretend otherwise: with `scrollHeight` pinned at 0 the
 * clamp still has a defined answer, `minRows * lineHeight + padding + border`, so
 * every case here lands on the floor and says so.
 *
 * That covers the half that breaks most: whether the directive writes a height at
 * all, whether it re-measures on the events it claims to (typing, a programmatic
 * value write, a bounds change), and whether `minRows` / `maxRows` reach the
 * result. The other half — growing to the content, stopping at the ceiling,
 * shrinking again — needs a `scrollHeight` that answers, and is in the second
 * `describe` at the bottom of this file, which models one rather than pinning a
 * number to make an assertion come out.
 */
@Component({
  imports: [WrAutosize],
  template: `
    <textarea
      wrAutosize
      class="sized"
      [minRows]="minRows()"
      [maxRows]="maxRows()"
      [value]="text()"
      style="line-height: 20px; padding: 0; border: 0;"
    ></textarea>

    <textarea wrAutosize class="bare" style="line-height: 20px; padding: 0; border: 0;"></textarea>
  `,
})
class Host {
  readonly minRows = signal(1);
  readonly maxRows = signal(0);
  readonly text = signal('');
}

describe('WrAutosize', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const sized = (): HTMLTextAreaElement => root().querySelector<HTMLTextAreaElement>('.sized')!;
  const bare = (): HTMLTextAreaElement => root().querySelector<HTMLTextAreaElement>('.bare')!;
  const height = (el: HTMLTextAreaElement): number => parseFloat(el.style.height);

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    // `afterEveryRender` is what does the first measurement, and under zoneless CD
    // the scheduler runs in a macrotask — a synchronous `detectChanges()` alone
    // returns before it has run.
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('takes the textarea off manual resizing, which is the point of it', () => {
    // Both are host styles rather than a stylesheet, so they apply wherever the
    // consumer puts the directive — a scrollbar left visible would defeat the
    // growing, and a resize grip would fight it.
    expect(bare().style.overflow).toBe('hidden');
    expect(bare().style.resize).toBe('none');
  });

  it('writes a height on the first render, before anyone has typed', () => {
    // The floor: one row of 20px line-height, no padding, no border. jsdom
    // reports `scrollHeight: 0`, so this IS the clamp doing its job rather than a
    // measurement — which is exactly why it is a stable assertion here.
    expect(height(bare())).toBe(20);
  });

  it('honours minRows as the floor', async () => {
    fixture.componentInstance.minRows.set(4);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(height(sized())).toBe(80);
  });

  it('re-measures when the bounds change, not only when the text does', async () => {
    // The `effect` reads both inputs deliberately so a bounds change alone
    // re-runs the measurement. Without it a `[minRows]` bound to a signal would
    // only take effect on the user's next keystroke.
    fixture.componentInstance.minRows.set(2);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(height(sized())).toBe(40);

    fixture.componentInstance.minRows.set(5);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(height(sized())).toBe(100);
  });

  it('lets maxRows cap the floor', async () => {
    fixture.componentInstance.minRows.set(6);
    fixture.componentInstance.maxRows.set(3);
    fixture.detectChanges();
    await fixture.whenStable();

    // The ceiling wins over the floor — a control that grew past its own maximum
    // would push the page around, so the clamp order is the contract.
    expect(height(sized())).toBe(60);
  });

  it('treats maxRows="0" as no ceiling at all', async () => {
    fixture.componentInstance.minRows.set(3);
    fixture.componentInstance.maxRows.set(0);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(height(sized())).toBe(60);
  });

  it('re-measures on input, which is what typing produces', async () => {
    fixture.componentInstance.minRows.set(2);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = sized();
    el.style.height = '999px';
    el.value = 'typed';
    el.dispatchEvent(new Event('input', { bubbles: true }));

    // The handler runs synchronously off the event — no render needed — so the
    // stale height is gone by the time the user's next keystroke lands.
    expect(height(el)).toBe(40);
  });

  it('re-measures a value written without an input event', async () => {
    // `[(ngModel)]` and a reactive form's `setValue` both write `value` and fire
    // nothing. The per-render value check is what catches those, and it is the
    // reason the directive does not rely on the `input` handler alone.
    const el = sized();
    fixture.componentInstance.minRows.set(2);
    fixture.detectChanges();
    await fixture.whenStable();

    el.style.height = '999px';
    fixture.componentInstance.text.set('written from the model');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(height(el)).toBe(40);
  });

  it('derives the row height from the font size when line-height is `normal`', async () => {
    // `line-height: normal` computes to the literal string, so `parseFloat` gives
    // NaN — the fallback is what stops every autosized textarea in a default-styled
    // app from collapsing to the hard-coded 20px guess.
    // `.sized` rather than `.bare`: `minRows` is bound on that one, and this case
    // is about the row height the fallback derives, not about the default floor.
    const el = sized();
    el.style.lineHeight = 'normal';
    // 32px, not 16px: at 16px the derived row height is 16 * 1.25 = 20, which is
    // also the hard-coded last-ditch guess — so the case would pass identically
    // with the font-size term deleted and prove nothing about it.
    el.style.fontSize = '32px';
    fixture.componentInstance.minRows.set(2);
    fixture.detectChanges();
    await fixture.whenStable();

    // 32px * 1.25 = 40px per row.
    expect(height(el)).toBe(80);
  });

  it('adds padding and border to every row calculation', async () => {
    const el = sized();
    el.style.padding = '5px 0';
    el.style.borderTop = '2px solid';
    el.style.borderBottom = '3px solid';
    fixture.componentInstance.minRows.set(2);
    fixture.detectChanges();
    await fixture.whenStable();

    // 2 rows * 20 + (5 + 5) padding + (2 + 3) border. A box-model that ignored
    // these clips the last line in any control with a border, which is most.
    expect(height(el)).toBe(55);
  });
});

/**
 * The half the block above leaves out. With `scrollHeight` flat at 0, every
 * assertion up there lands on the FLOOR — so growing to the content, stopping at
 * the ceiling, handing the overflow back to the scrollbar, and shrinking again
 * are all invisible, and each one is a mode the directive exists for.
 *
 * Modelling `scrollHeight` is not the same as stubbing an answer in. A browser
 * reports the content height while the box is auto-sized, and at least the box
 * height once one is written — so `scrollHeight` is a function OF the height the
 * directive last wrote, which is exactly what makes the `height = 'auto'` reset
 * observable. `CONTENT` is the model's only input; every number asserted below is
 * the directive's own arithmetic on it.
 */
describe('WrAutosize against a measurable box', () => {
  /** Ten 20px rows. Padding is inside `scrollHeight`; border is not. */
  const CONTENT = 200;

  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const sized = (): HTMLTextAreaElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('.sized')!;
  const height = (el: HTMLTextAreaElement): number => parseFloat(el.style.height);

  /** Ask for a fresh measurement the way a keystroke does. */
  const remeasure = (el: HTMLTextAreaElement): void => {
    el.value = `${el.value}x`;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();

    Object.defineProperty(sized(), 'scrollHeight', {
      configurable: true,
      get(this: HTMLTextAreaElement): number {
        const written = parseFloat(this.style.height);
        return Number.isNaN(written) ? CONTENT : Math.max(CONTENT, written);
      },
    });
  });

  afterEach(() => fixture.destroy());

  it('grows to the measured content, border included', async () => {
    const el = sized();
    el.style.borderTop = '2px solid';
    el.style.borderBottom = '3px solid';
    fixture.detectChanges();
    await fixture.whenStable();

    remeasure(el);

    // `scrollHeight` is the padding box, so the border is the directive's to add
    // — a border-box control that leaves it out is short by its own border on
    // every render, and the last line sits under the edge.
    expect(height(el)).toBe(CONTENT + 5);
  });

  it('shrinks back down instead of keeping the tallest height it ever had', () => {
    const el = sized();
    // Whatever a previous, longer draft left behind.
    el.style.height = '999px';

    remeasure(el);

    // Only reachable by resetting the height before measuring: `scrollHeight`
    // never reports less than the box it is measured in, so a directive that
    // measures the box it inflated last time can grow and never shrink.
    expect(height(el)).toBe(CONTENT);
  });

  it('stops at maxRows and hands the overflow back to the scrollbar', async () => {
    const el = sized();
    fixture.componentInstance.maxRows.set(5);
    fixture.detectChanges();
    await fixture.whenStable();

    remeasure(el);

    expect(height(el)).toBe(100);
    // The host style pins `overflow: hidden`, which is right up to the ceiling
    // and wrong past it: capped without a scrollbar, the text below the fifth
    // row is unreachable.
    expect(el.style.overflowY).toBe('auto');
  });

  it('keeps the scrollbar away while the content still fits', async () => {
    const el = sized();
    fixture.componentInstance.maxRows.set(20);
    fixture.detectChanges();
    await fixture.whenStable();

    remeasure(el);

    expect(height(el)).toBe(CONTENT);
    expect(el.style.overflowY).toBe('hidden');
  });
});
