import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, type EnvironmentProviders, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { provideWrConfig } from 'ngwr/config';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInputOtp } from './input-otp';
import type { WrInputOtpSize } from './interfaces';

@Component({
  imports: [WrInputOtp],
  template: `<wr-input-otp [(value)]="code" [length]="length()" [disabled]="disabled()" />`,
})
class Host {
  readonly code = signal('');
  readonly length = signal(6);
  readonly disabled = signal(false);
}

/**
 * One logical value spread over N boxes, which is where the interesting
 * behaviour lives: typing has to walk forward, Backspace has to walk back, and
 * a pasted code has to fill everything at once rather than landing entirely in
 * the box that happened to have focus.
 */
describe('WrInputOtp', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const boxes = (): HTMLInputElement[] => [...root().querySelectorAll<HTMLInputElement>('input')];
  const code = (): string => fixture.componentInstance.code();

  const typeInto = (index: number, char: string): void => {
    const box = boxes()[index];
    box.focus();
    box.value = char;
    box.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  const press = (index: number, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    boxes()[index].focus();
    boxes()[index].dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders one box per digit, named for a screen reader', () => {
    expect(boxes()).toHaveLength(6);
    expect(boxes().map(b => b.getAttribute('aria-label'))).toEqual([
      'Digit 1',
      'Digit 2',
      'Digit 3',
      'Digit 4',
      'Digit 5',
      'Digit 6',
    ]);
  });

  it('groups the boxes so they announce as one control', () => {
    const host = root().querySelector('wr-input-otp')!;
    expect(host.getAttribute('role')).toBe('group');
    expect(host.getAttribute('aria-label')).toBeTruthy();
  });

  it('follows a custom length', () => {
    fixture.componentInstance.length.set(4);
    fixture.detectChanges();

    expect(boxes()).toHaveLength(4);
  });

  it('collects typed digits into one value and walks focus forward', () => {
    typeInto(0, '1');
    expect(document.activeElement).toBe(boxes()[1]);

    typeInto(1, '2');
    typeInto(2, '3');

    expect(code()).toBe('123');
    expect(document.activeElement).toBe(boxes()[3]);
  });

  it('does not walk past the last box', () => {
    for (let i = 0; i < 6; i++) typeInto(i, String(i + 1));

    expect(code()).toBe('123456');
    expect(document.activeElement).toBe(boxes()[5]);
  });

  it('spreads a pasted code across the boxes', () => {
    const box = boxes()[0];
    box.focus();
    // jsdom implements neither `ClipboardEvent` nor `DataTransfer`, so the
    // event is a plain one with the payload attached by hand. `getData('text')`
    // is what the handler asks for; a browser aliases it to `text/plain`.
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (type: string) => (type === 'text' || type === 'text/plain' ? '482913' : '') },
    });
    box.dispatchEvent(event);
    fixture.detectChanges();

    // Pasting is how most people enter a code they were sent. Landing the whole
    // string in one box makes the control unusable for exactly that path.
    expect(code()).toBe('482913');
    expect(boxes().map(b => b.value)).toEqual(['4', '8', '2', '9', '1', '3']);
  });

  it('walks back on Backspace from an empty box', () => {
    typeInto(0, '1');
    typeInto(1, '2');

    // Focus is on box 2 and it is empty: Backspace steps back and clears the
    // digit behind it, which is what makes correcting a typo one keystroke.
    press(2, 'Backspace');

    expect(document.activeElement).toBe(boxes()[1]);
  });

  it('moves between boxes with the arrows', () => {
    press(0, 'ArrowRight');
    expect(document.activeElement).toBe(boxes()[1]);

    press(1, 'ArrowLeft');
    expect(document.activeElement).toBe(boxes()[0]);
  });

  it('renders an externally written value into the boxes', () => {
    fixture.componentInstance.code.set('9182');
    fixture.detectChanges();

    expect(boxes().map(b => b.value)).toEqual(['9', '1', '8', '2', '', '']);
  });

  it('disables every box at once', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(boxes().every(b => b.disabled)).toBe(true);
  });
});

/**
 * Under `dir="rtl"` the boxes run right-to-left, so the arrow keys have to follow
 * the visual strip rather than the index: pressing toward the visual right must
 * reach the PREVIOUS box. Each case has an LTR twin above it in the main
 * describe, which is what makes the pair meaningful — a spec that only checked
 * RTL could not tell "mirrors" from "always walks left".
 */
describe('WrInputOtp under dir="rtl"', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const boxes = (): HTMLInputElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input'),
  ];

  const press = (index: number, key: string): void => {
    boxes()[index].focus();
    boxes()[index].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: 'rtl', change: new Subject<Direction>() } }],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('walks toward the visual right by going back a box', () => {
    press(2, 'ArrowRight');
    expect(document.activeElement).toBe(boxes()[1]);
  });

  it('walks toward the visual left by going forward a box', () => {
    press(2, 'ArrowLeft');
    expect(document.activeElement).toBe(boxes()[3]);
  });

  it('keeps Home and End on the first and last box, which are semantic', () => {
    press(2, 'Home');
    expect(document.activeElement).toBe(boxes()[0]);

    press(2, 'End');
    expect(document.activeElement).toBe(boxes()[5]);
  });
});

/**
 * One host that binds `[size]` and one binding of `null` inside it, because the
 * only thing that makes an app-wide default safe is that a template can still
 * override it. A shorter `length` is in here too: the strip is sized ONCE, on the
 * host, and every box reads that through the cascade — a per-box resolution would
 * be the thing that silently sizes only some of them.
 */
@Component({
  imports: [WrInputOtp],
  template: `<wr-input-otp [size]="size()" [length]="length()" />`,
})
class ConfigHost {
  readonly size = signal<WrInputOtpSize | null>(null);
  readonly length = signal(6);
}

describe('WrInputOtp defaults from provideWrConfig', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ConfigHost>>;

  const mount = (providers: EnvironmentProviders[] = []): ConfigHost => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers });
    fixture = TestBed.createComponent(ConfigHost);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-input-otp')!;
  const boxes = (): HTMLInputElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input'),
  ];

  afterEach(() => fixture.destroy());

  it('renders exactly as before when no config is provided', () => {
    // The invariant the whole change rests on: an unbound strip is `md`, which
    // means no modifier class at all.
    mount();

    expect(host().className).toBe('wr-input-otp');
  });

  it('takes the configured size when the template binds none', () => {
    mount([provideWrConfig({ inputOtp: { size: 'sm' } })]);

    expect(host().className).toBe('wr-input-otp wr-input-otp--sm');
  });

  it('lets a bound size beat the configured one', () => {
    const instance = mount([provideWrConfig({ inputOtp: { size: 'sm' } })]);
    instance.size.set('lg');
    fixture.detectChanges();

    expect(host().classList.contains('wr-input-otp--lg')).toBe(true);
    expect(host().classList.contains('wr-input-otp--sm')).toBe(false);
  });

  it('lets a bound `md` turn a configured size back to the default', () => {
    // `md` is the value that renders NO modifier, so it is this control's
    // equivalent of the bound `false` that has to escape a configured `true`:
    // treated as an absence it would fall straight back to the config.
    const instance = mount([provideWrConfig({ inputOtp: { size: 'lg' } })]);
    instance.size.set('md');
    fixture.detectChanges();

    expect(host().className).toBe('wr-input-otp');
  });

  it('sizes the whole strip from one resolution, whatever the length', () => {
    const instance = mount([provideWrConfig({ inputOtp: { size: 'lg' } })]);
    instance.length.set(4);
    fixture.detectChanges();

    // The size lives on the host as `--wr-input-otp-size` and friends; a box
    // carries no size class of its own, so all four follow by cascade.
    expect(host().classList.contains('wr-input-otp--lg')).toBe(true);
    expect(boxes()).toHaveLength(4);
    expect(boxes().every(box => box.className === 'wr-input-otp__cell')).toBe(true);
  });

  it('goes back to the config when a binding is cleared', () => {
    const instance = mount([provideWrConfig({ inputOtp: { size: 'sm' } })]);
    instance.size.set('lg');
    fixture.detectChanges();
    expect(host().classList.contains('wr-input-otp--lg')).toBe(true);

    instance.size.set(null);
    fixture.detectChanges();
    expect(host().classList.contains('wr-input-otp--sm')).toBe(true);
  });

  it('ignores a config that names other components', () => {
    // Including `input`, whose key governs `[wrInput]` fields — the boxes are
    // plain inputs of this control's own, not `[wrInput]`s, so they must not
    // follow it.
    mount([provideWrConfig({ input: { size: 'sm' }, inputNumber: { size: 'lg' } })]);

    expect(host().className).toBe('wr-input-otp');
  });
});
