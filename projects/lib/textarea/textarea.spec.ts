import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { provideWrConfig } from 'ngwr/config';
import { WrFormField } from 'ngwr/form';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
  readonly disabled = signal(false);
  touched = 0;
}

/**
 * The native `<textarea>` lives INSIDE the component, which is the whole reason
 * this contract needs pinning: a `<label for>` outside cannot reach it and an
 * `aria-label` on `<wr-textarea>` does not either, so the accessible name has to
 * be forwarded — and the fallback chain that does it treats an empty placeholder
 * as no name rather than as an empty one.
 *
 * Autosize is only half-testable here: jsdom lays nothing out, so `scrollHeight`
 * is always 0 and the FITTED height means nothing. What it can prove is who owns
 * the inline `height` — which turns out to be the interesting half.
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
    fixture.componentInstance.autosize.set(true);
    await settle();

    expect(grip()).toBeNull();
    expect(host().classList.contains('wr-textarea--no-resize')).toBe(true);
    // The fitted number is meaningless under jsdom; that it OWNS the inline
    // height is the part that matters.
    expect(native().style.height).not.toBe('');
    expect(native().style.overflowY).toBe('hidden');
  });

  it('gives height back when autosize is switched off', async () => {
    // Otherwise the field is frozen at whatever autosize last computed and `rows`
    // silently stops meaning anything — the input looks like it did nothing.
    fixture.componentInstance.autosize.set(true);
    await settle();
    expect(native().style.height).not.toBe('');

    fixture.componentInstance.autosize.set(false);
    await settle();
    expect(native().style.height).toBe('');
    expect(native().style.overflowY).toBe('');
    expect(grip()).not.toBeNull();
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

  /**
   * ⚠️ The CSS half of the same fix, guarded as a RULE.
   *
   * The grip's corner and the sign above are one decision: put the grip on the
   * physical side the box does NOT grow toward and outward dragging shrinks the
   * field. `check:rtl` cannot catch a regression here — it fires on a physical
   * property with no reason, and `right: 0.25rem` with an `rtl-ok:` marker is
   * exactly what this used to be. Measured in Chromium: the grip sits at 0.970
   * of the field's width in LTR and 0.030 in RTL, and the diagonal cursor goes
   * from `nwse-resize` to `nesw-resize`.
   */
  describe('the grip, as the stylesheet declares it', () => {
    const sheet = readFileSync(join(process.cwd(), 'projects/lib/textarea/styles/_index.scss'), 'utf8');
    const rule = sheet.slice(sheet.indexOf('  &__resize {'), sheet.indexOf('    .wr-icon__svg'));

    it('sits at the inline end, the corner the box actually extends toward', () => {
      expect(rule).toMatch(/inset-inline-end:\s*0\.25rem/);
      expect(rule).not.toMatch(/^\s*right:/m);
    });

    it('turns the diagonal cursor over with it', () => {
      expect(rule).toMatch(/\[dir='rtl'\] & \{[^}]*cursor:\s*nesw-resize/);
    });
  });
});

/**
 * Two fields on purpose: one that binds no size, so an app-wide default has room to
 * apply, and one that binds — because what makes a global config safe is that a
 * template can still override it.
 */
@Component({
  imports: [WrTextarea],
  template: `
    <wr-textarea placeholder="Unbound" />
    <wr-textarea placeholder="Bound" [size]="size()" />
  `,
})
class ConfigHost {
  readonly size = signal<WrTextareaSize | null>(null);
}

describe('WrTextarea defaults from provideWrConfig', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ConfigHost>>;

  const mount = (providers: unknown[] = []): ConfigHost => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(ConfigHost);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  const at = (placeholder: string): HTMLElement => {
    const native = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>(
      `textarea[placeholder="${placeholder}"]`
    )!;
    // The modifier classes live on the component host, not on the native element.
    return native.closest('wr-textarea')!;
  };

  afterEach(() => fixture.destroy());

  it('renders exactly as before when no config is provided', () => {
    // The invariant the whole change rests on: `md` earns no modifier, so an
    // unbound field's class list is bare.
    mount();

    expect(at('Unbound').className).toBe('wr-textarea');
  });

  it('takes its size from the config when the template says nothing', () => {
    mount([provideWrConfig({ textarea: { size: 'sm' } })]);

    expect(at('Unbound').classList.contains('wr-textarea--sm')).toBe(true);
  });

  it('lets a bound size beat the config', () => {
    const host = mount([provideWrConfig({ textarea: { size: 'sm' } })]);
    host.size.set('lg');
    fixture.detectChanges();

    expect(at('Bound').classList.contains('wr-textarea--lg')).toBe(true);
    expect(at('Bound').classList.contains('wr-textarea--sm')).toBe(false);
    // The field beside it bound nothing, so it still takes the configured default.
    expect(at('Unbound').classList.contains('wr-textarea--sm')).toBe(true);
  });

  it('goes back to the config when the binding is cleared', () => {
    const host = mount([provideWrConfig({ textarea: { size: 'sm' } })]);
    host.size.set('lg');
    fixture.detectChanges();

    host.size.set(null);
    fixture.detectChanges();
    expect(at('Bound').classList.contains('wr-textarea--sm')).toBe(true);
  });

  it('ignores a config that names other components', () => {
    mount([provideWrConfig({ input: { size: 'sm' } })]);

    expect(at('Unbound').className).toBe('wr-textarea');
  });
});

@Component({
  imports: [WrFormField, WrTextarea],
  template: `
    <wr-form-field label="Description" [hint]="hint()">
      <wr-textarea [placeholder]="placeholder()" />
    </wr-form-field>
  `,
})
class FieldHost {
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

  it('keeps the placeholder as its name — an aria-label outranks a <label>', () => {
    // Deliberate, and the same call `wr-select` and `wr-slider` make: the field
    // renders a label only when its `label` input is set, so it cannot promise a
    // name to fall back on. Set `[ariaLabel]` where the two should read alike.
    fixture.componentInstance.placeholder.set('Describe the product');
    fixture.detectChanges();

    expect(native().getAttribute('aria-label')).toBe('Describe the product');
  });
});
