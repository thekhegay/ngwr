import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrInputOtp, type WrInputOtpMode, type WrInputOtpSize } from 'ngwr/input-otp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInputOtpHarness } from './wr-input-otp-harness';

@Component({
  imports: [WrInputOtp],
  template: `
    <wr-input-otp
      [(value)]="code"
      [length]="length()"
      [mode]="mode()"
      [size]="size()"
      [mask]="mask()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      (completed)="completed.set($event)"
      (touch)="touched.set(touched() + 1)"
    />
  `,
})
class Host {
  readonly code = signal('');
  readonly length = signal(6);
  readonly mode = signal<WrInputOtpMode>('numeric');
  readonly size = signal<WrInputOtpSize>('md');
  readonly mask = signal(false);
  readonly placeholder = signal('•');
  readonly disabled = signal(false);
  readonly completed = signal<string | null>(null);
  readonly touched = signal(0);
}

@Component({
  imports: [WrInputOtp],
  template: `
    <wr-input-otp length="4" [(value)]="short" />
    <wr-input-otp length="6" [(value)]="full" />
    <wr-input-otp length="6" disabled />
  `,
})
class ManyHost {
  readonly short = signal('12');
  readonly full = signal('123456');
}

describe('WrInputOtpHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const host = (): Host => fixture.componentInstance;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reads the shape of an untouched control', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    expect(await otp.getLength()).toBe(6);
    expect(await otp.getBoxValues()).toEqual(['', '', '', '', '', '']);
    expect(await otp.getValue()).toBe('');
    expect(await otp.isComplete()).toBe(false);
    expect(await otp.isDisabled()).toBe(false);
    expect(await otp.isMasked()).toBe(false);
    expect(await otp.getSize()).toBe('md');
    expect(await otp.getPlaceholder()).toBe('•');
    // The boxes are separate inputs; the group name is what ties them into one
    // control for a screen reader.
    expect(await otp.getLabel()).toBe('Verification code');
    expect(await otp.getInputMode()).toBe('numeric');
    expect(await otp.getFocusedIndex()).toBeNull();
  });

  it('types a code one box at a time, following the focus the control moves', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    await otp.setValue('12');
    expect(await otp.getBoxValues()).toEqual(['1', '2', '', '', '', '']);
    // Two characters in, the caret is waiting in the third box — the advance is
    // the control's, not the harness's.
    expect(await otp.getFocusedIndex()).toBe(2);
    expect(host().code()).toBe('12');

    await otp.setValue('482913');
    expect(await otp.getValue()).toBe('482913');
    expect(host().code()).toBe('482913');
    expect(await otp.isComplete()).toBe(true);
    // Nothing to advance to: the last box keeps the caret.
    expect(await otp.getFocusedIndex()).toBe(5);
  });

  it('emits the completed code only once the last box is filled', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    await otp.setValue('12345');
    expect(await otp.isComplete()).toBe(false);
    expect(host().completed()).toBeNull();

    await otp.type('6');
    expect(await otp.isComplete()).toBe(true);
    expect(host().completed()).toBe('123456');
  });

  it('empties the boxes before typing, so a shorter code leaves no tail behind', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    await otp.setValue('123456');

    await otp.setValue('99');

    expect(await otp.getBoxValues()).toEqual(['9', '9', '', '', '', '']);
    expect(host().code()).toBe('99');
  });

  it('refuses a code longer than the boxes, and leaves the old one alone', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    await otp.setValue('123456');

    await expect(otp.setValue('1234567')).rejects.toThrow(/7 characters for 6 boxes/);
    expect(host().code()).toBe('123456');
  });

  it('continues from the focused box when typing without clearing', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    await otp.setValue('12');

    await otp.type('34');

    expect(await otp.getValue()).toBe('1234');
    expect(host().code()).toBe('1234');
  });

  it('reports what the control accepted, not what it was asked to type', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    // `numeric` drops the letter: it lands in no box and focus does not advance,
    // so the digit after it overwrites the same box. A harness that counted
    // characters instead of following focus would report '12a4' as '1244'.
    await otp.setValue('12a4');

    expect(await otp.getBoxValues()).toEqual(['1', '2', '4', '', '', '']);
    expect(host().code()).toBe('124');
    expect(await otp.getFocusedIndex()).toBe(3);
  });

  it('spreads a paste from the first box, whichever box it landed on', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    await otp.focus(3);

    await otp.paste('48-29-13');

    // The separators are filtered out, and the fill starts at box 0 even though
    // box 3 had the caret — pasting a code that was sent by SMS is the main way
    // this control is used.
    expect(await otp.getBoxValues()).toEqual(['4', '8', '2', '9', '1', '3']);
    expect(host().code()).toBe('482913');
    expect(host().completed()).toBe('482913');
    expect(await otp.getFocusedIndex()).toBe(5);
  });

  it('trims a paste to the number of boxes', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    await otp.paste('1234567890');

    expect(await otp.getValue()).toBe('123456');
    expect(host().code()).toBe('123456');
  });

  it('ignores a paste with nothing the mode accepts', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    await otp.setValue('12');

    await otp.paste('----');

    expect(await otp.getValue()).toBe('12');
    expect(host().code()).toBe('12');
  });

  it('steps back on Backspace from an empty box, clearing the one behind', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    await otp.setValue('123');

    await otp.backspace();

    expect(await otp.getBoxValues()).toEqual(['1', '2', '', '', '', '']);
    expect(host().code()).toBe('12');
    expect(await otp.getFocusedIndex()).toBe(2);
  });

  it('leaves a hole when a middle box is emptied, and the code closes up over it', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    await otp.setValue('123456');

    await otp.focus(2);
    await otp.backspace();

    // The trap this control sets: the boxes show `1 2 _ 4 5 6`, but the value is
    // the boxes JOINED, so the host is handed a five-character '12456' that looks
    // like a plausible code. `isComplete()` is the only thing that says otherwise.
    expect(await otp.getBoxValues()).toEqual(['1', '2', '', '4', '5', '6']);
    expect(await otp.getValue()).toBe('12456');
    expect(host().code()).toBe('12456');
    expect(await otp.isComplete()).toBe(false);
    expect(await otp.getFocusedIndex()).toBe(2);
  });

  it('walks the boxes with the arrows, Home and End', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    await otp.focus(2);

    await otp.moveFocus('next');
    expect(await otp.getFocusedIndex()).toBe(3);

    await otp.moveFocus('previous');
    expect(await otp.getFocusedIndex()).toBe(2);

    await otp.moveFocus('first');
    expect(await otp.getFocusedIndex()).toBe(0);

    await otp.moveFocus('last');
    expect(await otp.getFocusedIndex()).toBe(5);
  });

  it('refuses a keyboard action when no box has focus', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    await expect(otp.moveFocus('next')).rejects.toThrow(/no box has focus/);
    await expect(otp.backspace()).rejects.toThrow(/no box has focus/);
    await expect(otp.blur()).rejects.toThrow(/no box has focus/);
  });

  it('clears every box and hands the caret back to the first', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    await otp.setValue('123456');

    await otp.clear();

    expect(await otp.getBoxValues()).toEqual(['', '', '', '', '', '']);
    expect(host().code()).toBe('');
    expect(await otp.getFocusedIndex()).toBe(0);
  });

  it('skips the boxes that are already empty, so clearing touches nothing', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    await otp.clear();

    // Clearing an empty box would drag focus into it and blur the one before —
    // six spurious `touch` emissions on a control the user never entered.
    expect(host().touched()).toBe(0);
    expect(await otp.getFocusedIndex()).toBe(0);
    expect(host().code()).toBe('');
  });

  it('emits touch when focus leaves the control', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    await otp.focus(0);
    expect(host().touched()).toBe(0);

    await otp.blur();

    expect(host().touched()).toBe(1);
    expect(await otp.getFocusedIndex()).toBeNull();
  });

  it('blurs the box that has focus, not the first one', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    await otp.focus(3);
    await otp.blur();

    // Blurring box 0 instead would still emit `touch` — the CDK dispatches a fake
    // blur event on an element that never had focus — while leaving the caret in
    // box 3, so the control would look both touched and still focused.
    expect(await otp.getFocusedIndex()).toBeNull();
    expect(host().touched()).toBe(1);
  });

  it('masks the boxes like a password field, and still takes a code', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    expect(await otp.isMasked()).toBe(false);

    host().mask.set(true);
    fixture.detectChanges();

    expect(await otp.isMasked()).toBe(true);
    expect(await Promise.all((await otp.getBoxes()).map(box => box.isMasked()))).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
    ]);

    await otp.setValue('123456');
    expect(host().code()).toBe('123456');
  });

  it('reads the size from the host modifier', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    host().size.set('lg');
    fixture.detectChanges();
    expect(await otp.getSize()).toBe('lg');

    host().size.set('sm');
    fixture.detectChanges();
    expect(await otp.getSize()).toBe('sm');
  });

  it('reads the placeholder shown in an empty box', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    host().placeholder.set('_');
    fixture.detectChanges();

    expect(await otp.getPlaceholder()).toBe('_');
  });

  it('cannot tell alphanumeric from text, and says so by taking letters', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    host().mode.set('alphanumeric');
    fixture.detectChanges();

    // Both modes publish `inputmode="text"`; only what a box accepts separates
    // them, which is why the harness reports the keyboard rather than the mode.
    expect(await otp.getInputMode()).toBe('text');

    await otp.setValue('a1B2c3');
    expect(host().code()).toBe('a1B2c3');
  });

  it('follows a change of length, keeping the digits already entered', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    host().code.set('9182');
    fixture.detectChanges();

    expect(await otp.getBoxValues()).toEqual(['9', '1', '8', '2', '', '']);
    expect(await otp.isComplete()).toBe(false);

    host().length.set(4);
    fixture.detectChanges();

    expect(await otp.getLength()).toBe(4);
    expect(await otp.getBoxValues()).toEqual(['9', '1', '8', '2']);
    expect(await otp.isComplete()).toBe(true);
  });

  it('reads the boxes, which an external write can leave behind the model', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    // The control splits an incoming value into boxes, dropping what the mode
    // rejects and anything past `length`, and never writes the shortened code
    // back — so the harness (the DOM) and the model disagree, and the model is
    // the one holding characters no box shows.
    host().code.set('12a456');
    fixture.detectChanges();

    expect(await otp.getBoxValues()).toEqual(['1', '2', '', '4', '5', '6']);
    expect(await otp.getValue()).toBe('12456');
    expect(await otp.isComplete()).toBe(false);
    expect(host().code()).toBe('12a456');

    host().code.set('1234567890');
    fixture.detectChanges();

    expect(await otp.getValue()).toBe('123456');
    expect(host().code()).toBe('1234567890');
  });

  it('refuses to reach for a box that is not there', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    await expect(otp.getBox(9)).rejects.toThrow(/out of range — this control renders 6 boxes/);
  });

  it('refuses to drive a disabled control, rather than faking events for it', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    host().disabled.set(true);
    fixture.detectChanges();

    expect(await otp.isDisabled()).toBe(true);

    // A disabled input fires nothing and takes no focus in a browser. Dispatching
    // the events anyway would have the control accept a code no user could enter.
    await expect(otp.setValue('123456')).rejects.toThrow(/disabled/);
    await expect(otp.type('1')).rejects.toThrow(/disabled/);
    await expect(otp.paste('123456')).rejects.toThrow(/disabled/);
    await expect(otp.focus()).rejects.toThrow(/disabled/);
    await expect(otp.backspace()).rejects.toThrow(/disabled/);
    await expect(otp.clear()).rejects.toThrow(/disabled/);
    await expect(otp.moveFocus('next')).rejects.toThrow(/disabled/);

    const [box] = await otp.getBoxes();
    expect(await box.isDisabled()).toBe(true);
    await expect(box.type('1')).rejects.toThrow(/disabled/);
    await expect(box.focus()).rejects.toThrow(/disabled/);

    expect(host().code()).toBe('');
  });
});

describe('WrInputOtpBoxHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('names every box for a screen reader', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    const boxes = await otp.getBoxes();

    expect(await Promise.all(boxes.map(box => box.getLabel()))).toEqual([
      'Digit 1',
      'Digit 2',
      'Digit 3',
      'Digit 4',
      'Digit 5',
      'Digit 6',
    ]);
  });

  it('reads one box: its character, its emptiness and whether it has the caret', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    await otp.setValue('12');

    const first = await otp.getBox(0);
    const third = await otp.getBox(2);

    expect(await first.getValue()).toBe('1');
    expect(await first.isEmpty()).toBe(false);
    expect(await first.isFocused()).toBe(false);
    expect(await first.isDisabled()).toBe(false);
    expect(await first.isMasked()).toBe(false);

    expect(await third.isEmpty()).toBe(true);
    expect(await third.isFocused()).toBe(true);
  });

  it('takes focus and one character, and the host hears it', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    const fifth = await otp.getBox(4);

    await fifth.focus();
    expect(await otp.getFocusedIndex()).toBe(4);

    await fifth.type('7');

    expect(await otp.getBoxValues()).toEqual(['', '', '', '', '7', '']);
    expect(fixture.componentInstance.code()).toBe('7');
    // The character was accepted, so the control moved on by itself.
    expect(await otp.getFocusedIndex()).toBe(5);
  });

  it('refuses more than the one character a box holds', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);

    await expect((await otp.getBox(0)).type('12')).rejects.toThrow(/exactly one character/);
  });

  it('narrows the boxes by value, emptiness and name', async () => {
    const otp = await loader.getHarness(WrInputOtpHarness);
    await otp.setValue('12');

    expect(await otp.getBoxes({ empty: true })).toHaveLength(4);
    expect(await Promise.all((await otp.getBoxes({ empty: false })).map(box => box.getValue()))).toEqual(['1', '2']);
    expect(await Promise.all((await otp.getBoxes({ value: '2' })).map(box => box.getLabel()))).toEqual(['Digit 2']);
    expect(await Promise.all((await otp.getBoxes({ label: 'Digit 3' })).map(box => box.isEmpty()))).toEqual([true]);
    expect(await otp.getBoxes({ label: /Digit [12]/ })).toHaveLength(2);
  });
});

describe('WrInputOtpHarness — three on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ManyHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ManyHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('narrows by how many boxes a control has', async () => {
    const short = await loader.getHarness(WrInputOtpHarness.with({ length: 4 }));

    expect(await short.getValue()).toBe('12');
  });

  it('narrows by the code entered, exactly or by pattern', async () => {
    const full = await loader.getHarness(WrInputOtpHarness.with({ value: '123456' }));
    expect(await full.getLength()).toBe(6);

    // Both the half-entered and the full code start '12'.
    expect(await loader.getAllHarnesses(WrInputOtpHarness.with({ value: /^12/ }))).toHaveLength(2);
  });

  it('narrows by disabled', async () => {
    const disabled = await loader.getAllHarnesses(WrInputOtpHarness.with({ disabled: true }));
    expect(disabled).toHaveLength(1);
    expect(await disabled[0].getValue()).toBe('');

    expect(await loader.getAllHarnesses(WrInputOtpHarness.with({ disabled: false }))).toHaveLength(2);
  });

  it('narrows by whether every box is filled', async () => {
    const complete = await loader.getAllHarnesses(WrInputOtpHarness.with({ complete: true }));
    expect(await Promise.all(complete.map(otp => otp.getValue()))).toEqual(['123456']);

    expect(await loader.getAllHarnesses(WrInputOtpHarness.with({ complete: false }))).toHaveLength(2);
  });
});
