import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCheckbox } from 'ngwr/checkbox';
import { WrOption, WrSelect } from 'ngwr/select';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrAutofocus } from './autofocus';

/**
 * This directive has no rendered surface — its whole output is where DOM focus
 * ends up — so every assertion reads `document.activeElement`.
 *
 * The focus call is DEFERRED to `afterNextRender` on both paths, the first
 * render and a later flip, so each case settles with
 * `await fixture.whenStable()`. Under zoneless CD the scheduler runs change
 * detection in a macrotask; a synchronous `detectChanges()` after an action
 * would update the DOM ahead of the deferred call and could report a pass the
 * browser never gives.
 */
@Component({
  imports: [WrAutofocus],
  template: `
    <input id="target" [wrAutofocus]="on()" />
    <input id="other" />
    <span>{{ label() }}</span>
  `,
})
class Host {
  readonly on = signal(true);
  /** An unrelated binding, so a re-render can be forced without touching `on`. */
  readonly label = signal('a');
}

describe('WrAutofocus', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const el = (id: string): HTMLInputElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`)!;

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
  });

  it('focuses its host once the first render is done', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(el('target'));
  });

  it('does nothing while the expression is falsy', async () => {
    fixture.componentInstance.on.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).not.toBe(el('target'));
  });

  it('focuses when the expression turns truthy later', async () => {
    fixture.componentInstance.on.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    // No `detectChanges()` here on purpose: setting the signal schedules the
    // tick itself, which is the shape a real app produces, and it is the only
    // way the deferred focus call is measured rather than pre-empted.
    fixture.componentInstance.on.set(true);
    await fixture.whenStable();

    expect(document.activeElement).toBe(el('target'));
  });

  it('leaves focus where the user put it when something unrelated re-renders', async () => {
    // The steal to guard against: a field that yanks the caret back out of
    // whatever the user tabbed to on every re-render. Focus has to be tied to
    // the expression TURNING truthy, not to it BEING truthy — `label` moving
    // must not reach the host at all.
    fixture.detectChanges();
    await fixture.whenStable();
    el('other').focus();

    fixture.componentInstance.label.set('b');
    await fixture.whenStable();

    expect(document.activeElement).toBe(el('other'));
  });

  it('takes focus again the next time the expression turns truthy', async () => {
    // The documented contract is "focus whenever the expression becomes
    // truthy", not "focus once" — a dialog that reopens has to land in the
    // field again. It DOES take focus off whatever holds it, which is why the
    // case above pins the only thing that keeps that bearable: nothing but a
    // transition triggers it.
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.on.set(false);
    await fixture.whenStable();
    el('other').focus();

    fixture.componentInstance.on.set(true);
    await fixture.whenStable();

    expect(document.activeElement).toBe(el('target'));
  });

  it('never blurs — turning the expression off leaves focus alone', async () => {
    // One-way by design: it grants focus, it never takes it back. A control
    // that blurred itself when a flag flipped would throw the user out of the
    // field they were typing in.
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.on.set(false);
    await fixture.whenStable();

    expect(document.activeElement).toBe(el('target'));
  });
});

/**
 * The static spellings. `coerceBooleanProperty` is what makes
 * `wrAutofocus="false"` mean OFF — without the transform that string is a
 * truthy value and the attribute reads as an unconditional "focus me".
 */
@Component({
  imports: [WrAutofocus],
  template: `
    <input id="bare" wrAutofocus />
    <input id="off" wrAutofocus="false" />
  `,
})
class StaticHost {}

describe('WrAutofocus as a static attribute', () => {
  it('reads a bare attribute as on and a literal "false" as off', async () => {
    const fixture = TestBed.createComponent(StaticHost);
    const el = (id: string): HTMLElement =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`#${id}`)!;

    fixture.detectChanges();
    await fixture.whenStable();

    // Order carries the second half of this assertion: `#off` renders LAST, so
    // if the coercion were dropped it would focus after `#bare` and win.
    expect(document.activeElement).toBe(el('bare'));
  });
});

@Component({
  imports: [WrAutofocus],
  template: `
    <div id="wrapper" wrAutofocus tabindex="-1">
      <input id="inner" />
    </div>
  `,
})
class WrapperHost {}

describe('WrAutofocus on a non-control host', () => {
  it('focuses the host itself, not a focusable descendant', async () => {
    // The directive is `[wrAutofocus]`, not `input[wrAutofocus]` — it is applied
    // to wrappers too, and there "focus the host" and "focus the first tabbable
    // thing inside" are different features. This pins which one it is.
    const fixture = TestBed.createComponent(WrapperHost);
    const el = (id: string): HTMLElement =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`#${id}`)!;

    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(el('wrapper'));
    expect(document.activeElement).not.toBe(el('inner'));
  });
});

/**
 * `first` looks for a rendered element, and jsdom lays nothing out: every
 * `getClientRects()` is empty. The stub gives each element a box, which leaves
 * the selector and the disabled filter under test.
 */
describe('WrAutofocus with "first"', () => {
  const settle = async <T>(type: new () => T): Promise<HTMLElement> => {
    const fixture = TestBed.createComponent(type);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('focuses the first field inside the host, not the host', async () => {
    @Component({
      imports: [WrAutofocus],
      template: `
        <form id="form" wrAutofocus="first" tabindex="-1">
          <p>Intro</p>
          <input id="name" />
          <input id="email" />
        </form>
      `,
    })
    class FirstHost {}

    const root = await settle(FirstHost);

    expect(document.activeElement).toBe(root.querySelector('#name'));
  });

  it('skips a disabled field and one that is not rendered', async () => {
    @Component({
      imports: [WrAutofocus],
      template: `
        <div wrAutofocus="first">
          <input id="off" disabled />
          <input id="secret" type="hidden" />
          <input id="gone" />
          <input id="name" />
        </div>
      `,
    })
    class SkipHost {}

    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (this: HTMLElement) {
      return (this.id === 'gone' ? [] : [{}]) as unknown as DOMRectList;
    });
    const root = await settle(SkipHost);

    expect(document.activeElement).toBe(root.querySelector('#name'));
  });

  it('reaches the trigger inside a wr-select', async () => {
    @Component({
      imports: [WrAutofocus, WrSelect, WrOption],
      template: `
        <div wrAutofocus="first">
          <wr-select ariaLabel="Size">
            <wr-option value="sm">Small</wr-option>
          </wr-select>
          <input id="after" />
        </div>
      `,
    })
    class SelectHost {}

    const root = await settle(SelectHost);

    expect(document.activeElement).toBe(root.querySelector('wr-select [aria-haspopup="listbox"]'));
  });

  it('reaches the input inside a wr-checkbox, past a disabled one', async () => {
    @Component({
      imports: [WrAutofocus, WrCheckbox],
      template: `
        <div wrAutofocus="first">
          <wr-checkbox [disabled]="true">Locked</wr-checkbox>
          <wr-checkbox>Terms</wr-checkbox>
        </div>
      `,
    })
    class CheckboxHost {}

    const root = await settle(CheckboxHost);

    const inputs = root.querySelectorAll('input');
    expect(inputs[0].disabled).toBe(true);
    expect(document.activeElement).toBe(inputs[1]);
  });

  it('focuses the first field each time the expression turns to it', async () => {
    @Component({
      imports: [WrAutofocus],
      template: `
        <input id="outside" />
        <div [wrAutofocus]="open() && 'first'">
          @if (open()) {
            <input id="name" />
          }
        </div>
      `,
    })
    class ToggleHost {
      readonly open = signal(false);
    }

    const fixture = TestBed.createComponent(ToggleHost);
    const root = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await fixture.whenStable();
    root.querySelector<HTMLElement>('#outside')!.focus();

    // The field is drawn by the same change that asks for the focus.
    fixture.componentInstance.open.set(true);
    await fixture.whenStable();

    expect(document.activeElement).toBe(root.querySelector('#name'));
  });

  it('moves no focus when nothing inside can take it', async () => {
    @Component({
      imports: [WrAutofocus],
      template: `<div id="empty" wrAutofocus="first" tabindex="-1"><p>Text</p></div>`,
    })
    class EmptyHost {}

    await settle(EmptyHost);

    expect(document.activeElement).toBe(document.body);
  });
});
