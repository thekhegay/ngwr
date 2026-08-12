import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { noop } from 'ngwr/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrClickOutside } from './click-outside';

/**
 * A dismiss directive is judged by its FALSE POSITIVES. Closing a popup the user
 * is still working inside is the failure everybody notices, so most of what
 * follows asserts that it stays quiet — on the host, on a descendant, on the
 * event that created it, and after the view is gone.
 *
 * Every case drives a real event at a real node. `contains()` is the whole
 * implementation, and a synthesized `{ target }` would prove nothing about it.
 */
@Component({
  imports: [WrClickOutside],
  template: `
    <div class="popup" (wrClickOutside)="seen.push($event)">
      inside
      <button type="button" class="child">child</button>
    </div>
    <div class="sibling" (wrClickOutside)="siblingSeen.push($event)">a second dismissable</div>
  `,
})
class Host {
  readonly seen: MouseEvent[] = [];
  readonly siblingSeen: MouseEvent[] = [];
}

describe('WrClickOutside', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let outsider: HTMLButtonElement;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const popup = (): HTMLElement => root().querySelector<HTMLElement>('.popup')!;
  const child = (): HTMLElement => root().querySelector<HTMLElement>('.child')!;
  const seen = (): MouseEvent[] => fixture.componentInstance.seen;

  const dispatch = (type: string, target: EventTarget): MouseEvent => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    // "Outside" has to be a node that genuinely is outside — a sibling of the
    // fixture root, attached to the same document the directive listens on.
    outsider = document.createElement('button');
    document.body.appendChild(outsider);
  });

  afterEach(() => {
    outsider.remove();
    vi.restoreAllMocks();
  });

  it('stays quiet for a press on the host itself', () => {
    dispatch('mousedown', popup());
    expect(seen()).toHaveLength(0);
  });

  it('stays quiet for a press on a descendant', () => {
    // `contains` covers the whole subtree, and that is the point: an identity
    // check (`target !== host`) reads as "outside" for every button, input and
    // text node inside the popup, so the popup would close on its own contents.
    dispatch('mousedown', child());
    expect(seen()).toHaveLength(0);
  });

  it('emits once for a press outside, handing over the event it saw', () => {
    const event = dispatch('mousedown', outsider);

    expect(seen()).toHaveLength(1);
    // The same object, not a copy: consumers read `target` / `composedPath()`
    // off it to decide whether the press deserves a dismissal at all.
    expect(seen()[0]).toBe(event);
    expect(seen()[0].target).toBe(outsider);
  });

  it('answers to a press, not to a click', () => {
    // A drag-selection that STARTS inside the popup and releases outside fires
    // its `click` at the common ancestor of the two — outside the popup. Bound
    // to `click`, the directive would dismiss the popup the moment the user
    // finishes selecting text in it, which is why `mousedown` is the trigger.
    dispatch('click', outsider);
    dispatch('mouseup', outsider);
    expect(seen()).toHaveLength(0);

    dispatch('mousedown', outsider);
    expect(seen()).toHaveLength(1);
  });

  it('hears the press even when the page stops it, and does not swallow it', () => {
    let reachedTheOutsider = false;
    outsider.addEventListener('mousedown', event => {
      reachedTheOutsider = true;
      event.stopPropagation();
    });

    const event = dispatch('mousedown', outsider);

    // The listener is registered in the CAPTURE phase deliberately: a menu that
    // only closes when the widget underneath cooperates is not a dismissal.
    expect(seen()).toHaveLength(1);
    // And it is a passive observer in both directions — the press still reaches
    // its target and is still actionable, so the button under the popup works
    // on the first press rather than needing a second one.
    expect(reachedTheOutsider).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });

  it('scopes "outside" to its own host', () => {
    // Two dismissables on one page — a popover inside a drawer is the everyday
    // version. Each instance answers about ITS host: the press landed in the
    // first, so only the second one is entitled to dismiss.
    dispatch('mousedown', popup());

    expect(seen()).toHaveLength(0);
    expect(fixture.componentInstance.siblingSeen).toHaveLength(1);
  });

  it('goes silent once the view is destroyed', () => {
    // The host element outlives the view as a detached node, and a detached node
    // contains nothing — so a listener left on the document would call every
    // press on the page "outside", forever, for every popup ever opened.
    //
    // Silence alone does not prove the listener is gone: Angular tears the
    // subscription down with the view, so a leaked handler emits into nobody and
    // the arrays stay empty either way. What it cannot do quietly is emit on a
    // destroyed `OutputRef` — Angular logs that — so the console is the evidence.
    const warn = vi.spyOn(console, 'warn').mockImplementation(noop);
    const error = vi.spyOn(console, 'error').mockImplementation(noop);
    fixture.destroy();

    expect(() => dispatch('mousedown', outsider)).not.toThrow();

    expect(seen()).toHaveLength(0);
    expect(fixture.componentInstance.siblingSeen).toHaveLength(0);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

/**
 * The event that opens the popup. `mousedown` reaches the document in the
 * capture phase BEFORE it reaches the trigger, so a directive registered while
 * the trigger's own handler runs has already missed it — but only because the
 * listener is a capture-phase one. Registered on the bubble phase it would meet
 * that same event on the way back up and dismiss the popup it just opened.
 */
@Component({
  imports: [WrClickOutside],
  template: `
    <button type="button" class="trigger">Open</button>
    @if (open()) {
      <div class="popup" (wrClickOutside)="open.set(false)">…</div>
    }
  `,
})
class ToggleHost {
  readonly open = signal(false);
}

describe('WrClickOutside opened mid-press', () => {
  it('does not dismiss on the very press that created it', () => {
    TestBed.resetTestingModule();
    const fixture = TestBed.createComponent(ToggleHost);
    fixture.detectChanges();

    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.trigger')!;
    // Rendering synchronously inside the handler is staged: Angular normally
    // renders after the dispatch, under zone.js and zoneless alike. It is staged
    // because it is the one arrangement in which the directive can see its own
    // opening event — an overlay opened imperatively and flushed on the spot.
    trigger.addEventListener('mousedown', () => {
      fixture.componentInstance.open.set(true);
      fixture.detectChanges();
    });

    trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('.popup')).not.toBeNull();

    fixture.destroy();
  });
});
