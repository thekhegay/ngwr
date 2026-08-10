import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSplitter } from './splitter';

@Component({
  imports: [WrSplitter],
  template: `
    <wr-splitter
      [(position)]="split"
      [orientation]="orientation()"
      [minPosition]="min()"
      [maxPosition]="max()"
      [disabled]="disabled()"
    >
      <div wrSplitterStart>left</div>
      <div wrSplitterEnd>right</div>
    </wr-splitter>
  `,
})
class Host {
  readonly split = signal(50);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly min = signal(0);
  readonly max = signal(100);
  readonly disabled = signal(false);
}

/**
 * A focusable `role="separator"` is an interactive widget, so it owes the same
 * things `wr-slider` owes: a name, a range, a position that moves, and arrows that
 * move it. The panes are sized by `flex-basis` percentages, which is the one piece
 * of layout jsdom CAN report — the inline style itself — so the split is asserted
 * through that rather than through geometry.
 */
describe('WrSplitter', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const divider = (): HTMLElement => root().querySelector<HTMLElement>('[role="separator"]')!;
  const startPane = (): HTMLElement => root().querySelector<HTMLElement>('.wr-splitter__pane--start')!;
  const endPane = (): HTMLElement => root().querySelector<HTMLElement>('.wr-splitter__pane--end')!;
  const position = (): number => fixture.componentInstance.split();

  const press = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    divider().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  /**
   * jsdom has neither `PointerEvent` nor pointer capture, so the drag is driven with
   * a `MouseEvent` carrying the two properties the handler reads. `isPrimary` has to
   * be defined explicitly: it does not exist on `MouseEvent`, and reading it as
   * `undefined` makes the primary-pointer guard reject every synthetic event —
   * which silently turned the button test green for the wrong reason.
   */
  const pointerDown = ({ button = 0, isPrimary = true }: { button?: number; isPrimary?: boolean } = {}): void => {
    const el = divider();
    el.setPointerCapture = () => undefined;
    el.releasePointerCapture = () => undefined;
    const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button });
    Object.defineProperty(event, 'isPrimary', { value: isPrimary });
    el.dispatchEvent(event);
    fixture.detectChanges();
  };

  const pointerMove = (clientX: number): void => {
    divider().dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('presents the divider as a separator with a range and a position', () => {
    expect(divider().getAttribute('aria-valuemin')).toBe('0');
    expect(divider().getAttribute('aria-valuemax')).toBe('100');
    expect(divider().getAttribute('aria-valuenow')).toBe('50');
    expect(divider().getAttribute('tabindex')).toBe('0');
    // A horizontal split is divided by a VERTICAL separator.
    expect(divider().getAttribute('aria-orientation')).toBe('vertical');
  });

  it('names the divider, because a focusable separator needs a name', () => {
    // Without this a screen reader reaches it and says only "separator, 50". Every
    // other named control here routes a `*Label` input through the i18n catalog.
    expect(divider().getAttribute('aria-label')).toBeTruthy();
  });

  it('sizes both panes from the position', () => {
    expect(startPane().style.flexBasis).toBe('50%');
    expect(endPane().style.flexBasis).toBe('50%');

    fixture.componentInstance.split.set(30);
    fixture.detectChanges();
    expect(startPane().style.flexBasis).toBe('30%');
    expect(endPane().style.flexBasis).toBe('70%');
  });

  it('resizes with the arrows for the orientation it is in', () => {
    press('ArrowRight');
    expect(position()).toBe(51);
    press('ArrowLeft');
    expect(position()).toBe(50);

    // The vertical arrows belong to the other orientation and must be left alone.
    expect(press('ArrowDown').defaultPrevented).toBe(false);
    expect(position()).toBe(50);

    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();
    press('ArrowDown');
    expect(position()).toBe(51);
    expect(divider().getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('takes a bigger step with shift', () => {
    press('ArrowRight', { shiftKey: true });
    expect(position()).toBe(60);
  });

  it('jumps to the bounds with Home and End', () => {
    fixture.componentInstance.min.set(20);
    fixture.componentInstance.max.set(80);
    fixture.detectChanges();

    press('End');
    expect(position()).toBe(80);
    press('Home');
    expect(position()).toBe(20);
  });

  it('stops at the bounds instead of running past them', () => {
    fixture.componentInstance.min.set(20);
    fixture.componentInstance.max.set(80);
    fixture.detectChanges();

    press('Home');
    press('ArrowLeft');
    expect(position()).toBe(20);
    press('End');
    press('ArrowRight');
    expect(position()).toBe(80);
  });

  it('pulls an out-of-range write back into the range', async () => {
    // `position` is a `model`, so `[(position)]` and a restored layout both write
    // straight into it. Unclamped it produced `aria-valuenow="150"` against a
    // `valuemax` of 100 — an invalid ARIA state — and a pane sized `150%`.
    fixture.componentInstance.split.set(150);
    await fixture.whenStable();

    expect(position()).toBe(100);
    expect(divider().getAttribute('aria-valuenow')).toBe('100');
    expect(startPane().style.flexBasis).toBe('100%');

    fixture.componentInstance.split.set(-20);
    await fixture.whenStable();
    expect(position()).toBe(0);
  });

  it('goes inert and announces it when disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(root().querySelector('.wr-splitter--disabled')).not.toBeNull();
    expect(divider().getAttribute('aria-disabled')).toBe('true');
    expect(divider().getAttribute('tabindex')).toBe('-1');

    press('ArrowRight');
    expect(position()).toBe(50);
  });

  it('takes focus when the pointer grabs the divider', () => {
    // `pointerdown` is prevented so the drag does not select text, and that also
    // suppresses the click's default focus — so after a mouse drag the arrows did
    // nothing until the user went and found the divider with Tab. `wr-slider`
    // focuses its thumb for the same reason.
    pointerDown();
    expect(document.activeElement).toBe(divider());
  });

  it('ignores a press that is not the primary button or the primary pointer', () => {
    // `dragging` was set for ANY pointerdown, so holding the right button over the
    // divider and moving resized the panes; a second finger could take over a drag
    // the same way.
    pointerDown({ button: 2 });
    pointerMove(10);
    expect(position()).toBe(50);
    expect(document.activeElement).not.toBe(divider());

    pointerDown({ isPrimary: false });
    pointerMove(10);
    expect(position()).toBe(50);
  });

  it('carries the orientation into the class list', () => {
    expect(root().querySelector('.wr-splitter--horizontal')).not.toBeNull();

    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();
    expect(root().querySelector('.wr-splitter--vertical')).not.toBeNull();
    expect(root().querySelector('.wr-splitter--horizontal')).toBeNull();
  });
});
