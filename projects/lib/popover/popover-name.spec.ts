import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WrButton } from 'ngwr/button';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrPopover } from './popover';

/**
 * A tooltip on a button or link with no accessible name gives it one: the
 * string lands as `aria-label`, and the host is then not described by the same
 * text. Every other host keeps being described.
 */
@Component({
  imports: [WrButton, WrPopover],
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/elements-content -->
    <button type="button" wr-btn icon="pencil" class="icon-only" [wrPopover]="text()" [mode]="mode()"></button>
    <wr-btn icon="pencil" class="element" [wrPopover]="text()" mode="tooltip" />
    <button type="button" wr-btn icon="pencil" class="with-text" [wrPopover]="text()" mode="tooltip">Rename</button>
    <button type="button" wr-btn class="own-name" aria-label="Rename file" [wrPopover]="text()" mode="tooltip"></button>
    <button
      type="button"
      wr-btn
      class="bound-name"
      [attr.aria-label]="bound()"
      [wrPopover]="text()"
      mode="tooltip"
    ></button>
    <!-- eslint-disable-next-line @angular-eslint/template/elements-content -->
    <button type="button" class="labelled" aria-labelledby="caption" [wrPopover]="text()" mode="tooltip"></button>
    <button type="button" class="hidden-text" [wrPopover]="text()" mode="tooltip">
      <span aria-hidden="true">x</span>
    </button>
    <span class="plain" [wrPopover]="text()" mode="tooltip"></span>
    <span id="caption">Caption</span>
  `,
})
class Host {
  readonly text = signal('Edit');
  readonly mode = signal<'tooltip' | 'popover'>('tooltip');
  readonly bound = signal<string | null>('Edit');
}

describe('WrPopover tooltip naming its host', () => {
  let fixture: ComponentFixture<Host>;

  const el = (cls: string): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`.${cls}`)!;
  const name = (cls: string): string | null => el(cls).getAttribute('aria-label');
  const pane = (): HTMLElement | null => document.querySelector<HTMLElement>('.wr-tooltip-overlay');

  function hover(cls: string): void {
    el(cls).dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    vi.advanceTimersByTime(120);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('names an icon-only button with the tooltip string before it is ever shown', () => {
    expect(name('icon-only')).toBe('Edit');
    expect(pane()).toBeNull();
  });

  it('names the wr-btn element form, which carries role="button"', () => {
    expect(name('element')).toBe('Edit');
  });

  it('shows the same string as the tooltip and does not describe the button with it', () => {
    hover('icon-only');

    expect(pane()?.textContent?.trim()).toBe('Edit');
    expect(name('icon-only')).toBe('Edit');
    expect(el('icon-only').hasAttribute('aria-describedby')).toBe(false);
  });

  it('follows the bound string', () => {
    fixture.componentInstance.text.set('Rename');
    fixture.detectChanges();

    expect(name('icon-only')).toBe('Rename');
  });

  it('takes its name back when the tooltip has no text or the mode leaves tooltip', () => {
    fixture.componentInstance.text.set('');
    fixture.detectChanges();
    expect(el('icon-only').hasAttribute('aria-label')).toBe(false);

    fixture.componentInstance.text.set('Edit');
    fixture.detectChanges();
    expect(name('icon-only')).toBe('Edit');

    fixture.componentInstance.mode.set('popover');
    fixture.detectChanges();
    expect(el('icon-only').hasAttribute('aria-label')).toBe(false);
  });

  it('leaves a button with visible text alone and describes it', () => {
    expect(el('with-text').hasAttribute('aria-label')).toBe(false);

    hover('with-text');

    expect(el('with-text').hasAttribute('aria-label')).toBe(false);
    expect(el('with-text').getAttribute('aria-describedby')).toBe(pane()?.id);
  });

  it("keeps the consumer's aria-label and describes the button with a different string", () => {
    expect(name('own-name')).toBe('Rename file');

    hover('own-name');

    expect(name('own-name')).toBe('Rename file');
    expect(el('own-name').getAttribute('aria-describedby')).toBe(pane()?.id);
  });

  it("does not describe a button whose own aria-label is the tooltip's string", () => {
    hover('bound-name');

    expect(name('bound-name')).toBe('Edit');
    expect(el('bound-name').hasAttribute('aria-describedby')).toBe(false);
  });

  it("describes again once the consumer's aria-label differs from the string", () => {
    fixture.componentInstance.bound.set('Rename file');
    fixture.detectChanges();

    hover('bound-name');

    expect(name('bound-name')).toBe('Rename file');
    expect(el('bound-name').getAttribute('aria-describedby')).toBe(pane()?.id);
  });

  it('leaves a button named by aria-labelledby alone', () => {
    expect(el('labelled').hasAttribute('aria-label')).toBe(false);
  });

  it('does not count aria-hidden content as a name', () => {
    expect(name('hidden-text')).toBe('Edit');
  });

  it('never labels an element that is not a button or a link', () => {
    expect(el('plain').hasAttribute('aria-label')).toBe(false);

    hover('plain');

    expect(el('plain').getAttribute('aria-describedby')).toBe(pane()?.id);
  });
});
