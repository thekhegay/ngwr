import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

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
