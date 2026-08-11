import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { provideWrConfig } from 'ngwr/config';
import { WrTextarea } from 'ngwr/textarea';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTextareaHarness } from './wr-textarea-harness';

@Component({
  imports: [FormsModule, WrTextarea],
  template: `
    <wr-textarea placeholder="Notes" [(value)]="notes" [autosize]="autosize()" (touch)="touched = touched + 1" />
    <wr-textarea ariaLabel="Release notes" size="lg" resize="both" value="shipped v10" [rows]="6" />
    <wr-textarea placeholder="Read-only" value="frozen" [readonly]="true" />
    <wr-textarea placeholder="Locked" [disabled]="true" />
    <wr-textarea ariaLabel="Bio" aria-invalid="true" />
    <wr-textarea ariaLabel="Legacy" [(ngModel)]="legacy" />
    <wr-textarea />
  `,
})
class Host {
  readonly notes = signal('');
  readonly autosize = signal(false);
  legacy = '';
  touched = 0;
}

/** Used exactly as a consumer would: through the loader, with no internals touched. */
describe('WrTextareaHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const notesHarness = (): Promise<WrTextareaHarness> =>
    loader.getHarness(WrTextareaHarness.with({ placeholder: 'Notes' }));

  /** The first field's real `<textarea>` — reached directly only to pin what the harness must not do. */
  const notesNative = (): HTMLTextAreaElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('.wr-textarea__native')!;

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
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('finds every textarea and reads what each one is called', async () => {
    const all = await loader.getAllHarnesses(WrTextareaHarness);

    // The name falls back to the placeholder, so a field labelled either way answers
    // — and a field with neither has NO name, which is `null` rather than `''`: an
    // empty string would read as "named, with nothing in it", and would quietly match
    // a `with({ label: '' })` query.
    expect(await Promise.all(all.map(t => t.getLabel()))).toEqual([
      'Notes',
      'Release notes',
      'Read-only',
      'Locked',
      'Bio',
      'Legacy',
      null,
    ]);
  });

  it('narrows by placeholder, and reports the defaults a bare field carries', async () => {
    const notes = await notesHarness();

    expect(await notes.getSize()).toBe('md');
    expect(await notes.getRows()).toBe(3);
    expect(await notes.getValue()).toBe('');
  });

  it('narrows by the accessible name a field has instead of a placeholder', async () => {
    const release = await loader.getHarness(WrTextareaHarness.with({ label: 'Release notes' }));

    expect(await release.getPlaceholder()).toBe('');
    expect(await release.getSize()).toBe('lg');
    expect(await release.getRows()).toBe(6);
  });

  it('types a value in, and the host model hears it', async () => {
    const notes = await notesHarness();
    await notes.setValue('first draft');

    expect(await notes.getValue()).toBe('first draft');
    expect(fixture.componentInstance.notes()).toBe('first draft');
  });

  it('reads the value the user typed, not the element that would answer with its text', async () => {
    // The trap this harness exists to dodge: a `<textarea>`'s text content is only
    // its INITIAL content, and this one is bound with `[value]`, so the text node
    // stays empty for the field's whole life. A harness reading `text()` would
    // report '' for a field the user has filled — green, and completely wrong.
    const notes = await notesHarness();
    await notes.setValue('typed, not written');

    expect(notesNative().textContent).toBe('');
    expect(await notes.getValue()).toBe('typed, not written');
  });

  it('carries an external write back into the field', async () => {
    const notes = await notesHarness();
    fixture.componentInstance.notes.set('rewritten');

    expect(await notes.getValue()).toBe('rewritten');
  });

  it('narrows by the value already in the field', async () => {
    const notes = await notesHarness();
    await notes.setValue('found me');

    const found = await loader.getAllHarnesses(WrTextareaHarness.with({ value: 'found me' }));
    expect(found.length).toBe(1);
  });

  it('clears a field it filled, and takes an empty write as the same thing', async () => {
    const notes = await notesHarness();

    await notes.setValue('draft');
    await notes.clear();
    expect(await notes.getValue()).toBe('');
    expect(fixture.componentInstance.notes()).toBe('');

    await notes.setValue('draft again');
    expect(fixture.componentInstance.notes()).toBe('draft again');

    // `sendKeys('')` throws "No keys have been specified", so an empty write has to
    // be the clear on its own rather than a typed nothing.
    await notes.setValue('');
    expect(fixture.componentInstance.notes()).toBe('');
  });

  it('refuses to type into a field a user could not type into', async () => {
    const locked = await loader.getHarness(WrTextareaHarness.with({ placeholder: 'Locked' }));
    const readonly = await loader.getHarness(WrTextareaHarness.with({ placeholder: 'Read-only' }));

    await expect(locked.setValue('nope')).rejects.toThrow(/disabled/);
    await expect(readonly.clear()).rejects.toThrow(/read-only/);
    // Nothing moved: the point of refusing is that the value is untouched.
    expect(await readonly.getValue()).toBe('frozen');
  });

  it('reports disabled and read-only, and narrows by disabled', async () => {
    const locked = await loader.getHarness(WrTextareaHarness.with({ placeholder: 'Locked' }));
    const readonly = await loader.getHarness(WrTextareaHarness.with({ placeholder: 'Read-only' }));

    expect(await locked.isDisabled()).toBe(true);
    expect(await readonly.isReadonly()).toBe(true);
    expect(await readonly.isDisabled()).toBe(false);

    const disabled = await loader.getAllHarnesses(WrTextareaHarness.with({ disabled: true }));
    expect(await Promise.all(disabled.map(t => t.getLabel()))).toEqual(['Locked']);
  });

  it('takes the native property as the disabled truth, not the host modifier that paints it', async () => {
    const notes = await notesHarness();

    // The `wr-textarea--disabled` class only paints the state; the property is what
    // a browser gates typing on and what the accessibility tree reports. Set by hand
    // so the two disagree — a harness reading the class would call this field
    // writable and then hand a consumer a green `setValue()` on a dead control.
    notesNative().disabled = true;

    expect(notesNative().closest('wr-textarea')!.classList.contains('wr-textarea--disabled')).toBe(false);
    expect(await notes.isDisabled()).toBe(true);
    await expect(notes.setValue('nope')).rejects.toThrow(/disabled/);
  });

  it('reads the invalid state from the host, and prefers what the native element says', async () => {
    const bio = await loader.getHarness(WrTextareaHarness.with({ label: 'Bio' }));
    const notes = await notesHarness();

    // `<wr-textarea>` forwards nothing here, so marking the wrapper is all a
    // consumer can do today — and it still has to be reported.
    expect(await bio.isInvalid()).toBe(true);
    expect(await notes.isInvalid()).toBe(false);

    // The screen reader reads the native element, so an answer there wins. Set by
    // hand because no input reaches it: this stands in for whatever marks the real
    // control — a wrapper, or the component itself once it forwards the state.
    notesNative().setAttribute('aria-invalid', 'true');
    expect(await notes.isInvalid()).toBe(true);

    // And it wins in the other direction too: a native `false` is an answer, not a
    // gap, so it does NOT fall through to the wrapper still saying `true`.
    const bioNative = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>(
      '.wr-textarea__native[aria-label="Bio"]'
    )!;
    bioNative.setAttribute('aria-invalid', 'false');
    expect(await bio.isInvalid()).toBe(false);
  });

  it('moves focus onto the real control, and marks the field touched on the way out', async () => {
    const notes = await notesHarness();

    await notes.focus();
    expect(await notes.isFocused()).toBe(true);

    await notes.blur();
    expect(await notes.isFocused()).toBe(false);
    // The `touch` output is how a bound field learns it may show its error.
    expect(fixture.componentInstance.touched).toBe(1);
  });

  it('reports the direction the grip will drag, and none when there is no grip', async () => {
    const notes = await notesHarness();
    const release = await loader.getHarness(WrTextareaHarness.with({ label: 'Release notes' }));
    const locked = await loader.getHarness(WrTextareaHarness.with({ placeholder: 'Locked' }));

    expect(await notes.getResizeDirection()).toBe('vertical');
    expect(await release.getResizeDirection()).toBe('both');
    // Disabled is one of the three ways the grip disappears; nothing is draggable.
    expect(await locked.getResizeDirection()).toBe('none');
  });

  it('hands the height to autosize, and reports it handed back', async () => {
    const notes = await notesHarness();
    expect(await notes.isAutosizing()).toBe(false);
    expect(await notes.hasFittedHeight()).toBe(false);

    fixture.componentInstance.autosize.set(true);
    await settle();

    expect(await notes.isAutosizing()).toBe(true);
    expect(await notes.hasFittedHeight()).toBe(true);
    // Autosize owns the height, so there is nothing left for the grip to drag.
    expect(await notes.getResizeDirection()).toBe('none');

    fixture.componentInstance.autosize.set(false);
    await settle();

    // The height has to come back, or the field stays frozen at the last fit and
    // `rows` silently stops meaning anything.
    expect(await notes.isAutosizing()).toBe(false);
    expect(await notes.hasFittedHeight()).toBe(false);
    expect(await notes.getResizeDirection()).toBe('vertical');

    // A `height` is the claim — not any inline style, and not a property that merely
    // CONTAINS the word. A consumer's own `line-height` must still read as "nobody
    // has fitted this field".
    notesNative().style.lineHeight = '20px';
    expect(await notes.hasFittedHeight()).toBe(false);
  });

  it('reaches a classic `[(ngModel)]` consumer with the same one event', async () => {
    // The component hands its value out through the `value` model rather than a
    // DOM `change`, so the single `input` per keystroke is enough for both forms
    // flavours — this is the half that would silently not work if it were not.
    const legacy = await loader.getHarness(WrTextareaHarness.with({ label: 'Legacy' }));
    await legacy.setValue('old school');

    await fixture.whenStable();
    expect(fixture.componentInstance.legacy).toBe('old school');
  });
});

@Component({
  imports: [WrTextarea],
  template: `
    <wr-textarea placeholder="Unbound" />
    <wr-textarea placeholder="Bound" size="lg" />
  `,
})
class ConfigHost {}

/**
 * `getSize()` reads the rendered `wr-textarea--*` class, not the component's input,
 * which is what lets it stay right when the size comes from `provideWrConfig()`
 * rather than from the template — a consumer whose app sets a global `sm` sees `sm`
 * here without restating it on every field.
 */
describe('WrTextareaHarness under provideWrConfig', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ConfigHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const sizeAt = async (placeholder: string): Promise<string> =>
    (await loader.getHarness(WrTextareaHarness.with({ placeholder }))).getSize();

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrConfig({ textarea: { size: 'sm' } })] });
    fixture = TestBed.createComponent(ConfigHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reports the configured size for a field that binds none', async () => {
    expect(await sizeAt('Unbound')).toBe('sm');
  });

  it('reports what the template bound where it bound one', async () => {
    expect(await sizeAt('Bound')).toBe('lg');
  });
});
