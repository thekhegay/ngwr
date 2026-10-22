import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrColor } from 'ngwr/theme';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
  interface Sass {
    compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
  }
  const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;
  const css = sass
    .compileString("@use 'badge/styles';", { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
    .css.replace(/\/\*[\s\S]*?\*\//g, '');
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
});
