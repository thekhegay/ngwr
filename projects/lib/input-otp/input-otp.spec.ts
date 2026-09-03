import { type Direction, Directionality } from '@angular/cdk/bidi';
import { Component, type EnvironmentProviders, type Type, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { provideWrConfig } from 'ngwr/config';
import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrInputOtp } from './input-otp';
import type { WrInputOtpMode, WrInputOtpSize } from './interfaces';

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

@Component({
  imports: [WrInputOtp],
  template: `<wr-input-otp [mode]="mode()" length="3" />`,
})
class ModeHost {
  readonly mode = signal<WrInputOtpMode>('numeric');
}

@Component({
  imports: [WrInputOtp],
  template: `<wr-input-otp ariaLabel="Код подтверждения" length="3" />`,
})
class LabelledHost {}

/**
 * A box holds no text of its own, so its `aria-label` IS its name — and the
 * literal it used to carry was wrong as well as untranslated: `sanitiseChar`
 * lets any letter through in `alphanumeric` and `text`, so a box holding `A`
 * announced "Digit 3". `check:a11y` cannot see either half; a name is present,
 * which is all the structural rules ask.
 */
describe('WrInputOtp names', () => {
  afterEach(() => TestBed.resetTestingModule());

  const mount = (component: Type<unknown>): ComponentFixture<unknown> => {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    return fixture;
  };

  const groupName = (fixture: ComponentFixture<unknown>): string | null =>
    (fixture.nativeElement as HTMLElement).querySelector('wr-input-otp')!.getAttribute('aria-label');

  const cellNames = (fixture: ComponentFixture<unknown>): (string | null)[] =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('input')].map(b => b.getAttribute('aria-label'));

  it('calls a box a digit only where a digit is all it accepts', () => {
    TestBed.configureTestingModule({});
    const numeric = mount(ModeHost);
    expect(cellNames(numeric)).toEqual(['Digit 1', 'Digit 2', 'Digit 3']);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const letters = TestBed.createComponent(ModeHost);
    letters.componentInstance.mode.set('alphanumeric');
    letters.detectChanges();

    expect(cellNames(letters)).toEqual(['Character 1', 'Character 2', 'Character 3']);

    letters.componentInstance.mode.set('text');
    letters.detectChanges();
    expect(cellNames(letters)).toEqual(['Character 1', 'Character 2', 'Character 3']);
  });

  it('comes from the catalog, not from the template', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(ModeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cyrillic = /\p{Script=Cyrillic}/u;
    const group = groupName(fixture) ?? '';
    expect(cyrillic.test(group), `"${group}" is still English`).toBe(true);
    for (const name of cellNames(fixture)) {
      expect(cyrillic.test(name ?? ''), `"${name ?? ''}" is still English`).toBe(true);
      // The index still has to land in the translated template.
      expect(/\d/.test(name ?? '')).toBe(true);
    }
  });

  it('falls back to English when nothing is registered', () => {
    TestBed.configureTestingModule({});

    expect(groupName(mount(ModeHost))).toBe('Verification code');
  });

  it('lets a binding win over both', () => {
    TestBed.configureTestingModule({});

    expect(groupName(mount(LabelledHost))).toBe('Код подтверждения');
  });
});

@Component({
  imports: [WrInputOtp],
  template: `<wr-input-otp [(value)]="code" [length]="4" mode="text" />`,
})
class ImeHost {
  readonly code = signal('');
}

/**
 * jsdom runs no input method. Every event below is hand-built with the flags a
 * real one sets — `isComposing` on the `input` and `keydown` events an open
 * candidate window owns, and a `compositionend` to end it — and the assertion is
 * that the strip did nothing until the character was real.
 *
 * A faithful test of the guard and no more: it does not run kotoeri or Pinyin,
 * and it must not be read as saying the strip has been driven by a real IME.
 *
 * `mode="text"` throughout, so the character a conversion produces survives
 * `sanitiseChar` and the test can see where it landed. Whether a full-width digit
 * should survive `mode="numeric"` is a separate question this file does not ask.
 */
describe('WrInputOtp under an IME', () => {
  let fixture: ComponentFixture<ImeHost>;

  const boxes = (): HTMLInputElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input'),
  ];

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ImeHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('leaves the half-built reading in the box it is being composed in', () => {
    // The defect: the sanitiser ran on the intermediate text and wrote the result
    // straight back into the field, which aborts the conversion outright.
    const box = boxes()[0];
    box.focus();
    box.value = 'ｋ';
    box.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
    fixture.detectChanges();

    expect(box.value, 'the field the IME is composing in was rewritten').toBe('ｋ');
    expect(fixture.componentInstance.code()).toBe('');
    expect(document.activeElement, 'focus advanced mid-conversion').toBe(box);
  });

  it('takes the character the conversion finally produced', () => {
    const box = boxes()[0];
    box.focus();
    box.value = 'ｋ';
    box.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
    box.value = 'か';
    box.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'か' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.code()).toBe('か');
    expect(document.activeElement, 'the strip should walk on once a character lands').toBe(boxes()[1]);
  });

  it('does not walk out of the composing box on an arrow or a Backspace', () => {
    // Both keys belong to the candidate window while a conversion is open, and
    // moving focus out of the box discards the composition.
    const box = boxes()[1];
    for (const key of ['ArrowLeft', 'ArrowRight', 'Backspace']) {
      box.focus();
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, isComposing: true });
      box.dispatchEvent(event);
      fixture.detectChanges();
      expect(event.defaultPrevented, `${key} was taken from the IME`).toBe(false);
      expect(document.activeElement, `${key} moved focus off the composing box`).toBe(box);
    }
  });

  it("recognises Safari's committing keystroke, which carries only keyCode 229", () => {
    const box = boxes()[1];
    box.focus();
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true, keyCode: 229 });
    box.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(box);
  });
});
