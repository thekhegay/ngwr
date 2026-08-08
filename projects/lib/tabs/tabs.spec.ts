import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it } from 'vitest';

import { WrTab } from './tab';
import { WrTabs } from './tabs';

/**
 * The pattern for a component spec here: a tiny host that uses the component
 * the way a consumer would, and assertions against the RENDERED DOM — roles,
 * ARIA state and the `.wr-*` classes. Those classes are public API, so a test
 * that pokes at component internals instead would pass straight through the
 * kind of change that actually breaks people.
 */
@Component({
  imports: [WrTabs, WrTab],
  template: `
    <wr-tabs [(active)]="active">
      <wr-tab title="One" key="one">Panel one</wr-tab>
      <wr-tab title="Two" key="two">Panel two</wr-tab>
      <wr-tab title="Three" key="three" [disabled]="true">Panel three</wr-tab>
      <wr-tab title="Four" key="four">Panel four</wr-tab>
    </wr-tabs>
  `,
})
class Host {
  readonly active = signal<string | null>(null);
}

describe('WrTabs', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const strip = (): HTMLElement => root().querySelector<HTMLElement>('[role="tablist"]')!;
  const tabs = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('[role="tab"]')];
  const panel = (): HTMLElement | null => root().querySelector<HTMLElement>('[role="tabpanel"]');
  const selected = (): string | undefined =>
    tabs()
      .find(t => t.getAttribute('aria-selected') === 'true')
      ?.textContent?.trim();
  const key = (name: string): void => {
    strip().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  it('renders one tab per <wr-tab>, in order', () => {
    expect(tabs().map(t => t.textContent?.trim())).toEqual(['One', 'Two', 'Three', 'Four']);
  });

  it('selects the first tab when nothing was bound', () => {
    expect(selected()).toBe('One');
    expect(fixture.componentInstance.active()).toBe('one');
  });

  it('keeps exactly one tab in the tab order — the roving tabindex', () => {
    // A tablist is one tab stop. Four reachable tabs would mean four.
    expect(tabs().filter(t => t.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('links each tab to its panel both ways', () => {
    const tab = tabs()[0];
    expect(tab.getAttribute('aria-controls')).toBe(panel()?.getAttribute('id'));
    expect(panel()?.getAttribute('aria-labelledby')).toBe(tab.getAttribute('id'));
  });

  it('renders only the active panel', () => {
    expect(root().querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
    expect(panel()?.textContent).toContain('Panel one');
  });

  it('activates on click and writes back through the two-way binding', () => {
    tabs()[1].click();
    fixture.detectChanges();

    expect(selected()).toBe('Two');
    expect(fixture.componentInstance.active()).toBe('two');
    expect(panel()?.textContent).toContain('Panel two');
  });

  it('follows a change written from outside', () => {
    fixture.componentInstance.active.set('four');
    fixture.detectChanges();
    expect(selected()).toBe('Four');
  });

  it('moves with the arrow keys and wraps at both ends', () => {
    key('ArrowRight');
    expect(selected()).toBe('Two');

    key('ArrowLeft');
    expect(selected()).toBe('One');

    key('ArrowLeft');
    expect(selected()).toBe('Four');

    key('ArrowRight');
    expect(selected()).toBe('One');
  });

  it('skips a disabled tab rather than landing on it', () => {
    fixture.componentInstance.active.set('two');
    fixture.detectChanges();

    key('ArrowRight');
    expect(selected()).toBe('Four');
  });

  it('jumps to the ends with Home and End', () => {
    key('End');
    expect(selected()).toBe('Four');

    key('Home');
    expect(selected()).toBe('One');
  });

  it('leaves other keys to the page', () => {
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    strip().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(selected()).toBe('One');
  });

  it('marks a disabled tab both natively and for assistive tech', () => {
    const disabled = tabs()[2];
    expect(disabled.classList.contains('wr-tabs__tab--disabled')).toBe(true);
    expect((disabled as HTMLButtonElement).disabled).toBe(true);
  });

  it('carries the public BEM classes', () => {
    // These are public API — consumers style against them.
    expect(root().querySelector('.wr-tabs')).toBeTruthy();
    expect(strip().classList.contains('wr-tabs__strip')).toBe(true);
    expect(tabs()[0].classList.contains('wr-tabs__tab')).toBe(true);
    expect(tabs()[0].classList.contains('wr-tabs__tab--active')).toBe(true);
  });
});
