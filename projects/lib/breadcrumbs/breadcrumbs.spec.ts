import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrBreadcrumbs } from './breadcrumbs';
import { WrBreadcrumbsItem } from './breadcrumbs-item';

@Component({
  imports: [WrBreadcrumbs, WrBreadcrumbsItem],
  template: `
    <wr-breadcrumbs [separator]="separator()" [ariaLabel]="ariaLabel()">
      <wr-breadcrumbs-item href="/">Home</wr-breadcrumbs-item>
      <wr-breadcrumbs-item href="/docs" [external]="external()">Docs</wr-breadcrumbs-item>
      <wr-breadcrumbs-item>Breadcrumbs</wr-breadcrumbs-item>
    </wr-breadcrumbs>
  `,
})
class Host {
  readonly separator = signal('/');
  readonly ariaLabel = signal('Breadcrumbs');
  readonly external = signal(false);
}

@Component({
  imports: [WrBreadcrumbs, WrBreadcrumbsItem],
  template: `
    <wr-breadcrumbs>
      <wr-breadcrumbs-item routerLink="/" icon="home">Home</wr-breadcrumbs-item>
      <wr-breadcrumbs-item [routerLink]="['/reference', 'components']">Components</wr-breadcrumbs-item>
      <wr-breadcrumbs-item>Breadcrumbs</wr-breadcrumbs-item>
    </wr-breadcrumbs>
  `,
})
class RouterHost {}

/**
 * The trail is a `nav` whose LAST entry is the current page: a link for every
 * step behind you, plain text with `aria-current="page"` for where you are.
 *
 * Every test here reads the projected text, and that is deliberate. A default
 * `<ng-content />` placed in more than one `@if` branch projects into only ONE
 * of them — the last in static order — and the others render empty, with no
 * template error and nothing in the console. This component has been broken
 * that way before, and an empty crumb is invisible in a screenshot too.
 */
describe('WrBreadcrumbs', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const nav = (): HTMLElement => root().querySelector<HTMLElement>('nav')!;
  const crumbs = (): HTMLAnchorElement[] => [...root().querySelectorAll<HTMLAnchorElement>('wr-breadcrumbs-item a')];
  const texts = (): string[] => crumbs().map(c => c.textContent.trim());

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the text of EVERY crumb, linked and unlinked alike', () => {
    // The regression this pins: with the projection split across branches, the
    // linked crumbs came out blank and only the last one had its label.
    expect(texts()).toEqual(['Home', 'Docs', 'Breadcrumbs']);
    expect(texts().every(t => t.length > 0)).toBe(true);
  });

  it('presents itself as a named navigation landmark', () => {
    expect(nav().getAttribute('aria-label')).toBe('Breadcrumbs');

    fixture.componentInstance.ariaLabel.set('You are here');
    fixture.detectChanges();
    expect(nav().getAttribute('aria-label')).toBe('You are here');
  });

  it('marks only the last crumb as the current page', () => {
    const current = crumbs().filter(c => c.getAttribute('aria-current') === 'page');

    expect(current).toHaveLength(1);
    expect(current[0].textContent.trim()).toBe('Breadcrumbs');
  });

  it('links the crumbs behind you and not the one you are on', () => {
    expect(crumbs().map(c => c.getAttribute('href'))).toEqual(['/', '/docs', null]);
  });

  it('keeps the current crumb out of the tab order', () => {
    // It goes nowhere, so a tab stop on it is a stop that does nothing.
    expect(crumbs()[2].getAttribute('tabindex')).toBe('-1');
    expect(crumbs()[0].getAttribute('tabindex')).toBeNull();
  });

  it('opens an external crumb safely', () => {
    fixture.componentInstance.external.set(true);
    fixture.detectChanges();

    expect(crumbs()[1].getAttribute('target')).toBe('_blank');
    // `noopener` is the security half — without it the opened page can reach
    // back through `window.opener`.
    expect(crumbs()[1].getAttribute('rel')).toContain('noopener');
  });

  it('publishes the separator as a custom property, so it never reaches the reader', () => {
    fixture.componentInstance.separator.set('›');
    fixture.detectChanges();

    // Drawn by a `::before` from `--wr-breadcrumbs-separator`, deliberately —
    // a real element between the steps would be announced, and the trail would
    // read "Home slash Docs slash Breadcrumbs".
    const host = root().querySelector<HTMLElement>('wr-breadcrumbs')!;
    expect(host.style.getPropertyValue('--wr-breadcrumbs-separator')).toBe('"›"');
    expect(root().querySelector('.wr-breadcrumbs__separator')).toBeNull();
  });

  it('links a crumb given a plain href, not just a routerLink', () => {
    // `RouterLink` bound unconditionally owns the anchor's `href` and nulls it
    // whenever `routerLink` is null — so the documented `href` input rendered
    // text that navigates nowhere. Both forms have to produce a link.
    expect(crumbs()[0].getAttribute('href')).toBe('/');
  });
});

describe('WrBreadcrumbs with router links', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<RouterHost>>;

  const crumbs = (): HTMLAnchorElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('wr-breadcrumbs-item a'),
  ];

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(RouterHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the label of every router crumb', () => {
    // The other half of the projection trap: the two anchors are now separate
    // `@if` branches, so a label that only reached one of them would leave this
    // whole trail blank while the `href` suite above stayed green.
    expect(crumbs().map(c => c.textContent.trim())).toEqual(['Home', 'Components', 'Breadcrumbs']);
  });

  it('lets RouterLink build the href, from a string and from a commands array', () => {
    expect(crumbs().map(c => c.getAttribute('href'))).toEqual(['/', '/reference/components', null]);
  });

  it('still renders the icon beside the label', () => {
    expect(crumbs()[0].querySelector('.wr-breadcrumbs__icon')).not.toBeNull();
  });

  it('marks the last crumb as the current page here too', () => {
    expect(crumbs()[2].getAttribute('aria-current')).toBe('page');
    expect(crumbs()[0].getAttribute('aria-current')).toBeNull();
  });
});

/**
 * The landmark name with nothing bound. `RouterHost` above passes no
 * `[ariaLabel]`, which is the case the `Host` suite could never reach — it binds
 * the input from a signal, so it only ever exercised the override path.
 */
describe('WrBreadcrumbs landmark name', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  const nameOf = async (providers: unknown[]): Promise<string | null> => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...(providers as never[])] });
    const fixture = TestBed.createComponent(RouterHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return (fixture.nativeElement as HTMLElement).querySelector('nav')!.getAttribute('aria-label');
  };

  it('comes out of the catalog, not out of the input default', async () => {
    // It used to be `input('Breadcrumbs')`, so this landmark announced in English
    // beside a `wr-sidebar` announcing "Боковая панель" — and the only escape was
    // restating `[ariaLabel]` on every trail in the app.
    expect(
      await nameOf([
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ])
    ).toBe('Хлебные крошки');
  });

  it('falls back to English when no catalog carries the key', async () => {
    expect(await nameOf([])).toBe('Breadcrumbs');
  });
});
