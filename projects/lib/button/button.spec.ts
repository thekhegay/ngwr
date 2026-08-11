import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrConfig } from 'ngwr/config';
import type { WrColor } from 'ngwr/theme';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrButton } from './button';
import { WrButtonGroup } from './button-group';
import type { WrButtonShape, WrButtonSize } from './interfaces';

@Component({
  imports: [WrButton],
  template: `
    <wr-btn [disabled]="disabled()" [loading]="loading()" (click)="clicks.set(clicks() + 1)">Delete</wr-btn>
    <button type="button" wr-btn [disabled]="disabled()">Save</button>
  `,
})
class Host {
  readonly disabled = signal(false);
  readonly loading = signal(false);
  readonly clicks = signal(0);
}

/**
 * `wr-btn` has two host forms and they need opposite treatment. On a native
 * `<button>` the browser supplies the role, the tab stop, Enter/Space and the
 * disabled semantics. On the `<wr-btn>` ELEMENT — documented as first-class and
 * used by the pagination, event-calendar and popconfirm chrome — it supplies
 * none of them, so the component has to.
 *
 * That gap was measured, not guessed: in Chromium against the built site, the
 * whole `wr-pagination` subtree contained ZERO focusable nodes and sixty Tab
 * presses never entered it. axe reports nothing, because an unknown element
 * with no role is not an interactive control to it.
 */
describe('WrButton', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const element = (): HTMLElement => root().querySelector<HTMLElement>('wr-btn')!;
  const native = (): HTMLButtonElement => root().querySelector<HTMLButtonElement>('button[wr-btn]')!;

  const press = (key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    element().dispatchEvent(event);
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

  describe('the <wr-btn> element form', () => {
    it('announces as a button and takes a tab stop', () => {
      expect(element().getAttribute('role')).toBe('button');
      expect(element().getAttribute('tabindex')).toBe('0');
    });

    it('activates on Enter and on Space', () => {
      press('Enter');
      expect(fixture.componentInstance.clicks()).toBe(1);

      press(' ');
      expect(fixture.componentInstance.clicks()).toBe(2);
    });

    it('swallows Space so the page does not scroll under the user', () => {
      expect(press(' ').defaultPrevented).toBe(true);
    });

    it('leaves other keys to the page', () => {
      const event = press('a');
      expect([event.defaultPrevented, fixture.componentInstance.clicks()]).toEqual([false, 0]);
    });

    it('leaves the tab order and says it is unavailable while disabled', () => {
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      // `disabled` is inert on a custom element — it styles, it does not
      // disable — so the state has to reach AT through `aria-disabled`, and
      // the control has to leave the tab order by dropping its `tabindex`.
      expect(element().getAttribute('tabindex')).toBeNull();
      expect(element().getAttribute('aria-disabled')).toBe('true');
    });

    it('does not activate from the keyboard while disabled', () => {
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      press('Enter');
      expect(fixture.componentInstance.clicks()).toBe(0);
    });

    it('goes unavailable while loading too', () => {
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      expect(element().getAttribute('aria-disabled')).toBe('true');
      expect(element().getAttribute('aria-busy')).toBe('true');

      press('Enter');
      expect(fixture.componentInstance.clicks()).toBe(0);
    });
  });

  describe('the native host form', () => {
    it('adds no role or tabindex of its own', () => {
      // A <button> already IS a button. Stamping `role="button"` and
      // `tabindex="0"` on it is noise at best, and a `tabindex` would override
      // the browser's own handling of the disabled state at worst.
      expect(native().getAttribute('role')).toBeNull();
      expect(native().getAttribute('tabindex')).toBeNull();
    });

    it('leaves Enter and Space to the browser', () => {
      const clicked = vi.fn();
      native().addEventListener('click', clicked);

      native().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      fixture.detectChanges();

      // jsdom does not synthesise the click a real browser would, which is the
      // point: nothing in the component fired one either, so the native path is
      // untouched rather than doubled.
      expect(clicked).not.toHaveBeenCalled();
    });

    it('disables natively', () => {
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      expect(native().hasAttribute('disabled')).toBe(true);
      expect(native().getAttribute('aria-disabled')).toBeNull();
    });
  });

  it('carries the public BEM classes on both forms', () => {
    expect(element().className).toContain('wr-btn');
    expect(native().className).toContain('wr-btn');
  });
});

/**
 * `size`, `shape` and `color` resolve through `provideWrConfig()` now, so their
 * inputs default to `null` — "not set" had to become expressible before a config
 * could fill it in.
 *
 * The assertions read the CLASS LIST rather than the resolved signals, for two
 * reasons: the `wr-btn--*` modifiers are public API, and one `computed()` builds
 * all of them, so a read left on an unresolved input shows up here as a missing
 * class rather than hiding behind a passing unit.
 */
@Component({
  imports: [WrButton, WrButtonGroup],
  template: `
    <wr-btn>Element</wr-btn>
    <button type="button" wr-btn>Native</button>
    <a wr-btn>Link</a>
    <wr-btn id="bound" [size]="size()" [shape]="shape()" [color]="color()">Bound</wr-btn>
    <wr-btn-group [shape]="groupShape()">
      <button type="button" wr-btn id="grouped">Grouped</button>
      <button type="button" wr-btn id="grouped-bound" [shape]="shape()">Grouped, opinionated</button>
    </wr-btn-group>
  `,
})
class ConfigHost {
  readonly size = signal<WrButtonSize | null>(null);
  readonly shape = signal<WrButtonShape | null>(null);
  readonly color = signal<WrColor | null>(null);
  readonly groupShape = signal<WrButtonShape | null>(null);
}

describe('WrButton config defaults', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ConfigHost>>;

  const mount = (providers: unknown[] = []): ConfigHost => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(ConfigHost);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  /** Sorted so an assertion pins the set of modifiers, not the order they are built in. */
  const classesOf = (selector: string): string[] => {
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector)!;
    return [...el.classList].sort();
  };

  afterEach(() => fixture.destroy());

  it('renders exactly as before when no config is provided', () => {
    mount();

    // The whole change rests on this: `md` + `rounded` + no intent emit no
    // modifier at all, on every one of the three host shapes.
    expect(classesOf('wr-btn')).toEqual(['wr-btn']);
    expect(classesOf('button[wr-btn]')).toEqual(['wr-btn']);
    expect(classesOf('a[wr-btn]')).toEqual(['wr-btn']);
    // And a template that binds `null` explicitly is the same as one that binds
    // nothing — `null` is the absence marker, not a value.
    expect(classesOf('#bound')).toEqual(['wr-btn']);
  });

  it('takes the configured size when the template names none', () => {
    mount([provideWrConfig({ button: { size: 'lg' } })]);

    expect(classesOf('wr-btn')).toEqual(['wr-btn', 'wr-btn--lg']);
  });

  it('applies the config to the attribute host shapes too', () => {
    mount([provideWrConfig({ button: { size: 'sm' } })]);

    expect(classesOf('button[wr-btn]')).toEqual(['wr-btn', 'wr-btn--sm']);
    expect(classesOf('a[wr-btn]')).toEqual(['wr-btn', 'wr-btn--sm']);
  });

  it('lets a bound value beat the config', () => {
    const host = mount([provideWrConfig({ button: { size: 'lg' } })]);
    host.size.set('sm');
    host.shape.set('squircle');
    host.color.set('danger');
    fixture.detectChanges();

    expect(classesOf('#bound')).toEqual(['wr-btn', 'wr-btn--danger', 'wr-btn--sm', 'wr-btn--squircle']);
  });

  it('lets a bound default turn a configured one back off', () => {
    // The counterpart of `[rounded]="false"` for a scale: binding the value the
    // component would have chosen anyway has to escape the config, or a global
    // becomes something templates cannot opt out of.
    const host = mount([provideWrConfig({ button: { size: 'lg' } })]);
    host.size.set('md');
    host.shape.set('rounded');
    fixture.detectChanges();

    expect(classesOf('#bound')).toEqual(['wr-btn']);
  });

  it('picks the config back up when a binding goes back to null', () => {
    const host = mount([provideWrConfig({ button: { size: 'lg' } })]);
    host.size.set('sm');
    fixture.detectChanges();
    expect(classesOf('#bound')).toEqual(['wr-btn', 'wr-btn--sm']);

    host.size.set(null);
    fixture.detectChanges();
    expect(classesOf('#bound')).toEqual(['wr-btn', 'wr-btn--lg']);
  });

  it('ignores a config that names other components', () => {
    mount([provideWrConfig({ select: { size: 'sm', rounded: true } })]);

    expect(classesOf('wr-btn')).toEqual(['wr-btn']);
  });
});
