import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrIcons, svgIcon, type WrIconName } from 'ngwr/icon';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrEmpty } from './empty';

@Component({
  imports: [WrEmpty],
  template: `
    <wr-empty [icon]="icon()" [iconName]="iconName()" [title]="title()">
      Try a different query.
      <span wrEmptyActions class="reset">Reset</span>
    </wr-empty>
  `,
})
class Host {
  readonly icon = signal(true);
  readonly iconName = signal<WrIconName | null>(null);
  readonly title = signal<string | null>(null);
}

/**
 * The icon contract is the point of this file. `icon` used to be typed as an icon
 * NAME and then ignored — every value drew the built-in folder — so the documented
 * `icon="search"` example rendered a folder. It is a boolean toggle now, with
 * `iconName` delegating to `<wr-icon>`: the same split `<wr-alert>` already had.
 */
describe('WrEmpty', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-empty')!;
  const builtIn = (): SVGElement | null => root().querySelector<SVGElement>('svg.wr-empty__icon');
  const icon = (): HTMLElement | null => root().querySelector<HTMLElement>('wr-icon');

  const mount = (providers: unknown[] = []): void => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  beforeEach(() => mount());
  afterEach(() => fixture.destroy());

  it('announces itself as a status region with the catalog headline', () => {
    expect(host().getAttribute('role')).toBe('status');
    expect(root().querySelector('.wr-empty__title')!.textContent.trim()).toBe('No data');
  });

  it('takes a headline from the consumer', () => {
    fixture.componentInstance.title.set('No results');
    fixture.detectChanges();

    expect(root().querySelector('.wr-empty__title')!.textContent.trim()).toBe('No results');
  });

  it('draws the built-in glyph by default, out of the accessible tree', () => {
    expect(builtIn()).not.toBeNull();
    expect(builtIn()!.getAttribute('aria-hidden')).toBe('true');
    expect(icon()).toBeNull();
  });

  it('drops the icon entirely when asked', () => {
    fixture.componentInstance.icon.set(false);
    fixture.detectChanges();

    expect(builtIn()).toBeNull();
    expect(icon()).toBeNull();
  });

  it('renders a named icon instead of the built-in glyph', () => {
    mount([provideWrIcons([svgIcon('search', '<circle cx="11" cy="11" r="8" />')])]);
    fixture.componentInstance.iconName.set('search');
    fixture.detectChanges();

    expect(icon()).not.toBeNull();
    expect(icon()!.querySelector('circle')).not.toBeNull();
    // Exactly one glyph: the folder used to render next to whatever was asked for.
    expect(builtIn()).toBeNull();
  });

  it('projects the description and the action row into their own slots', () => {
    expect(root().querySelector('.wr-empty__description')!.textContent).toContain('Try a different query.');
    expect(root().querySelector('.wr-empty__actions')!.querySelector('.reset')).not.toBeNull();
  });
});

describe('WrEmpty under a localized catalog', () => {
  it('takes its headline from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const title = (fixture.nativeElement as HTMLElement).querySelector('.wr-empty__title')!;
    expect(title.textContent.trim()).not.toBe('No data');
    expect(title.textContent.trim().length).toBeGreaterThan(0);

    fixture.destroy();
  });
});
