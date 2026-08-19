import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it } from 'vitest';

import { WrI18n } from './i18n';
import { provideWrI18n, provideWrI18nStaticLoader } from './provide-wr-i18n';
import { nullSignal, readI18nText, useI18nFormatter, useI18nText } from './util';

/**
 * Both no-binding helpers on the SAME key, side by side.
 *
 * `readI18nText` used to return a plain `string`, resolved in this field
 * initializer — which runs during the first change-detection pass, and every
 * loader-backed catalog lands a microtask after it (`WrI18n.loadCatalog` goes
 * through `firstValueFrom(...).then(...)`, even for a static loader serving an
 * object literal). So `read` froze the English fallback while `use`, one line
 * below it, resolved Russian. That split shipped inside single components: a
 * `<wr-date-picker>` announced its field "Открыть календарь" and its calendar
 * button "Open calendar", off the one key `datePicker.open`.
 */
@Component({
  template: `<span class="read">{{ read() }}</span
    ><span class="use">{{ use() }}</span> <span class="missing">{{ missing() }}</span
    ><span class="fmt">{{ fmt({ label: 'Ада' }) }}</span>`,
})
class Host {
  protected readonly read = readI18nText('tree.expand', 'Expand');
  protected readonly use = useI18nText(nullSignal(), 'tree.expand', 'Expand');
  protected readonly missing = readI18nText('tree.nothingHere', 'Nothing here');
  protected readonly fmt = useI18nFormatter('tree.removeItem', 'Remove {{label}}');
}

const CATALOGS = {
  ru: { tree: { expand: 'Развернуть', removeItem: 'Удалить {{label}}' } },
  en: { tree: { expand: 'Expand', removeItem: 'Remove {{label}}' } },
};

describe('readI18nText', () => {
  // `use()` persists the locale, and jsdom's localStorage outlives TestBed.
  beforeEach(() => localStorage.clear());

  const mount = async (): Promise<ReturnType<typeof TestBed.createComponent<Host>>> => {
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru', 'en'] }),
        provideWrI18nStaticLoader(CATALOGS),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  };

  const textOf = (fixture: { nativeElement: HTMLElement }, selector: string): string =>
    fixture.nativeElement.querySelector(selector)?.textContent?.trim() ?? '';

  it('resolves a catalog that lands after the component was constructed', async () => {
    const fixture = await mount();
    expect(textOf(fixture, '.read')).toBe('Развернуть');
  });

  it('never disagrees with useI18nText on the same key', async () => {
    // The one assertion that would have caught this at any point: a component
    // cannot be right announcing its own key in two languages.
    const fixture = await mount();
    expect(textOf(fixture, '.read')).toBe(textOf(fixture, '.use'));
  });

  it('follows a runtime locale switch', async () => {
    const fixture = await mount();
    const i18n = TestBed.inject(WrI18n);

    i18n.use('en');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(textOf(fixture, '.read')).toBe('Expand');

    // Back again, because 'Expand' is also the hard-coded fallback: a frozen
    // string passes the first leg of this by accident and fails here.
    i18n.use('ru');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(textOf(fixture, '.read')).toBe('Развернуть');
  });

  it('serves its own fallback for a key the catalog does not carry', async () => {
    // `t()` hands back the KEY on a miss, and rendering `tree.nothingHere` as a
    // label is worse than rendering English.
    const fixture = await mount();
    expect(textOf(fixture, '.missing')).toBe('Nothing here');
  });

  it('serves the fallback when i18n was never configured', () => {
    // `WrI18n` is root-provided, so it constructs either way; the default loader
    // serves an empty catalog and every lookup misses.
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(textOf(fixture, '.read')).toBe('Expand');
  });

  it('leaves useI18nFormatter resolving per call, as it already did', async () => {
    // The formatter was never frozen — it re-reads on every invocation — and this
    // is here so a future tidy-up that unifies the three helpers cannot lose that.
    const fixture = await mount();
    expect(textOf(fixture, '.fmt')).toBe('Удалить Ада');
  });
});
