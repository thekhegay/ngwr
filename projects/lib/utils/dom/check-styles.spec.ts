import { Component, PLATFORM_ID, type Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wrCheckStyles } from './check-styles';

/**
 * The check is keyed per DOCUMENT, and one jsdom document serves this whole
 * file, so each case asks about an entry point of its own: a second case on
 * `select` would read the first case's answer. The theme is a once-per-document
 * question too, so the one case about it runs first.
 */
let entry = '';

@Component({
  selector: 'wr-probe',
  template: '',
})
class Probe {
  constructor() {
    wrCheckStyles(entry);
  }
}

/**
 * Rendered through a host, never as the fixture's root: TestBed mounts a root
 * component on a `<div>`, and the warning names the host's tag.
 */
@Component({
  imports: [Probe],
  template: '<wr-probe />',
})
class One {}

@Component({
  imports: [Probe],
  template: '<wr-probe /><wr-probe /><wr-probe />',
})
class Three {}

/** Every marker a `<style>` declared for this case, removed after it. */
const planted: HTMLStyleElement[] = [];

function plant(...entries: string[]): void {
  const style = document.createElement('style');
  style.textContent = `:root { ${entries.map(e => `--wr-loaded-${e.replace(/\//g, '-')}: 1;`).join(' ')} }`;
  document.head.append(style);
  planted.push(style);
}

async function render(host: typeof One | typeof Three = One, providers: Provider[] = []): Promise<void> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [host], providers });
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  await fixture.whenStable();
}

describe('wrCheckStyles', () => {
  let warn: MockInstance<typeof console.warn>;
  let browser: MockInstance<() => string>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // A real browser's agent string: under jsdom's own the check stands down.
    browser = vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Chrome/130.0');
  });

  afterEach(() => {
    warn.mockRestore();
    browser.mockRestore();
    for (const style of planted.splice(0)) style.remove();
  });

  it('names the theme once when the token layer is missing', async () => {
    entry = 'alert';
    await render(Three);

    expect(warn.mock.calls.map(([first]) => String(first))).toEqual([
      "[NGWR] <wr-probe> renders without the theme tokens. Add @use 'ngwr/theme'; first in your global stylesheet, " +
        'or run ng g ngwr:component-style theme.',
      "[NGWR] <wr-probe> renders without its styles. Add @use 'ngwr/alert'; to your global stylesheet, " +
        'or run ng g ngwr:component-style alert.',
    ]);
  });

  it('warns once with the entry point and the command when the marker is missing', async () => {
    entry = 'select';
    plant('theme');
    await render();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "[NGWR] <wr-probe> renders without its styles. Add @use 'ngwr/select'; to your global stylesheet, " +
        'or run ng g ngwr:component-style select.'
    );
  });

  it('spells a nested entry point the way its sheet does', async () => {
    entry = 'charts/bar-chart';
    plant('theme');
    await render();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("@use 'ngwr/charts/bar-chart';"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ng g ngwr:component-style charts/bar-chart.'));
  });

  it('is silent when the marker is present', async () => {
    entry = 'button';
    plant('theme', 'button');
    await render();

    expect(warn).not.toHaveBeenCalled();
  });

  it('reads a nested entry point under the name its sheet declares', async () => {
    entry = 'charts/line-chart';
    plant('theme', 'charts/line-chart');
    await render();

    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once per entry point however many instances render', async () => {
    entry = 'tabs';
    plant('theme');
    await render(Three);
    await render(Three);

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('is silent under jsdom', async () => {
    entry = 'card';
    browser.mockRestore();
    await render();

    expect(navigator.userAgent).toContain('jsdom');
    expect(warn).not.toHaveBeenCalled();
  });

  it('is silent on the server', async () => {
    entry = 'badge';
    await render(One, [{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(warn).not.toHaveBeenCalled();
  });

  it('is silent in production mode', async () => {
    entry = 'avatar';
    const g = globalThis as { ngDevMode?: unknown };
    const was = g.ngDevMode;
    g.ngDevMode = false;
    try {
      await render();
    } finally {
      g.ngDevMode = was;
    }

    expect(warn).not.toHaveBeenCalled();
  });
});
