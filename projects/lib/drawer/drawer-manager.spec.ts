import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, describe, expect, it } from 'vitest';

import { WrDrawerManager } from './drawer-manager';

@Component({ template: '<p>panel body</p>' })
class Panel {}

/**
 * The manager opens a drawer imperatively, so everything it owns is written
 * onto the overlay host rather than into a template — role, modality, and the
 * dismiss button it appends itself. Those attributes are the contract, and they
 * are queried off `document` because the panel lives in the overlay container.
 */
describe('WrDrawerManager', () => {
  const setup = (withCatalog: boolean): WrDrawerManager => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: withCatalog
        ? [
            provideWrOverlay(),
            provideWrI18n({ defaultLocale: 'en', availableLocales: ['en'] }),
            provideWrI18nStaticLoader({ en: { drawer: { close: 'Dismiss the panel' } } }),
          ]
        : [provideWrOverlay()],
    });
    return TestBed.inject(WrDrawerManager);
  };

  const closeButton = (): HTMLElement | null => document.querySelector('.wr-drawer__close');

  afterEach(() => TestBed.resetTestingModule());

  it('presents the panel as a modal dialog', () => {
    setup(false).open(Panel);
    const host = document.querySelector('.wr-drawer__panel--closable')!;

    expect(host.getAttribute('role')).toBe('dialog');
    expect(host.getAttribute('aria-modal')).toBe('true');
  });

  it('names the dismiss button in plain English when no catalog is registered', () => {
    setup(false).open(Panel);

    // `WrI18n` is root-provided with an empty catalog and a `key => key` miss
    // handler, so a bare `t('drawer.close')` returns the KEY. An app that never
    // configured i18n — the documented default — got a button announced as
    // "drawer.close, button". axe cannot catch it: a name is present, it is
    // just the wrong one. `WrDialog` and `<wr-drawer>` already resolve this;
    // the manager was the path left behind.
    expect(closeButton()?.getAttribute('aria-label')).toBe('Close drawer');
  });

  it('prefers a registered catalog string over the fallback', async () => {
    const drawers = setup(true);
    // The static loader is async even when it serves an object literal, so the
    // catalog is not in place at construction time. Resolving the label per
    // open is what lets it win at all — a value read once at injection would
    // have frozen the fallback before this point.
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.tick();

    drawers.open(Panel);

    expect(closeButton()?.getAttribute('aria-label')).toBe('Dismiss the panel');
  });

  it('lets the caller override the label outright', () => {
    setup(false).open(Panel, { closeLabel: 'Close filters' });

    expect(closeButton()?.getAttribute('aria-label')).toBe('Close filters');
  });

  it('omits the dismiss button when closable is off', () => {
    setup(false).open(Panel, { closable: false });

    expect(closeButton()).toBeNull();
  });

  it('takes the panel back out of the document on close', () => {
    const ref = setup(false).open(Panel);
    expect(document.querySelector('.wr-drawer__close')).not.toBeNull();

    ref.close();

    expect(closeButton()).toBeNull();
  });
});
