import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { WrColor } from 'ngwr/theme';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBadge } from './badge';
import type { WrBadgeShape, WrBadgeSize, WrTagIconPosition } from './interfaces';
import { WrTag } from './tag';

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
    for (const color of ['success', 'danger', 'warning', 'info', 'light', 'medium', 'dark'] as const) {
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
