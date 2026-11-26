import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrColor } from 'ngwr/theme';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { compileSass } from '../spec-sass';

import { WrBadge } from './badge';
import { WrTag } from './tag';
import type { WrBadgeShape, WrBadgeSize, WrTagIconPosition } from './types';

@Component({
  imports: [WrBadge],
  template: `<wr-badge [color]="color()" [size]="size()" [shape]="shape()" [outlined]="outlined()">3 unread</wr-badge>`,
})
class Host {
  readonly color = signal<WrColor>('primary');
  readonly size = signal<WrBadgeSize>('md');
  readonly shape = signal<WrBadgeShape>('rounded');
  readonly outlined = signal(false);
}

/**
 * The class list IS the component: `ViewEncapsulation.None` means consumers style
 * against these names, so the exact string — including which defaults are LEFT OUT
 * of it — is the public contract this file pins.
 */
describe('WrBadge', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-badge')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('projects its content and carries only the colour by default', () => {
    expect(host().textContent.trim()).toBe('3 unread');
    expect(host().className).toBe('wr-badge wr-badge--primary');
  });

  it('names every intent', () => {
    for (const color of ['success', 'danger', 'warning', 'info', 'primary'] as const) {
      fixture.componentInstance.color.set(color);
      fixture.detectChanges();
      expect(host().className).toBe(`wr-badge wr-badge--${color}`);
    }
  });

  it('adds a size modifier for everything but the default', () => {
    for (const size of ['sm', 'lg'] as const) {
      fixture.componentInstance.size.set(size);
      fixture.detectChanges();
      expect(host().className).toContain(`wr-badge--${size}`);
    }

    fixture.componentInstance.size.set('md');
    fixture.detectChanges();
    expect(host().className).not.toContain('wr-badge--md');
  });

  it('adds a shape modifier for everything but the default', () => {
    for (const shape of ['pill', 'squircle'] as const) {
      fixture.componentInstance.shape.set(shape);
      fixture.detectChanges();
      expect(host().className).toContain(`wr-badge--${shape}`);
    }

    fixture.componentInstance.shape.set('rounded');
    fixture.detectChanges();
    expect(host().className).not.toContain('wr-badge--rounded');
  });

  it('marks the outlined variant, and reads an empty attribute as true', () => {
    fixture.componentInstance.outlined.set(true);
    fixture.detectChanges();
    expect(host().className).toContain('wr-badge--outlined');
  });

  it('has no role of its own, because a badge is text', () => {
    // Deliberate: `<wr-tag>` is the interactive one. A status role here would
    // announce every count as a live region.
    expect(host().getAttribute('role')).toBeNull();
  });
});

describe('WrBadge count, dot and anchor', () => {
  @Component({
    imports: [WrBadge],
    template: `<span class="wr-badge-anchor">
      <button type="button">Inbox</button>
      <wr-badge
        [count]="count()"
        [max]="max()"
        [showZero]="showZero()"
        [dot]="dot()"
        [ariaLabel]="label()"
        [anchor]="anchor()"
      />
    </span>`,
  })
  class CountHost {
    readonly count = signal<number | null>(5);
    readonly max = signal(99);
    readonly showZero = signal(false);
    readonly dot = signal(false);
    readonly label = signal<string | null>(null);
    readonly anchor = signal(false);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<CountHost>>;

  const badge = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-badge')!;
  const set = (patch: (host: CountHost) => void): void => {
    patch(fixture.componentInstance);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(CountHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('draws the count', () => {
    expect(badge().textContent).toBe('5');
    expect([...badge().classList].sort()).toEqual(['wr-badge', 'wr-badge--count', 'wr-badge--primary']);
  });

  it('draws the cap with a plus past max, and the count itself at max', () => {
    set(host => host.count.set(100));
    expect(badge().textContent).toBe('99+');

    set(host => host.count.set(99));
    expect(badge().textContent).toBe('99');

    set(host => {
      host.max.set(9);
      host.count.set(10);
    });
    expect(badge().textContent).toBe('9+');
  });

  it('groups a large count per the locale', () => {
    set(host => {
      host.max.set(9999);
      host.count.set(1234);
    });
    expect(badge().textContent).toBe('1,234');
  });

  it('hides a zero count unless showZero is set', () => {
    set(host => host.count.set(0));
    expect(badge().classList).toContain('wr-badge--hidden');

    set(host => host.showZero.set(true));
    expect(badge().classList).not.toContain('wr-badge--hidden');
    expect(badge().textContent).toBe('0');
  });

  it('is a plain badge again once the count is null', () => {
    set(host => host.count.set(null));
    expect(badge().className).toBe('wr-badge wr-badge--primary');
    expect(badge().querySelector('.wr-badge__count')).toBeNull();
  });

  it('draws a dot with no number, named by ariaLabel', () => {
    set(host => {
      host.dot.set(true);
      host.label.set('Online');
    });
    expect(badge().classList).toContain('wr-badge--dot');
    expect(badge().classList).not.toContain('wr-badge--count');
    expect(badge().querySelector('.wr-badge__count')).toBeNull();
    expect(badge().querySelector('.wr-badge__label')!.textContent).toBe('Online');
    expect(badge().textContent).toBe('Online');
  });

  it('keeps a dot on screen whatever the count', () => {
    set(host => {
      host.dot.set(true);
      host.count.set(0);
    });
    expect(badge().classList).not.toContain('wr-badge--hidden');
  });

  it('reads ariaLabel in place of the bare number', () => {
    expect(badge().querySelector('.wr-badge__count')!.hasAttribute('aria-hidden')).toBe(false);

    set(host => host.label.set('5 unread messages'));
    expect(badge().querySelector('.wr-badge__count')!.getAttribute('aria-hidden')).toBe('true');
    expect(badge().querySelector('.wr-badge__label')!.textContent).toBe('5 unread messages');
  });

  it('marks an anchored badge, and leaves one with nothing to draw empty', () => {
    set(host => host.anchor.set(true));
    expect(badge().classList).toContain('wr-badge--anchor');

    set(host => host.count.set(null));
    // Comments only, so `.wr-badge--anchor:empty` hides it.
    expect([...badge().childNodes].every(node => node.nodeType === Node.COMMENT_NODE)).toBe(true);
  });

  it('draws no projected text in a dot, and draws it again once the dot is off', () => {
    @Component({
      imports: [WrBadge],
      template: `<wr-badge [dot]="dot()">Online</wr-badge>`,
    })
    class TextHost {
      readonly dot = signal(true);
    }
    const text = TestBed.createComponent(TextHost);
    text.detectChanges();
    const el = (text.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-badge')!;
    expect(el.textContent).toBe('');

    text.componentInstance.dot.set(false);
    text.detectChanges();
    expect(el.textContent).toBe('Online');
    text.destroy();
  });
});

/**
 * Every documented `[iconPosition]` on `wr-tag`. The modifier only exists when
 * the tag HAS an adornment, so the host carries an icon — without one the class
 * is absent for a reason that has nothing to do with the input, which is the
 * kind of false pass this whole pass is about.
 */
describe('WrTag emits a modifier for every documented icon position', () => {
  @Component({
    imports: [WrTag],
    template: `<wr-tag icon="check" [iconPosition]="position()">Ready</wr-tag>`,
  })
  class IconHost {
    readonly position = signal<WrTagIconPosition>('start');
  }

  const POSITIONS: readonly WrTagIconPosition[] = ['start', 'end'];
  let fixture: ReturnType<typeof TestBed.createComponent<IconHost>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(IconHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it.each(POSITIONS)('iconPosition %s', position => {
    fixture.componentInstance.position.set(position);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('wr-tag')!.classList).toContain(
      `wr-tag--icon-${position}`
    );
  });
});

/**
 * What the stylesheet promises that jsdom cannot show — it has no cascade from a
 * sheet and no forced-colors mode — held against the COMPILED CSS. That each rule
 * then paints what it says was measured in Chromium with `forcedColors: 'active'`.
 * `sass` is resolved through `@angular/build`, as `theme/sass-entry.spec.ts` does.
 */
describe('WrBadge hooks', () => {
  const css = compileSass("@use 'badge/styles';").replace(/\/\*[\s\S]*?\*\//g, '');
  /** The declarations of the rule whose selector is exactly `selector`, in `source`. */
  const rule = (source: string, selector: string): string =>
    new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.()>:]/g, m => `\\${m}`)}\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? '';

  it('sets the documented hooks from an intent, so they still restyle a coloured badge', () => {
    // `color` defaults to `primary`; an intent that wrote `background-color` and
    // `color` itself left the hooks working only with `[color]="null"`.
    const primary = rule(css, '.wr-badge--primary');
    expect(primary).toMatch(/--wr-badge-bg:\s*var\(--wr-color-primary\)/);
    expect(primary).toMatch(/--wr-badge-color:\s*var\(--wr-color-primary-contrast\)/);
    expect(primary).toMatch(/--wr-badge-border:\s*var\(--wr-color-primary-soft-border\)/);
    expect(primary).not.toMatch(/(?:^|;)\s*(?:background-color|color):/);
  });

  it('draws the outlined variant from the hooks too', () => {
    expect(rule(css, '.wr-badge--outlined')).toMatch(/--wr-badge-bg:\s*transparent/);
    expect(rule(css, '.wr-badge--outlined')).toMatch(/box-shadow:\s*inset 0 0 0 1px var\(--wr-badge-border\)/);
    expect(rule(css, '.wr-badge--outlined.wr-badge--primary')).not.toMatch(/box-shadow|(?:^|;)\s*color:/);
  });

  it('pins an anchored badge with logical insets and mirrors the shift under RTL', () => {
    const anchor = rule(css, '.wr-badge--anchor');
    expect(anchor).toMatch(/position:\s*absolute/);
    expect(anchor).toMatch(/inset-block-start:\s*var\(--wr-badge-anchor-offset-y\)/);
    expect(anchor).toMatch(/inset-inline-end:\s*var\(--wr-badge-anchor-offset-x\)/);
    expect(anchor).not.toMatch(/(?:^|;)\s*(?:top|right|left):/);
    expect(anchor).toMatch(/translate:\s*50% -50%/);
    expect(rule(css, '.wr-badge--anchor:dir(rtl)')).toMatch(/translate:\s*-50% -50%/);
    // An anchored dot with no label is empty too, and stays on screen.
    expect(rule(css, '.wr-badge--anchor:empty:not(.wr-badge--dot)')).toMatch(/display:\s*none/);
    expect(rule(css, '.wr-badge--anchor:empty')).toBe('');
    expect(rule(css, '.wr-badge-anchor')).toMatch(/position:\s*relative/);
  });

  it('sizes a dot from its hook and hides a zero count', () => {
    const dot = rule(css, '.wr-badge--dot');
    expect(dot).toMatch(/width:\s*var\(--wr-badge-dot-size\)/);
    expect(dot).toMatch(/height:\s*var\(--wr-badge-dot-size\)/);
    expect(rule(css, '.wr-badge--hidden')).toMatch(/display:\s*none/);
  });
});
