import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Directionality } from '@angular/cdk/bidi';
import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrDropdown } from './dropdown';
import { WrDropdownItem } from './dropdown-item';
import { WrDropdownMenu } from './dropdown-menu';
import {
  WR_DROPDOWN_FALLBACKS,
  WR_DROPDOWN_POSITIONS,
  type WrDropdownPosition,
  type WrDropdownTrigger,
  wrDropdownPositions,
} from './interfaces';

/**
 * The menu is a CDK overlay rendered from a template portal, so it lands in the
 * overlay container rather than in the fixture — every query for an item goes
 * through the document. `provideWrOverlay()` keeps that container out of the next
 * spec file's.
 */
@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: `
    <button type="button" id="account-actions" [wrDropdown]="menu" [trigger]="how()">Actions</button>
    <wr-dropdown-menu #menu>
      <wr-dropdown-item (click)="picked.push('copy')">Copy</wr-dropdown-item>
      <wr-dropdown-item [disabled]="true" (click)="picked.push('delete')">Delete</wr-dropdown-item>
      <wr-dropdown-item (click)="picked.push('rename')">Rename</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class Host {
  readonly how = signal<WrDropdownTrigger>('click');
  readonly picked: string[] = [];
}

/** Same menu, on a trigger the consumer gave no `id` of their own. */
@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: `
    <button type="button" [wrDropdown]="menu">Actions</button>
    <wr-dropdown-menu #menu>
      <wr-dropdown-item>Copy</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class UnnamedHost {}

/**
 * The two ways an `id` can arrive from a BINDING rather than as a literal
 * attribute. A static `id=""` is on the element before a directive is even
 * constructed; these are not, and the directive used to read the element in its
 * constructor and then write its generated fallback over both. An interpolated
 * `id="{{ … }}"` needs no third case — Angular compiles it to the property
 * binding the first button already covers.
 */
@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: `
    <button type="button" [id]="name()" [wrDropdown]="menu">Property</button>
    <button type="button" [attr.id]="name() + '-attr'" [wrDropdown]="menu">Attribute</button>
    <wr-dropdown-menu #menu>
      <wr-dropdown-item>Copy</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class BoundIdHost {
  readonly name = signal('account-actions');
}

describe('WrDropdown', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const trigger = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!;
  const menu = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-dropdown-menu');
  const items = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.wr-dropdown-item')];

  const click = (el: HTMLElement): void => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    fixture.detectChanges();
  };

  const key = (el: EventTarget, name: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('advertises a menu button before anything is open', () => {
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().hasAttribute('aria-controls')).toBe(false);
    expect(trigger().classList.contains('wr-dropdown-trigger')).toBe(true);
    expect(menu()).toBeNull();
  });

  it("leaves the consumer's own id on their own element", () => {
    // The trigger belongs to the consumer. Overwriting its `id` broke `<label for>`,
    // `getElementById` and any `aria-labelledby` aimed at that button — and the id
    // exists only so the menu has something to name itself after, which the
    // consumer's own value does just as well.
    expect(trigger().getAttribute('id')).toBe('account-actions');

    click(trigger());
    expect(menu()!.getAttribute('aria-labelledby')).toBe('account-actions');
  });

  it('generates an id only when the trigger has none', () => {
    const bare = TestBed.createComponent(UnnamedHost);
    bare.detectChanges();
    const button = (bare.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('id')).toMatch(/^wr-dropdown-trigger-\d+$/);
    bare.destroy();
  });

  it('leaves a BOUND id alone too, in both of its forms', () => {
    // The half that was still overwritten. A static `id="…"` is on the element
    // before a directive is constructed and so was already honoured; `[id]` and
    // `[attr.id]` land with the rest of the template's bindings, which is after
    // construction — so the constructor
    // read an empty string, took the generated fallback, and the host binding
    // then wrote that fallback over the value the template had just set. The
    // static form surviving is what made it look like a naming convention.
    const bound = TestBed.createComponent(BoundIdHost);
    bound.detectChanges();
    const root = bound.nativeElement as HTMLElement;

    expect([...root.querySelectorAll('button')].map(b => b.getAttribute('id'))).toEqual([
      'account-actions',
      'account-actions-attr',
    ]);
    bound.destroy();
  });

  it('follows a bound id when it changes, and names the menu after it', () => {
    // A generated fallback that had won once would stay won: the id has to be
    // read on every pass, not decided once.
    const bound = TestBed.createComponent(BoundIdHost);
    bound.detectChanges();
    const root = bound.nativeElement as HTMLElement;
    const first = root.querySelector<HTMLButtonElement>('button')!;

    bound.componentInstance.name.set('row-7');
    bound.detectChanges();
    expect(first.getAttribute('id')).toBe('row-7');

    first.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    bound.detectChanges();
    expect(document.querySelector('.wr-dropdown-menu')!.getAttribute('aria-labelledby')).toBe('row-7');
    bound.destroy();
  });

  it('opens on click and wires the menu to the trigger', () => {
    click(trigger());

    expect(menu()).not.toBeNull();
    expect(menu()!.getAttribute('role')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(menu()!.getAttribute('id'));
  });

  it('closes again on a second click', () => {
    click(trigger());
    click(trigger());
    expect(menu()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('opens from the keyboard the way a menu button should', () => {
    for (const name of ['ArrowDown', 'ArrowUp', 'Enter', ' ']) {
      const event = key(trigger(), name);
      expect(event.defaultPrevented, name).toBe(true);
      expect(menu(), name).not.toBeNull();
      click(trigger());
    }
  });

  it('leaves other keys to the page', () => {
    const event = key(trigger(), 'a');
    expect(event.defaultPrevented).toBe(false);
    expect(menu()).toBeNull();
  });

  it('renders every item as a menuitem outside the tab order', () => {
    click(trigger());
    expect(items().length).toBe(3);
    for (const item of items()) {
      expect(item.getAttribute('role')).toBe('menuitem');
      expect(item.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('activates an item from the keyboard as well as the pointer', () => {
    click(trigger());
    click(items()[0]);
    expect(fixture.componentInstance.picked).toEqual(['copy']);

    // Picking does NOT close the menu — there is no close-on-select anywhere in the
    // item or the menu, so a consumer who wants one calls `close()` themselves.
    expect(menu()).not.toBeNull();

    key(items()[2], 'Enter');
    expect(fixture.componentInstance.picked).toEqual(['copy', 'rename']);
  });

  it('announces a disabled item and refuses to activate it by keyboard', () => {
    click(trigger());
    const disabled = items()[1];

    expect(disabled.getAttribute('aria-disabled')).toBe('true');
    expect(disabled.classList.contains('wr-dropdown-item--disabled')).toBe(true);

    key(disabled, 'Enter');
    key(disabled, ' ');
    expect(fixture.componentInstance.picked).toEqual([]);
  });

  it('moves focus onto the first item once the menu has rendered', async () => {
    // The initial focus is queued in a microtask, so it lands after the synchronous
    // `detectChanges` an event triggers — worth pinning, because every arrow key
    // measures its next target from `document.activeElement`.
    click(trigger());
    expect(document.activeElement).not.toBe(items()[0]);

    await Promise.resolve();
    expect(document.activeElement).toBe(items()[0]);
  });

  it('skips a disabled item when the arrows walk the menu', async () => {
    click(trigger());
    await Promise.resolve();

    // Focus starts on the first item; ArrowDown must land on 'Rename', not 'Delete'.
    key(menu()!, 'ArrowDown');
    expect(document.activeElement).toBe(items()[2]);

    key(menu()!, 'End');
    expect(document.activeElement).toBe(items()[2]);
    key(menu()!, 'Home');
    expect(document.activeElement).toBe(items()[0]);
  });

  it('closes on Escape and hands focus back to the trigger', () => {
    click(trigger());
    key(menu()!, 'Escape');

    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('closes on Tab so focus can leave', () => {
    click(trigger());
    key(menu()!, 'Tab');
    expect(menu()).toBeNull();
  });

  it('opens on hover when asked to', () => {
    fixture.componentInstance.how.set('hover');
    fixture.detectChanges();

    trigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    fixture.detectChanges();
    expect(menu()).not.toBeNull();

    // A click must not toggle it shut in hover mode.
    click(trigger());
    expect(menu()).not.toBeNull();
  });

  /**
   * Hover SHOWS a menu; it does not take the keyboard with it.
   *
   * The first-item focus was unconditional, so sweeping a cursor over a
   * `trigger="hover"` menu pulled the caret out of whatever the user was
   * typing — and moving the cursor away disposed the pane with focus still
   * inside it, dropping focus on `<body>` so the next Tab restarted from the
   * top of the document.
   */
  it('does not take the keyboard when the pointer opens it', async () => {
    fixture.componentInstance.how.set('hover');
    fixture.detectChanges();
    const elsewhere = document.createElement('input');
    document.body.appendChild(elsewhere);
    elsewhere.focus();

    try {
      trigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      fixture.detectChanges();
      await Promise.resolve();
      fixture.detectChanges();

      expect(menu()).not.toBeNull();
      expect(document.activeElement, 'the menu stole the caret').toBe(elsewhere);
    } finally {
      elsewhere.remove();
    }
  });

  it('gives focus back to the trigger when a hover menu closes under it', async () => {
    fixture.componentInstance.how.set('hover');
    fixture.detectChanges();

    trigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    // The user tabbed into the menu, then the pointer left.
    items()[0].focus();
    trigger().dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    fixture.detectChanges();

    expect(menu()).toBeNull();
    expect(document.activeElement, 'focus was stranded on <body>').toBe(trigger());
  });

  it('leaves focus alone when it had already moved out of the menu', async () => {
    // The other half of the close guard: `focusWasInside`. Without it the close
    // yanks the caret onto the trigger from wherever the user has since gone —
    // and an outside CLICK is itself one of the ways a menu closes, so the
    // field they clicked into would lose focus the moment they got there.
    fixture.componentInstance.how.set('hover');
    fixture.detectChanges();
    const elsewhere = document.createElement('input');
    document.body.appendChild(elsewhere);

    try {
      trigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      fixture.detectChanges();
      await Promise.resolve();
      fixture.detectChanges();
      elsewhere.focus();

      trigger().dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      fixture.detectChanges();

      expect(menu()).toBeNull();
      expect(document.activeElement, 'the close stole the caret').toBe(elsewhere);
    } finally {
      elsewhere.remove();
    }
  });

  /**
   * An open menu is fed every keydown on the page, not just its own.
   *
   * CDK's keyboard dispatcher routes document keydowns to the topmost overlay
   * regardless of focus, and a `trigger="hover"` menu is open with the caret
   * left in whatever the user was typing — so the menu handler swallowed
   * ArrowDown/ArrowUp/Home/End meant for that field and pulled focus into
   * itself, and Escape typed there dropped the caret on the nav trigger.
   */
  it('leaves keys typed outside it to the element they were typed in', async () => {
    fixture.componentInstance.how.set('hover');
    fixture.detectChanges();
    const elsewhere = document.createElement('input');
    document.body.appendChild(elsewhere);
    elsewhere.focus();

    try {
      trigger().dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      fixture.detectChanges();
      await Promise.resolve();
      fixture.detectChanges();
      expect(menu()).not.toBeNull();

      for (const name of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
        const event = key(elsewhere, name);
        expect(event.defaultPrevented, `${name} was swallowed`).toBe(false);
        expect(document.activeElement, `${name} stole the caret`).toBe(elsewhere);
      }

      // Escape still closes — that is the dispatcher's whole point — but from
      // out here it must not move focus.
      key(elsewhere, 'Escape');
      expect(menu()).toBeNull();
      expect(document.activeElement, 'Escape stole the caret').toBe(elsewhere);
    } finally {
      elsewhere.remove();
    }
  });

  it('still focuses the first item when the KEYBOARD opens it', async () => {
    fixture.componentInstance.how.set('hover');
    fixture.detectChanges();

    key(trigger(), 'ArrowDown');
    await Promise.resolve();
    fixture.detectChanges();

    expect(document.activeElement).toBe(items()[0]);
  });

  it('takes the menu with it when the trigger is destroyed', () => {
    // The overlay lives in the CDK container, not in the destroyed view, so nothing
    // else would remove it.
    click(trigger());
    expect(menu()).not.toBeNull();

    fixture.destroy();
    expect(menu()).toBeNull();
  });
});

/** The same menu on a trigger that asks for the sheet presentation explicitly. */
@Component({
  imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: `
    <button type="button" [wrDropdown]="menu" [responsive]="responsive()">Actions</button>
    <wr-dropdown-menu #menu>
      <wr-dropdown-item>Copy</wr-dropdown-item>
    </wr-dropdown-menu>
  `,
})
class SheetHost {
  readonly responsive = signal<boolean | undefined>(true);
}

/**
 * The mobile presentation, which is a different overlay rather than a restyled one:
 * pinned to the bottom edge, full width, with a backdrop that blocks the page and
 * dismisses on a tap. Nothing about it is CSS — every one of those is an option
 * passed to `overlay.create()` — so a unit test can see all of it.
 *
 * The viewport is what decides, so it is moved here and put back afterwards: jsdom
 * shares one window across the whole file.
 */
describe('WrDropdown as a bottom sheet', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<SheetHost>>;
  const width = Object.getOwnPropertyDescriptor(window, 'innerWidth');

  const trigger = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector('button')!;
  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-dropdown-overlay');

  const mount = (viewport: number): void => {
    Object.defineProperty(window, 'innerWidth', { value: viewport, configurable: true });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(SheetHost);
    fixture.detectChanges();
  };

  afterEach(() => {
    fixture.destroy();
    if (width) Object.defineProperty(window, 'innerWidth', width);
  });

  it('slides up from the bottom on a narrow viewport', () => {
    mount(390);
    trigger().click();
    fixture.detectChanges();

    expect(pane()!.classList.contains('wr-overlay-sheet')).toBe(true);
    // The floating form carries a per-position modifier; the sheet has no position
    // to carry, which is the tell that it detached from the trigger.
    expect(pane()!.className).not.toContain('wr-dropdown-overlay--');
  });

  it('draws no arrow on a sheet, which has nothing to point at', () => {
    mount(390);
    trigger().click();
    fixture.detectChanges();

    // `arrow` is on by default, and still no `--arrow`: a sheet is docked to the
    // bottom edge, so a tip would point at whatever happens to be above it.
    expect(pane()!.classList.contains('wr-overlay-sheet')).toBe(true);
    expect(pane()!.classList.contains('wr-dropdown-overlay--arrow')).toBe(false);
  });

  it('dims the page behind it, with the shared class that has the styles', () => {
    mount(390);
    trigger().click();
    fixture.detectChanges();

    const backdrop = document.querySelector('.cdk-overlay-backdrop');
    expect(backdrop).not.toBeNull();
    expect(backdrop!.classList.contains('wr-overlay-backdrop')).toBe(true);
  });

  it('closes when that backdrop is tapped', () => {
    mount(390);
    trigger().click();
    fixture.detectChanges();

    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
    fixture.detectChanges();

    expect(pane()).toBeNull();
  });

  it('stays a floating menu on a wide viewport, backdrop and all', () => {
    mount(1280);
    trigger().click();
    fixture.detectChanges();

    expect(pane()!.classList.contains('wr-overlay-sheet')).toBe(false);
    expect(document.querySelector('.cdk-overlay-backdrop')).toBeNull();
  });

  it('follows a direction flip while it is up', () => {
    mount(390);
    const ambient = TestBed.inject(Directionality);
    trigger().click();
    fixture.detectChanges();
    expect(pane()!.parentElement!.getAttribute('dir')).toBe('ltr');

    ambient.valueSignal.set('rtl');
    fixture.detectChanges();

    // A sheet is pinned to the bottom edge and has no anchor to re-resolve, so
    // the `dir` on its host IS the whole of the flip here — and the sheet is the
    // form this menu takes on a phone, where the app's own direction switch is
    // most likely to be inside it. The follower is deliberately called ABOVE the
    // `asSheet` branch in `openOverlay()`; this is what would go red if it ever
    // moved below it.
    expect(pane()!.parentElement!.getAttribute('dir')).toBe('rtl');
    expect(pane()!.classList.contains('wr-overlay-sheet')).toBe(true);
  });

  it('never becomes a sheet when the trigger opted out', () => {
    mount(390);
    fixture.componentInstance.responsive.set(false);
    fixture.detectChanges();

    trigger().click();
    fixture.detectChanges();

    expect(pane()!.classList.contains('wr-overlay-sheet')).toBe(false);
  });
});

/**
 * ⚠️ This one guards the RULE, not the behaviour.
 *
 * A disabled item's own `disabled` guards the KEYBOARD path only; a real pointer
 * click lands on the host element, which is exactly where the consumer bound
 * `(click)`, so nothing stopped `remove()` firing on a disabled Delete. The fix is
 * `pointer-events: none` — the same answer `wr-btn` and `wr-checkbox` give — and
 * jsdom loads no stylesheets, so a spec here that clicked a disabled item would
 * pass identically before and after.
 *
 * Verified instead in headless Chromium against CSS compiled from this folder:
 * a click at the centre of the disabled item reached `.wr-dropdown-item--disabled`
 * before the fix and the item's `<wr-dropdown-menu>` ancestor after it, so the
 * item's own handler is never reached.
 */
describe('the dropdown item stylesheet', () => {
  const source = readFileSync(join(process.cwd(), 'projects/lib/dropdown/styles/_index.scss'), 'utf8');
  const code = source
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');

  it('stops a pointer reaching a disabled item at all', () => {
    const rule = /&--disabled\s*\{([\s\S]*?)\n {2}\}/.exec(code)?.[1] ?? '';
    expect(rule).toMatch(/pointer-events:\s*none/);
  });
});

/**
 * ⚠️ These guard the RULES, not the painting.
 *
 * The arrow is a `::after` drawn by the shared `anchored-arrow` mixin, and jsdom
 * loads no stylesheet — so no spec here can see it, and one that asserted a
 * computed `content` would pass identically with the whole rule deleted. What a
 * unit test can hold is the drift the browser would only show on the one
 * placement nobody opened: a position added to `WrDropdownPosition` with no arrow
 * rule or no gap for it, or the opt-out that stops matching.
 *
 * The painting was measured in Chromium against the built showcase instead, for
 * all eight placements in both themes: `content: ""`, a 6px square filled with
 * the menu's own background and outlined on its two outward faces in the menu's
 * own border colour, 8px from trigger to menu, and `content: none` with a 4px gap
 * under `[arrow]="false"`.
 */
describe('the dropdown arrow stylesheet', () => {
  const code = readFileSync(join(process.cwd(), 'projects/lib/dropdown/styles/_index.scss'), 'utf8')
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n');
  const placements = Object.keys(WR_DROPDOWN_POSITIONS) as WrDropdownPosition[];

  it('emits the arrow for exactly the placements the directive can land on', () => {
    const used = /\$placements-used:\s*\(([^)]*)\)/.exec(code)?.[1] ?? '';
    const names = used
      .split(',')
      .map(name => name.trim())
      .filter(Boolean);

    expect([...names].sort()).toEqual([...placements].sort());
  });

  /** The selectors written inside `&--arrow { … }`, one per rule. */
  const arrowTier = (): string[] => {
    const block = /&--arrow\s*\{([\s\S]*?)\n {2}\}/.exec(code)?.[1] ?? '';
    return [...block.matchAll(/^\s*(&[^{]*)\{/gm)].map(match => match[1].trim());
  };

  it('opens a gap on every placement, and a wider one when the arrow is drawn', () => {
    const wider = arrowTier().join('\n');
    for (const name of placements) {
      expect(code, `no plain gap for ${name}`).toMatch(new RegExp(`&--${name}[,\\s{]`));
      expect(wider, `no arrow gap for ${name}`).toMatch(new RegExp(`\\.wr-dropdown-overlay--${name}[,)]`));
    }
  });

  it("keeps the wider gap at one class of weight, so a consumer's own gap still wins", () => {
    // The gap has no hook: `.wr-dropdown-overlay--<placement> { padding-… }` in
    // the app's sheet is how it is retuned. A compound `&.wr-dropdown-overlay--…`
    // here weighs two classes and beats that on specificity, wherever it sits —
    // measured in Chromium, a consumer's `padding-top: 0` on `--bottom-start`
    // rendered an 8px gap. Inside `:where()`, the placement adds no weight.
    const selectors = arrowTier();
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector).toMatch(/^&:where\([^)]*\)$/);
  });

  it("paints the arrow from the menu's own hooks, so a retinted menu keeps a matching tip", () => {
    const include = /@include arrow\.anchored-arrow\(([\s\S]*?)\);/.exec(code)?.[1] ?? '';
    expect(include).toMatch(/\$background:\s*var\(--wr-dropdown-bg\)/);
    expect(include).toMatch(/\$border:\s*var\(--wr-dropdown-border\)/);
  });

  it('takes the arrow off a pane the directive did not mark', () => {
    expect(code).toMatch(
      /\.wr-dropdown-overlay:not\(\.wr-dropdown-overlay--arrow\)\s*>\s*\.wr-dropdown-menu::after\s*\{\s*content:\s*none;/
    );
  });
});

/**
 * Without `exportAs` a template cannot reach the trigger at all — `#d="wrDropdown"`
 * fails to compile rather than resolving to nothing — so mounting the host is half
 * the assertion, and the other half is that the reference is the directive and not
 * the button it sits on. The name is the trigger's; the PANEL keeps `wrDropdownMenu`.
 */
describe('WrDropdown template reference', () => {
  @Component({
    imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
    template: `
      <button type="button" [wrDropdown]="menu" #ref="wrDropdown">Actions</button>
      <wr-dropdown-menu #menu>
        <wr-dropdown-item>Copy</wr-dropdown-item>
      </wr-dropdown-menu>
    `,
  })
  class ExportHost {
    readonly dropdown = viewChild.required<WrDropdown>('ref');
  }

  it('publishes the instance as `wrDropdown`', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });

    const fixture = TestBed.createComponent(ExportHost);
    fixture.detectChanges();

    const dropdown = fixture.componentInstance.dropdown();
    expect(dropdown).toBeInstanceOf(WrDropdown);
    expect(dropdown.isOpen()).toBe(false);

    fixture.destroy();
  });
});

/**
 * Every documented `[position]`, driven once each.
 *
 * The position lands as a class on the CDK overlay PANE — `wr-dropdown-overlay--<pos>`
 * — which is what a consumer styles against and what the stylesheet keys its
 * arrow and offsets on. jsdom has no layout, so every box is 0×0, the first
 * candidate always "fits", and the class is the requested placement; the class
 * is the contract that survives, and it is the one a typo in the position map
 * would break. The flip itself is driven below with stubbed rects.
 */
describe('WrDropdown pane position', () => {
  @Component({
    imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
    template: `
      <button type="button" [wrDropdown]="menu" [position]="pos()" [arrow]="arrow()">Open</button>
      <wr-dropdown-menu #menu><wr-dropdown-item>Copy</wr-dropdown-item></wr-dropdown-menu>
    `,
  })
  class PositionHost {
    readonly pos = signal<WrDropdownPosition>('bottom-start');
    readonly arrow = signal(true);
  }

  const POSITIONS: readonly WrDropdownPosition[] = [
    'top',
    'top-start',
    'top-end',
    'bottom',
    'bottom-start',
    'bottom-end',
    'left',
    'right',
  ];

  let fixture: ReturnType<typeof TestBed.createComponent<PositionHost>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(PositionHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it.each(POSITIONS)('%s reaches the pane as a class', position => {
    fixture.componentInstance.pos.set(position);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    fixture.detectChanges();

    const pane = document.querySelector('.wr-dropdown-overlay');
    expect(pane).not.toBeNull();
    expect(pane!.classList).toContain(`wr-dropdown-overlay--${position}`);
  });

  const open = (): HTMLElement => {
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    fixture.detectChanges();
    return document.querySelector<HTMLElement>('.wr-dropdown-overlay')!;
  };

  it('marks the pane for an arrow unless asked not to', () => {
    expect(open().classList).toContain('wr-dropdown-overlay--arrow');
  });

  it('leaves the arrow off when `arrow` is false, and keeps the placement', () => {
    fixture.componentInstance.arrow.set(false);
    fixture.detectChanges();
    const pane = open();

    expect(pane.classList).not.toContain('wr-dropdown-overlay--arrow');
    // The gap still needs to know which edge faces the trigger.
    expect(pane.classList).toContain('wr-dropdown-overlay--bottom-start');
  });

  it('reads a static `arrow="false"` as false, the way every boolean attribute here does', () => {
    @Component({
      imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
      template: `
        <button type="button" [wrDropdown]="menu" arrow="false">Open</button>
        <wr-dropdown-menu #menu><wr-dropdown-item>Copy</wr-dropdown-item></wr-dropdown-menu>
      `,
    })
    class StaticHost {}

    fixture.destroy();
    const host = TestBed.createComponent(StaticHost);
    host.detectChanges();
    (host.nativeElement as HTMLElement).querySelector('button')!.click();
    host.detectChanges();

    expect(document.querySelector('.wr-dropdown-overlay')!.classList).not.toContain('wr-dropdown-overlay--arrow');
    host.destroy();
  });
});

/**
 * The flip, through the real `FlexibleConnectedPositionStrategy`.
 *
 * jsdom lays nothing out, so on its own every rect is 0×0 and the requested
 * placement always fits. The layout is stubbed to make one not fit — a 1024×768
 * viewport (the CDK measures it as `documentElement.clientWidth` / `clientHeight`,
 * which jsdom reports as 0), the trigger pinned near one of its edges, and the pane
 * as a 160×120 menu — and everything else stays the CDK's own arithmetic. What is asserted is
 * the class the gap and the arrow key off: the placement the menu LANDED on.
 * Where the arrow then draws is CSS, and was checked in Chromium (see the
 * stylesheet guards above).
 *
 * Before the fallback chains every list held one position, so the CDK had nothing
 * to flip to and pushed the menu back over its own trigger instead — measured in
 * Chromium at 1280×700 with a `bottom-start` trigger 40px above the fold, the menu
 * started at y=626, inside the trigger's 630–660.
 */
describe('WrDropdown when the requested placement does not fit', () => {
  @Component({
    imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
    template: `
      <button type="button" [wrDropdown]="menu" [position]="pos()" [arrow]="arrow()">Open</button>
      <wr-dropdown-menu #menu><wr-dropdown-item>Copy</wr-dropdown-item></wr-dropdown-menu>
    `,
  })
  class FlipHost {
    readonly pos = signal<WrDropdownPosition>('bottom-start');
    readonly arrow = signal(true);
  }

  let fixture: ReturnType<typeof TestBed.createComponent<FlipHost>>;
  let triggerRect = { x: 0, y: 0, width: 0, height: 0 };
  /** The pane's classes each time the CDK measured it. */
  let measuredWith: string[] = [];
  /** The pane's box as the CDK measures it — a fixed menu unless a test says otherwise. */
  let paneSize: (pane: Element) => { width: number; height: number };

  const rect = ({ x, y, width, height }: typeof triggerRect): DOMRect => ({
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  });

  const root = document.documentElement;

  beforeEach(() => {
    measuredWith = [];
    paneSize = () => ({ width: 160, height: 120 });
    Object.defineProperty(root, 'clientWidth', { configurable: true, get: () => 1024 });
    Object.defineProperty(root, 'clientHeight', { configurable: true, get: () => 768 });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('wr-dropdown-trigger')) return rect(triggerRect);
      if (this.classList.contains('cdk-overlay-pane')) {
        measuredWith.push(this.className);
        return rect({ x: 0, y: 0, ...paneSize(this) });
      }
      return rect({ x: 0, y: 0, width: 0, height: 0 });
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(FlipHost);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    // Own properties shadowing the prototype getters; deleting them restores jsdom's.
    delete (root as { clientWidth?: number }).clientWidth;
    delete (root as { clientHeight?: number }).clientHeight;
  });

  const openAt = (position: WrDropdownPosition, at: typeof triggerRect): HTMLElement => {
    triggerRect = at;
    fixture.componentInstance.pos.set(position);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    fixture.detectChanges();
    return document.querySelector<HTMLElement>('.wr-dropdown-overlay')!;
  };

  it('opens above a trigger with no room below, and the pane says so', () => {
    const pane = openAt('bottom-start', { x: 16, y: 730, width: 100, height: 30 });

    expect(pane.classList).toContain('wr-dropdown-overlay--top-start');
    expect(pane.classList).not.toContain('wr-dropdown-overlay--bottom-start');
    expect(pane.classList).toContain('wr-dropdown-overlay--arrow');
  });

  it('comes back to the requested side once there is room for it again', async () => {
    const pane = openAt('bottom-start', { x: 16, y: 730, width: 100, height: 30 });
    expect(pane.classList).toContain('wr-dropdown-overlay--top-start');

    // The page scrolled the trigger up; the CDK re-applies on the viewport's
    // own change stream, which is throttled, hence the wait.
    triggerRect = { x: 16, y: 100, width: 100, height: 30 };
    window.dispatchEvent(new Event('resize'));
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(pane.classList).toContain('wr-dropdown-overlay--bottom-start');
    expect(pane.classList).not.toContain('wr-dropdown-overlay--top-start');
  });

  it('opens below a trigger with no room above', () => {
    const pane = openAt('top-end', { x: 400, y: 10, width: 100, height: 30 });

    expect(pane.classList).toContain('wr-dropdown-overlay--bottom-end');
    expect(pane.classList).not.toContain('wr-dropdown-overlay--top-end');
  });

  it('crosses to the other side of a trigger at the inline edge', () => {
    const pane = openAt('right', { x: 950, y: 300, width: 60, height: 30 });

    expect(pane.classList).toContain('wr-dropdown-overlay--left');
    expect(pane.classList).not.toContain('wr-dropdown-overlay--right');
  });

  it('is measured WITH the gap it will render with', () => {
    // The gap is padding keyed by the placement class, and the CDK measures the
    // pane inside its own `apply()`. A class carried by the position's
    // `panelClass` — the way `wr-popover` tags its links — is taken off the pane
    // before that measurement, so the size tested for fit had no gap in it, and a
    // menu with less room than the gap was squeezed instead of flipped (see
    // `wrDropdownPositions`). jsdom paints no padding, so what is pinned is the
    // precondition: the class is on the pane at the moment it is measured.
    openAt('bottom-start', { x: 16, y: 100, width: 100, height: 30 });

    expect(measuredWith.length).toBeGreaterThan(0);
    for (const classes of measuredWith) {
      expect(classes).toContain('wr-dropdown-overlay--bottom-start');
      expect(classes).toContain('wr-dropdown-overlay--arrow');
    }
  });

  /**
   * The gap is PADDING on the edge that faces the trigger, so the pane's box
   * depends on the class it carries: a 160×66 menu measures 168 wide beside its
   * trigger and 74 tall below or above it. That is the stub the fixed 160×120
   * pane above cannot stand in for — every link measures the same there, so a
   * link tested with the wrong gap passes as though it were the right one.
   */
  const withGap = (pane: Element): { width: number; height: number } => {
    const on = (...names: string[]): boolean =>
      names.some(name => pane.classList.contains(`wr-dropdown-overlay--${name}`));
    return {
      width: 160 + (on('left', 'right') ? 8 : 0),
      height: 66 + (on('top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end') ? 8 : 0),
    };
  };

  /** The height the CDK gave the box the pane is laid out in. */
  const boxHeight = (pane: HTMLElement): number => parseFloat(pane.parentElement!.style.height);

  it('drops a side menu below or above by the box it renders with, not the one it was measured with', async () => {
    paneSize = withGap;
    // Neither side has 168px; 70px below the trigger holds the 66px menu but not
    // the 74px pane it becomes once the gap moves to its top edge. Measured in
    // Chromium before the fix: `--bottom`, and the menu squeezed from 74px to 68px.
    const pane = openAt('right', { x: 100, y: 668, width: 824, height: 30 });
    await fixture.whenStable();

    expect(pane.classList).toContain('wr-dropdown-overlay--top');
    expect(pane.classList).not.toContain('wr-dropdown-overlay--bottom');
    // Measured a second time, carrying the block gap it fell into — and given the
    // room above to lay out in, rather than the 70px box the first pass handed it.
    expect(measuredWith.at(0)).toContain('wr-dropdown-overlay--right');
    expect(measuredWith.at(-1)).toContain('wr-dropdown-overlay--bottom');
    expect(boxHeight(pane)).toBeGreaterThanOrEqual(74);
  });

  it('keeps a side menu below its trigger when the whole pane fits there', async () => {
    paneSize = withGap;
    const pane = openAt('left', { x: 100, y: 658, width: 824, height: 30 });
    await fixture.whenStable();

    expect(pane.classList).toContain('wr-dropdown-overlay--bottom');
    expect(boxHeight(pane)).toBeGreaterThanOrEqual(74);
  });

  it('does not flap back beside the trigger while it stays open', async () => {
    paneSize = withGap;
    const pane = openAt('right', { x: 100, y: 658, width: 824, height: 30 });
    await fixture.whenStable();
    expect(pane.classList).toContain('wr-dropdown-overlay--bottom');

    // Room on the right again. Measured with the block gap, the side link would
    // look 8px narrower than it renders — so the sides stay out until it closes.
    triggerRect = { x: 100, y: 300, width: 100, height: 30 };
    window.dispatchEvent(new Event('resize'));
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(pane.classList).toContain('wr-dropdown-overlay--bottom');
    expect(pane.classList).not.toContain('wr-dropdown-overlay--right');
  });

  it('stays where it was asked to open when that fits', () => {
    const pane = openAt('bottom-start', { x: 16, y: 100, width: 100, height: 30 });

    expect(pane.classList).toContain('wr-dropdown-overlay--bottom-start');
    expect(pane.className.match(/wr-dropdown-overlay--(?!arrow)[a-z-]+/g)).toEqual([
      'wr-dropdown-overlay--bottom-start',
    ]);
  });
});

/**
 * A submenu is a second `[wrDropdown]` whose trigger lives inside the first
 * menu (the component ships no submenu API of its own). It is an anchored menu
 * like any other, so it gets the same arrow and the same placement bookkeeping:
 * pointing at the row that opened it, from the side it opened on.
 */
describe('WrDropdown nested inside another menu', () => {
  @Component({
    imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
    template: `
      <button type="button" [wrDropdown]="file">File</button>
      <wr-dropdown-menu #file>
        <wr-dropdown-item>New</wr-dropdown-item>
        <button type="button" class="share" [wrDropdown]="share" position="right">Share</button>
      </wr-dropdown-menu>
      <wr-dropdown-menu #share>
        <wr-dropdown-item>Copy link</wr-dropdown-item>
      </wr-dropdown-menu>
    `,
  })
  class NestedHost {}

  afterEach(() => {
    vi.restoreAllMocks();
    delete (document.documentElement as { clientWidth?: number }).clientWidth;
    delete (document.documentElement as { clientHeight?: number }).clientHeight;
  });

  it('anchors the submenu to its own row, and marks that pane with its own placement and the arrow', () => {
    // Anchored to WHICH element is geometry, so the layout is stubbed the way the
    // flip specs above stub it: the outer trigger in the top corner, the Share row
    // lower down with its inline end at x=200, and every pane a 160x66 menu.
    const root = document.documentElement;
    Object.defineProperty(root, 'clientWidth', { configurable: true, get: () => 1024 });
    Object.defineProperty(root, 'clientHeight', { configurable: true, get: () => 768 });
    const box = (x: number, y: number, width: number, height: number): DOMRect => ({
      x,
      y,
      width,
      height,
      top: y,
      left: x,
      right: x + width,
      bottom: y + height,
      toJSON: () => ({}),
    });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('share')) return box(40, 200, 160, 32);
      if (this.classList.contains('wr-dropdown-trigger')) return box(16, 16, 80, 30);
      if (this.classList.contains('cdk-overlay-pane')) return box(0, 0, 160, 66);
      return box(0, 0, 0, 0);
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    const fixture = TestBed.createComponent(NestedHost);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    fixture.detectChanges();
    const share = document.querySelector<HTMLElement>('.share')!;
    share.click();
    fixture.detectChanges();

    const panes = [...document.querySelectorAll<HTMLElement>('.wr-dropdown-overlay')];
    expect(panes).toHaveLength(2);
    expect(panes[0].classList).toContain('wr-dropdown-overlay--bottom-start');
    expect(panes[1].classList).toContain('wr-dropdown-overlay--right');
    for (const pane of panes) expect(pane.classList).toContain('wr-dropdown-overlay--arrow');

    // The submenu names the row that opened it, and starts at that row's inline
    // end — 200, where anchoring to the outer trigger would have put it at 96.
    expect(panes[1].querySelector('[role="menu"]')!.getAttribute('aria-labelledby')).toBe(share.id);
    expect(panes[1].parentElement!.style.left).toBe('200px');

    fixture.destroy();
  });
});

/**
 * The flip chains, asserted as a TABLE — the same properties `wr-popover`'s
 * chains are held to, since these are those chains restricted to the eight
 * placements a dropdown offers.
 */
describe('WrDropdown placement fallbacks', () => {
  const names = Object.keys(WR_DROPDOWN_POSITIONS) as WrDropdownPosition[];

  it('gives every placement somewhere to flip to, leading with itself', () => {
    for (const name of names) {
      const chain = WR_DROPDOWN_FALLBACKS[name];
      expect(chain.length, `${name} has no fallback`).toBeGreaterThan(1);
      expect(chain[0], `${name} does not lead with itself`).toBe(name);
      expect(new Set(chain).size, `${name} repeats a placement`).toBe(chain.length);
      for (const link of chain) expect(names, `${name} names a placement that does not exist`).toContain(link);
    }
  });

  it('keeps the requested alignment down a block-axis chain, and never sends it sideways', () => {
    const alignment = (name: WrDropdownPosition): string => name.split('-')[1] ?? '';
    for (const name of ['top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end'] as const) {
      for (const link of WR_DROPDOWN_FALLBACKS[name]) {
        expect(link).toMatch(/^(top|bottom)/);
        expect(alignment(link)).toBe(alignment(name));
      }
    }
  });

  it('lets a side placement reach the block axis, where a phone has the room', () => {
    for (const name of ['left', 'right'] as const) {
      const chain = WR_DROPDOWN_FALLBACKS[name];
      expect(
        chain.some(link => link.startsWith('bottom')),
        `${name} cannot fall below`
      ).toBe(true);
      expect(
        chain.some(link => link.startsWith('top')),
        `${name} cannot fall above`
      ).toBe(true);
    }
  });

  it('hands the CDK the chain in order, as untagged copies it can report back by identity', () => {
    for (const name of names) {
      const list = wrDropdownPositions(name);
      expect(list).toEqual(WR_DROPDOWN_FALLBACKS[name].map(link => WR_DROPDOWN_POSITIONS[link]));
      // A `panelClass` here would be stripped by the CDK before it measures the pane.
      expect(list.every(position => position.panelClass === undefined)).toBe(true);
      // Fresh objects each call: the directive matches the reported link by identity.
      expect(list[0]).not.toBe(WR_DROPDOWN_POSITIONS[name]);
    }
  });

  it('keeps the gap out of the CDK offsets, where a hover menu would lose the pointer crossing it', () => {
    // The gap is pane PADDING so the pointer is still over the overlay on its way
    // from the trigger to the menu. An offset would leave a strip of page between
    // them, and a `trigger="hover"` menu closes the moment the pointer is on it.
    for (const name of names) {
      expect(WR_DROPDOWN_POSITIONS[name].offsetX, name).toBeUndefined();
      expect(WR_DROPDOWN_POSITIONS[name].offsetY, name).toBeUndefined();
    }
  });
});

/**
 * The CDK reads the reading direction ONCE, as a string, when an overlay is
 * created, writes it as the host's `dir` on attach and never looks at it again —
 * so an application that flips while a panel is open mirrors the page around a
 * panel that stays behind, still resolving `start` to the side it has left.
 *
 * This menu is where that shows first, and the reason is circular: the docs
 * site's own LTR/RTL switch lives INSIDE a dropdown, and the `wr-segmented` it
 * is built from reads `Directionality` live — so the thumb slid to the other
 * slot while the pane around it still laid out `ltr`, and parked under the
 * opposite label.
 *
 * Read off the rendered overlay. `dir` goes on the HOST wrapper, not on the
 * pane, which is where `panelClass` lands; and the CDK pins the bounding box to
 * one physical edge, which is the placement half nothing rewrites unless the
 * strategy is applied again.
 */
describe('WrDropdown across a direction flip', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let ambient: Directionality;

  const trigger = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!;
  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-dropdown-overlay');
  const overlayHost = (): HTMLElement => pane()!.parentElement!;

  /**
   * Where the CDK pinned the `bottom-start` menu, as an edge pair. A `start`
   * anchor is `left` in LTR and `right` in RTL, and re-resolving it is the whole
   * of what `updatePosition()` is there for — `setDirection()` writes the
   * attribute and stops.
   */
  const anchoredTo = (): [string, string] => [overlayHost().style.left, overlayHost().style.right];

  const open = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  /** A signal write is state, not an event: it lands on the next pass. */
  const flipTo = (direction: 'ltr' | 'rtl'): void => {
    ambient.valueSignal.set(direction);
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    ambient = TestBed.inject(Directionality);
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('mirrors a menu that is already open', () => {
    open();
    expect([overlayHost().getAttribute('dir'), anchoredTo()]).toEqual(['ltr', ['0px', 'auto']]);

    flipTo('rtl');

    expect([overlayHost().getAttribute('dir'), anchoredTo()]).toEqual(['rtl', ['auto', '0px']]);
  });

  it('leaves the menu alone when the write lands on the direction it already has', () => {
    open();
    flipTo('ltr');

    // A no-op write must not yank a panel the user is reading — and the watch's
    // own mandatory first run is the same write, on every menu in the app.
    expect([overlayHost().getAttribute('dir'), anchoredTo()]).toEqual(['ltr', ['0px', 'auto']]);
  });

  it('gives a reopened menu a follower of its own', () => {
    open();
    trigger().click();
    fixture.detectChanges();
    expect(pane()).toBeNull();

    // Nothing may still be writing through the ref that closed: `dispose()`
    // nulls the host element `setDirection()` writes to, so a follower that
    // outlived its overlay throws here rather than anywhere near a dropdown.
    flipTo('rtl');
    open();
    flipTo('ltr');

    expect([overlayHost().getAttribute('dir'), anchoredTo()]).toEqual(['ltr', ['0px', 'auto']]);
  });
});

/**
 * An `output()` belongs to the view that declares it, so a `closeOverlay()` on
 * the destroy path tried to emit into a dead `OutputRef`: Angular refused it
 * with `NG0953`, the consumer's `(closed)` never ran, and a console error was
 * left behind on every teardown of an open menu.
 *
 * There is nobody to notify at that point — the consumer's own view is going
 * away in the same pass — so the teardown is split from the notification.
 * `wr-popconfirm` already disposed without emitting; this brought the other two
 * into line.
 */
describe('WrDropdown destroyed while open', () => {
  @Component({
    imports: [WrDropdown, WrDropdownMenu, WrDropdownItem],
    template: `
      @if (alive()) {
        <button type="button" [wrDropdown]="menu">Actions</button>
        <wr-dropdown-menu #menu><wr-dropdown-item>Copy</wr-dropdown-item></wr-dropdown-menu>
      }
    `,
  })
  class TeardownHost {
    readonly alive = signal(true);
  }

  afterEach(() => TestBed.resetTestingModule());

  it('tears the overlay down without emitting into a destroyed output', async () => {
    // `console.warn`, not `console.error` — Angular reports NG0953 as a warning,
    // and a first version of this spec watched the wrong channel and therefore
    // passed with the fix reverted. It was caught by running it against the
    // reverted fix, which is the only thing that tells a real spec from a
    // vacuous one.
    const warnings: string[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warnings.push(args.map(String).join(' '));
    });

    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    const fixture = TestBed.createComponent(TeardownHost);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.alive.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    warn.mockRestore();

    expect(warnings.filter(message => message.includes('NG0953'))).toEqual([]);
  });
});
