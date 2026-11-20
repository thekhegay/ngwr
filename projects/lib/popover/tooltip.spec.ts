import { OverlayRef } from '@angular/cdk/overlay';
import { Component, PLATFORM_ID, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { WrButton } from 'ngwr/button';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTooltip } from './tooltip';

@Component({
  imports: [WrButton, WrTooltip],
  template: `
    <wr-btn icon="pencil" class="element" [wrTooltip]="text()" />
    <!-- eslint-disable-next-line @angular-eslint/template/elements-content -->
    <button type="button" wr-btn icon="pencil" class="icon-only" wrTooltip="Edit" position="bottom"></button>
    <button type="button" class="with-text" wrTooltip="Rename" #tip="wrTooltip">Rename</button>
    <button type="button" class="off" wrTooltip="Never" [wrPopoverDisabled]="true">Off</button>
  `,
})
class Host {
  readonly text = signal('Edit');
}

describe('WrTooltip', () => {
  let fixture: ComponentFixture<Host>;

  const el = (cls: string): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`.${cls}`)!;
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

  it('opens a tooltip on hover and closes it on pointer leave', () => {
    hover('with-text');

    expect(pane()?.textContent?.trim()).toBe('Rename');
    expect(pane()?.getAttribute('role')).toBe('tooltip');

    el('with-text').dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(60);
    fixture.detectChanges();
    expect(pane()).toBeNull();
  });

  it('does not use popover semantics on the host', () => {
    expect(el('with-text').hasAttribute('aria-haspopup')).toBe(false);
    expect(el('with-text').hasAttribute('aria-expanded')).toBe(false);
  });

  it('describes a host that has its own text while open', () => {
    hover('with-text');

    expect(el('with-text').hasAttribute('aria-describedby')).toBe(true);
    expect(el('with-text').hasAttribute('aria-label')).toBe(false);
  });

  it('names an icon-only button and the wr-btn element before it is shown', () => {
    expect(el('icon-only').getAttribute('aria-label')).toBe('Edit');
    expect(el('element').getAttribute('aria-label')).toBe('Edit');
    expect(pane()).toBeNull();
  });

  it('follows the bound string', () => {
    fixture.componentInstance.text.set('Rename');
    fixture.detectChanges();

    expect(el('element').getAttribute('aria-label')).toBe('Rename');
  });

  it('repositions an open tooltip when its text changes, and closes it when the text goes empty', async () => {
    const reposition = vi.spyOn(OverlayRef.prototype, 'updatePosition');
    hover('element');
    expect(pane()?.textContent?.trim()).toBe('Edit');
    reposition.mockClear();

    fixture.componentInstance.text.set('Edited, saved to the server');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(pane()?.textContent?.trim()).toBe('Edited, saved to the server');
    expect(reposition).toHaveBeenCalled();

    fixture.componentInstance.text.set('');
    fixture.detectChanges();
    expect(pane()).toBeNull();
    reposition.mockRestore();
  });

  it('passes position through', () => {
    hover('icon-only');

    // jsdom lays nothing out, so the placement class is what says where it went.
    expect(pane()?.classList.contains('wr-tooltip-overlay--bottom')).toBe(true);
  });

  it('stays shut while wrPopoverDisabled', () => {
    hover('off');

    expect(pane()).toBeNull();
  });
});

describe('WrTooltip on the server', () => {
  const globals = globalThis as Record<string, unknown>;
  let fixture: ComponentFixture<Host>;

  beforeEach(() => {
    globals['ngServerMode'] = true;
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    globals['ngServerMode'] = false;
  });

  it('names the icon-only button in the markup it emits', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.element')!;

    expect(btn.getAttribute('aria-label')).toBe('Edit');
    expect(btn.hasAttribute('data-wr-named')).toBe(true);
  });
});
