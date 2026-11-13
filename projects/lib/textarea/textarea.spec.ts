import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, readonly } from '@angular/forms/signals';

import { Subject } from 'rxjs';

import { WrFormField } from 'ngwr/form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTextarea, type WrTextareaResize, type WrTextareaSize } from './textarea';

@Component({
  imports: [WrTextarea],
  template: `
    <wr-textarea
      [(value)]="notes"
      [placeholder]="placeholder()"
      [ariaLabel]="ariaLabel()"
      [size]="size()"
      [rows]="rows()"
      [resizable]="resizable()"
      [resize]="resize()"
      [readonly]="readonly()"
      [autosize]="autosize()"
      [maxRows]="maxRows()"
      [disabled]="disabled()"
      (touch)="touched = touched + 1"
    />
  `,
})
class Host {
  readonly notes = signal('');
  readonly placeholder = signal('');
  readonly ariaLabel = signal<string | null>(null);
  readonly size = signal<WrTextareaSize>('md');
  readonly rows = signal(3);
  readonly resizable = signal(true);
  readonly resize = signal<WrTextareaResize>('vertical');
  readonly readonly = signal(false);
  readonly autosize = signal(false);
  readonly maxRows = signal<number | null>(null);
  readonly disabled = signal(false);
  touched = 0;
}

/** jsdom lays nothing out, so the box autosize measures is described by hand. */
const layOut = (el: HTMLElement, box: { width: number; scroll: number }): void => {
  Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => box.width });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => box.scroll });
};

/**
 * The native `<textarea>` lives INSIDE the component, which is the whole reason
 * this contract needs pinning: a `<label for>` outside cannot reach it and an
 * `aria-label` on `<wr-textarea>` does not either, so the accessible name has to
 * be forwarded — and the fallback chain that does it treats an empty placeholder
 * as no name rather than as an empty one.
 *
 * Autosize is only half-testable here: jsdom lays nothing out, so the box is
 * described by hand (`layOut`) and the FITTED height is arithmetic on it. What
 * it can prove is who owns the inline `height`, and when a fit runs.
 */
describe('WrTextarea', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-textarea')!;
  const native = (): HTMLTextAreaElement => root().querySelector<HTMLTextAreaElement>('.wr-textarea__native')!;
  const grip = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-textarea__resize');

  const type = (text: string): void => {
    native().value = text;
    native().dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  /** Autosize defers its fit to `requestAnimationFrame`, so the frame has to pass. */
  const settle = async (): Promise<void> => {
    await fixture.whenStable();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders a native textarea the consumer can reach', () => {
    expect(native()).not.toBeNull();
    expect(host().classList.contains('wr-textarea')).toBe(true);
    expect(native().rows).toBe(3);
  });

  it('stays unnamed rather than claiming an empty name', () => {
    // `resolvedAriaLabel` deliberately does not use `??`: an empty placeholder is
    // no name at all, so the attribute has to be absent — an `aria-label=""`
    // would silence the field instead of leaving the app's own label to work.
    expect(native().hasAttribute('aria-label')).toBe(false);
  });

  it('borrows the placeholder as a name, and yields to an explicit one', () => {
    fixture.componentInstance.placeholder.set('Notes');
    fixture.detectChanges();
    expect(native().getAttribute('aria-label')).toBe('Notes');
    expect(native().placeholder).toBe('Notes');

    fixture.componentInstance.ariaLabel.set('Release notes');
    fixture.detectChanges();
    expect(native().getAttribute('aria-label')).toBe('Release notes');
  });

  it('carries typing into the model and an external write back into the field', () => {
    type('first draft');
    expect(fixture.componentInstance.notes()).toBe('first draft');

    fixture.componentInstance.notes.set('rewritten');
    fixture.detectChanges();
    expect(native().value).toBe('rewritten');
  });

  it('marks the field touched on blur, and drops the focus ring', () => {
    native().dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(host().classList.contains('wr-textarea--focused')).toBe(true);

    native().dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
    expect(fixture.componentInstance.touched).toBe(1);
    expect(host().classList.contains('wr-textarea--focused')).toBe(false);
  });

  it('keeps the default size out of the class list', () => {
    // `md` is the default, so it earns no modifier — a consumer styling
    // `.wr-textarea--md` would be styling nothing.
    expect(host().className).toBe('wr-textarea');

    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();
    expect(host().classList.contains('wr-textarea--lg')).toBe(true);
  });

  it('forwards read-only and disabled to the native element', () => {
    fixture.componentInstance.readonly.set(true);
    fixture.detectChanges();
    expect(native().readOnly).toBe(true);
    // And SAYS so. The attribute reached the element and nothing else changed,
    // so a read-only textarea looked exactly like an editable one — a box that
    // silently refuses what is typed into it. The library's contract for a
    // value control is a `wr-<x>--readonly` class with a non-editable cue.
    expect(host().classList.contains('wr-textarea--readonly')).toBe(true);

    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    expect(native().disabled).toBe(true);
    expect(host().classList.contains('wr-textarea--disabled')).toBe(true);
  });

  it('offers a resize grip, hidden from assistive tech', () => {
    expect(grip()).not.toBeNull();
    expect(grip()!.getAttribute('aria-hidden')).toBe('true');
    expect(grip()!.classList.contains('wr-textarea__resize--vertical')).toBe(true);
  });

  it('takes the grip away when there is nothing to drag', () => {
    fixture.componentInstance.resizable.set(false);
    fixture.detectChanges();
    expect(grip()).toBeNull();

    fixture.componentInstance.resizable.set(true);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    expect(grip()).toBeNull();
  });

  it('switches the grip to the direction it will actually drag', () => {
    fixture.componentInstance.resize.set('both');
    fixture.detectChanges();
    expect(grip()!.classList.contains('wr-textarea__resize--both')).toBe(true);
    // Horizontal drag needs a shrinkable, explicit-width box.
    expect(host().classList.contains('wr-textarea--resize-x')).toBe(true);

    fixture.componentInstance.resizable.set(false);
    fixture.detectChanges();
    expect(host().classList.contains('wr-textarea--resize-x')).toBe(false);
  });

  it('hands height over to autosize, grip and all', async () => {
    layOut(native(), { width: 200, scroll: 60 });
    fixture.componentInstance.autosize.set(true);
    await settle();

    expect(grip()).toBeNull();
    expect(host().classList.contains('wr-textarea--no-resize')).toBe(true);
    expect(native().style.height).toBe('60px');
    expect(native().style.overflowY).toBe('hidden');
  });

  it('gives height back when autosize is switched off', async () => {
    // Otherwise the field is frozen at whatever autosize last computed and `rows`
    // silently stops meaning anything — the input looks like it did nothing.
    layOut(native(), { width: 200, scroll: 60 });
    fixture.componentInstance.autosize.set(true);
    await settle();
    expect(native().style.height).not.toBe('');

    fixture.componentInstance.autosize.set(false);
    await settle();
    expect(native().style.height).toBe('');
    expect(native().style.overflowY).toBe('');
    expect(grip()).not.toBeNull();
  });

  it('counts the padding into the maxRows cap', async () => {
    // jsdom lays nothing out, so the box is described by hand: 20px lines, 8px of
    // padding a side, border-box, and content worth eight lines. The cap used to be
    // `lineHeight * maxRows` against a `scrollHeight` that includes the padding, so
    // six rows stopped at 120px — 5.2 rows on screen.
    const el = native();
    Object.assign(el.style, { lineHeight: '20px', paddingTop: '8px', paddingBottom: '8px', boxSizing: 'border-box' });
    layOut(el, { width: 200, scroll: 8 * 20 + 16 });
    fixture.componentInstance.autosize.set(true);
    fixture.componentInstance.maxRows.set(6);
    await settle();

    expect(el.style.height).toBe('136px');
    expect(el.style.overflowY).toBe('auto');
  });

  it('does not fit a height for a frame that outlived its reason', async () => {
    // Autosize defers the fit by a frame, so toggling it off in between used to
    // leave the pending frame to write a height after the release had run.
    fixture.componentInstance.autosize.set(true);
    await fixture.whenStable();
    fixture.componentInstance.autosize.set(false);
    await settle();

    expect(native().style.height).toBe('');
  });

  it('coerces a rows value that arrived as junk', () => {
    // `rows` is `coerceNumberProperty(v, 3)`, so a NaN falls back rather than
    // rendering `rows="NaN"`, which browsers treat as 2.
    fixture.componentInstance.rows.set(Number.NaN);
    fixture.detectChanges();
    expect(native().rows).toBe(3);
  });
});

/**
 * When a fit runs, which is everything autosize gets wrong without an observer:
 * the height depends on where the lines break, and a line breaks on the WIDTH.
 * `requestAnimationFrame` and `ResizeObserver` are stubbed so a frame and a
 * resize happen when the spec says.
 */
describe('WrTextarea autosize keeps up with its box', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let observers: StubResizeObserver[];
  let box: { width: number; scroll: number };

  class StubResizeObserver {
    readonly targets: Element[] = [];
    connected = false;

    constructor(private readonly callback: ResizeObserverCallback) {
      observers.push(this);
    }

    observe(target: Element): void {
      this.connected = true;
      this.targets.push(target);
    }

    disconnect(): void {
      this.connected = false;
    }

    resize(width: number): void {
      this.callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
  }

  const native = (): HTMLTextAreaElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('.wr-textarea__native')!;

  const runFrame = (): void => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(0);
  };

  /** The stable pass, then the frame the fit was deferred to. */
  const settle = async (): Promise<void> => {
    await fixture.whenStable();
    runFrame();
  };

  const mount = async (autosize: boolean): Promise<void> => {
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.autosize.set(autosize);
    fixture.detectChanges();
    const el = native();
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => box.width });
    Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => box.scroll });
    await settle();
  };

  beforeEach(() => {
    frames = new Map();
    nextFrame = 0;
    observers = [];
    box = { width: 200, scroll: 60 };

    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number): void => void frames.delete(id));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    fixture?.destroy();
    vi.unstubAllGlobals();
  });

  it('refits when its width changes, since that is what moves a line break', async () => {
    await mount(true);
    expect(native().style.height).toBe('60px');
    expect(observers).toHaveLength(1);
    expect(observers[0].targets).toEqual([native()]);

    // Narrower: the same text now takes five lines instead of three.
    box = { width: 120, scroll: 100 };
    observers[0].resize(120);
    runFrame();

    expect(native().style.height).toBe('100px');
  });

  it('does not answer a resize that left the width alone', async () => {
    await mount(true);
    observers[0].resize(200);
    runFrame();

    // The height the fit writes is itself a resize; answering it would loop.
    observers[0].resize(200);

    expect(frames.size).toBe(0);
  });

  it('writes nothing while it is not rendered, and fits once it is shown', async () => {
    // Under a `display: none` ancestor every box metric reads 0. Fitting to that
    // collapsed the field to its borders until somebody typed into it.
    box = { width: 0, scroll: 0 };
    await mount(true);
    fixture.componentInstance.notes.set('set while the tab was hidden');
    await settle();

    expect(native().style.height).toBe('');
    expect(native().style.overflowY).toBe('');

    box = { width: 200, scroll: 80 };
    observers[0].resize(200);
    runFrame();

    expect(native().style.height).toBe('80px');
  });

  it('refits when maxRows changes', async () => {
    box = { width: 200, scroll: 200 };
    await mount(true);
    Object.assign(native().style, { lineHeight: '20px', boxSizing: 'border-box' });
    expect(native().style.height).toBe('200px');

    fixture.componentInstance.maxRows.set(4);
    await settle();

    expect(native().style.height).toBe('80px');
    expect(native().style.overflowY).toBe('auto');
  });

  it('refits when rows changes, which is the floor it measures from', async () => {
    await mount(true);

    box = { width: 200, scroll: 120 };
    fixture.componentInstance.rows.set(6);
    await settle();

    expect(native().style.height).toBe('120px');
  });

  it('cancels the pending frame and stops observing when it is destroyed', async () => {
    await mount(true);
    fixture.componentInstance.notes.set('one more line');
    await fixture.whenStable();
    expect(frames.size).toBe(1);

    fixture.destroy();

    expect(frames.size).toBe(0);
    expect(observers[0].connected).toBe(false);
  });

  it('stops observing when autosize is switched off', async () => {
    await mount(true);

    fixture.componentInstance.autosize.set(false);
    await settle();

    expect(observers[0].connected).toBe(false);
    expect(native().style.height).toBe('');
  });

  it('observes nothing while autosize is off', async () => {
    await mount(false);

    expect(observers).toHaveLength(0);
    expect(frames.size).toBe(0);
  });
});

/**
 * The horizontal half of the resize drag, under both reading directions.
 *
 * `Directionality` resolves the document's direction when it is constructed, so
 * the honest way to test the other one is to provide a fake — writing
 * `document.dir` mid-file would leak into whatever runs after it.
 *
 * **What the spec has to stub, and why it cannot be avoided.** jsdom lays nothing
 * out, so `offsetWidth` is 0 on the host and `clientWidth` is 0 on its parent —
 * which makes the width ceiling 0 and every drag resolve to `min(0, …)`. Both are
 * declared here, so the numbers below are the component's arithmetic and nothing
 * else. What is NOT stubbed is the sign, which is the whole point: the same
 * pointer delta has to widen the field in one direction and narrow it in the
 * other, because the grip sits at the field's inline end and a block box grows
 * toward its inline end — physically right in LTR, physically left in RTL.
 */
describe('WrTextarea resizing under a reading direction', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-textarea')!;
  const grip = (): HTMLElement => root().querySelector<HTMLElement>('.wr-textarea__resize')!;

  /** A pointer event jsdom does not implement, with the fields the component reads. */
  const pointer = (type: string, clientX: number): Event => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: 1, button: 0, isPrimary: true, clientX, clientY: 0 });
    return event;
  };

  const mount = (dir: Direction): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Directionality,
          useValue: { value: dir, valueSignal: signal(dir), change: new Subject<Direction>() },
        },
      ],
    });
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.resize.set('horizontal');
    fixture.detectChanges();

    // A 200px field in a 1000px column — see the docblock.
    Object.defineProperty(host(), 'offsetWidth', { value: 200, configurable: true });
    Object.defineProperty(host().parentElement!, 'clientWidth', { value: 1000, configurable: true });
    grip().setPointerCapture = (): void => undefined;
    grip().releasePointerCapture = (): void => undefined;
  };

  /** Grab the grip at x=100 and drag it 40px to the physical right. */
  const dragRight = (): void => {
    grip().dispatchEvent(pointer('pointerdown', 100));
    grip().dispatchEvent(pointer('pointermove', 140));
    fixture.detectChanges();
  };

  afterEach(() => fixture.destroy());

  it('widens the field when the grip is dragged to the physical right in LTR', () => {
    mount('ltr');
    dragRight();

    expect(host().style.width).toBe('240px');
  });

  it('narrows it on the same drag in RTL, where the grip is on the other corner', () => {
    // The contradicting half of the pair: under `dir="rtl"` the grip sits at the
    // bottom-LEFT, so dragging the pointer to the right is dragging it INTO the
    // field. Reading the raw `clientX` delta in both directions meant the grip
    // sat on the corner the box does not extend toward and outward dragging
    // shrank it.
    mount('rtl');
    dragRight();

    expect(host().style.width).toBe('160px');
  });
});

@Component({
  imports: [WrFormField, WrTextarea],
  template: `
    <wr-form-field label="Description" [hint]="hint()">
      <wr-textarea [placeholder]="placeholder()" [ariaLabel]="ariaLabel()" />
    </wr-form-field>
  `,
})
class FieldHost {
  readonly ariaLabel = signal<string | null>(null);
  readonly hint = signal('');
  readonly placeholder = signal('');
}

/**
 * `<wr-form-field>` renders its `<label for>` before it can see what was
 * projected into it, so the id has to travel the other way and be adopted by the
 * control. The textarea never did: `for` named an element that was nowhere in
 * the document, clicking the label did nothing, and the field was — to a screen
 * reader — an unlabelled block. `[wrInput]` and `wr-select` already adopted it,
 * which is what made this look like a per-component omission rather than a rule.
 *
 * Every case resolves the id through the DOCUMENT rather than reading the
 * attribute: an id that merely exists on some element is exactly what the bug
 * looked like.
 */
describe('WrTextarea inside a form field', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<FieldHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const native = (): HTMLTextAreaElement => root().querySelector<HTMLTextAreaElement>('.wr-textarea__native')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(FieldHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('answers to the id the label points at', () => {
    const label = root().querySelector<HTMLLabelElement>('label')!;
    expect(label.htmlFor).not.toBe('');

    // Labelable, so `for` actually names it — `<wr-textarea>` itself is not.
    expect(root().querySelector(`#${CSS.escape(label.htmlFor)}`)).toBe(native());
  });

  it('stamps no id at all on a textarea standing on its own', () => {
    // The field is what supplies the id; a bare textarea inventing one would put
    // a document-global name on an element nothing points at.
    const bare = TestBed.createComponent(Host);
    bare.detectChanges();
    const el = (bare.nativeElement as HTMLElement).querySelector('.wr-textarea__native')!;

    expect(el.getAttribute('id')).toBeNull();
    bare.destroy();
  });

  it('is described by the field’s hint, without claiming to be invalid', () => {
    fixture.componentInstance.hint.set('Max 200 characters');
    fixture.detectChanges();

    const describedBy = native().getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    // Resolved through the document: an id on nothing is what a dangling
    // `aria-describedby` looks like, and it announces the same as no hint.
    expect(
      root()
        .querySelector(`#${CSS.escape(describedBy!)}`)!
        .textContent?.trim()
    ).toBe('Max 200 characters');
    // A hint is help, not a failure. Keying `aria-invalid` on "something is
    // describing me" would announce every hinted field as in error.
    expect(native().hasAttribute('aria-invalid')).toBe(false);
  });

  it('says nothing when the field has neither hint nor error', () => {
    expect(native().hasAttribute('aria-describedby')).toBe(false);
    expect(native().hasAttribute('aria-invalid')).toBe(false);
  });

  it('lets the field’s label name it, over its own placeholder', () => {
    // This used to go the other way, and the reasoning recorded here was the
    // defect: "the field cannot promise a name to fall back on". It can —
    // `WrFormFieldContext.labelId` is exactly that promise, `null` when the
    // field renders no label, and five controls already read it. So a textarea
    // under `<wr-form-field label="Notes">` announced "Describe the product"
    // and the visible label reached nobody. Nothing catches that: the control
    // HAS a name, so axe is satisfied, and the name is plausible, so a reader
    // is too — it fails WCAG 2.5.3, where the visible label has to be IN the
    // accessible name.
    fixture.componentInstance.placeholder.set('Describe the product');
    fixture.detectChanges();

    expect(native().hasAttribute('aria-label')).toBe(false);

    const by = native().getAttribute('aria-labelledby');
    expect(by).not.toBeNull();
    expect(
      root()
        .querySelector(`#${CSS.escape(by!)}`)
        ?.textContent?.trim()
    ).toBe(root().querySelector('label')?.textContent?.trim());
  });

  it('still lets an explicit ariaLabel win, which is the escape hatch', () => {
    fixture.componentInstance.placeholder.set('Describe the product');
    fixture.componentInstance.ariaLabel.set('Product description');
    fixture.detectChanges();

    expect(native().getAttribute('aria-label')).toBe('Product description');
    expect(native().hasAttribute('aria-labelledby')).toBe(false);
  });
});

/**
 * `focusBoundControl()` is how a form puts the user on a field — the first
 * invalid one after a failed submit, typically. Signal Forms asks the bound
 * component for `focus()` and otherwise focuses the HOST, which here is a
 * wrapper with no tab stop: the call did nothing and the caret went nowhere.
 */
@Component({
  imports: [FormField, WrTextarea],
  template: `<wr-textarea placeholder="Notes" [formField]="note.text" />`,
})
class FocusHost {
  readonly frozen = signal(false);
  readonly model = signal({ text: '' });
  readonly note = form(this.model, path => {
    readonly(path.text, () => this.frozen());
  });
}

describe('WrTextarea under focusBoundControl()', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<FocusHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(FocusHost);
    // Attached, or `focus()` moves nothing: an element outside the document
    // cannot be the active one, and every assertion here would read `<body>`.
    document.body.appendChild(root());
    await fixture.whenStable();
  });

  afterEach(() => {
    root().remove();
    fixture.destroy();
  });

  it('focuses the native textarea', () => {
    fixture.componentInstance.note.text().focusBoundControl();

    expect(document.activeElement).toBe(root().querySelector('.wr-textarea__native'));
  });

  it('still focuses the native textarea while read-only', async () => {
    fixture.componentInstance.frozen.set(true);
    await fixture.whenStable();

    fixture.componentInstance.note.text().focusBoundControl();

    expect(document.activeElement).toBe(root().querySelector('.wr-textarea__native[readonly]'));
  });
});
