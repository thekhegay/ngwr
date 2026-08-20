import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrCollapse } from './collapse';
import { WrCollapseGroup } from './collapse-group';

@Component({
  imports: [WrCollapse],
  template: `<wr-collapse [title]="title()" [(open)]="open" [disabled]="disabled()">Panel body</wr-collapse>`,
})
class Host {
  readonly title = signal('Details');
  readonly open = signal(false);
  readonly disabled = signal(false);
}

@Component({
  imports: [WrCollapse, WrCollapseGroup],
  template: `
    <wr-collapse-group [accordion]="accordion()">
      <wr-collapse title="One">First</wr-collapse>
      <wr-collapse title="Two">Second</wr-collapse>
      <wr-collapse title="Three">Third</wr-collapse>
    </wr-collapse-group>
  `,
})
class GroupHost {
  readonly accordion = signal(true);
}

/**
 * A disclosure lives or dies on two attributes: `aria-expanded` on the trigger
 * and `aria-controls` pointing at the region it opens. Rendered without them a
 * screen reader announces a bare button and never says whether the panel is
 * open — the animation is the only feedback, and only for people who can see
 * it.
 */
describe('WrCollapse', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const trigger = (): HTMLElement => root().querySelector<HTMLElement>('.wr-collapse__header')!;
  const body = (): HTMLElement | null => root().querySelector<HTMLElement>('.wr-collapse__body');

  const click = (): void => {
    trigger().click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('announces its state on the trigger', () => {
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    click();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('points the trigger at the region it opens', () => {
    click();

    const controls = trigger().getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(root().querySelector(`#${controls}`)).not.toBeNull();
  });

  it('toggles through the two-way binding, both ways', () => {
    click();
    expect(fixture.componentInstance.open()).toBe(true);

    click();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('follows a state written from outside', () => {
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();

    expect([trigger().getAttribute('aria-expanded'), body() !== null]).toEqual(['true', true]);
  });

  it('shows the title on the trigger', () => {
    fixture.componentInstance.title.set('Shipping options');
    fixture.detectChanges();

    expect(trigger().textContent).toContain('Shipping options');
  });

  it('does not open while disabled', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    click();

    expect(fixture.componentInstance.open()).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('carries the public BEM classes, including the open modifier', () => {
    const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-collapse')!;
    expect(host().className).toContain('wr-collapse');

    click();
    expect(host().className).toContain('wr-collapse--open');
  });
});

describe('WrCollapseGroup in accordion mode', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<GroupHost>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const triggers = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('.wr-collapse__header')];
  const openStates = (): string[] => triggers().map(t => t.getAttribute('aria-expanded')!);

  const click = (index: number): void => {
    triggers()[index].click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps only one panel open', () => {
    click(0);
    expect(openStates()).toEqual(['true', 'false', 'false']);

    click(2);
    // The one that was open has to CLOSE, and say so — a panel left announcing
    // `aria-expanded="true"` while collapsed is worse than no attribute.
    expect(openStates()).toEqual(['false', 'false', 'true']);
  });

  it('still closes the open panel when it is clicked again', () => {
    click(1);
    click(1);

    expect(openStates()).toEqual(['false', 'false', 'false']);
  });

  it('lets several stand open when accordion is off', () => {
    fixture.componentInstance.accordion.set(false);
    fixture.detectChanges();

    click(0);
    click(1);

    expect(openStates()).toEqual(['true', 'true', 'false']);
  });
});

/**
 * ⚠️ This one guards the RULE, not the behaviour.
 *
 * `.wr-collapse` is `overflow: hidden` and the header fills it but for the 1px
 * border, so the shared ring's default `+2px` offset left nothing on screen except
 * one row of 1.41:1 halo below the header. jsdom resolves no stylesheet.
 */
describe('the shared focus ring, as the collapse header takes it', () => {
  const focus = readFileSync(join(process.cwd(), 'projects/lib/theme/styles/_focus.scss'), 'utf8');

  it('insets the ring, because the host clips it', () => {
    // Measured in Chromium: 0 ring pixels on any side before, a complete 2px ring
    // inside all four edges after (4743 pixels changed against the blurred header).
    expect(focus).toMatch(/\.wr-collapse__header:focus-visible \{[^}]*outline-offset:\s*-2px/);
  });
});
