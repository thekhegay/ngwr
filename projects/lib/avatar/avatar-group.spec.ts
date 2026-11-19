import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COMPILE_TIMEOUT, compileSass } from '../spec-sass';

import { WrAvatar } from './avatar';
import { WrAvatarGroup } from './avatar-group';

@Component({
  imports: [WrAvatar, WrAvatarGroup],
  template: `
    <wr-avatar-group [max]="max()" [label]="label()">
      @for (n of names(); track n) {
        <wr-avatar shape="circle" [size]="32" [name]="n" />
      }
    </wr-avatar-group>
  `,
})
class Host {
  readonly max = signal<number | string | null>(3);
  readonly label = signal<string | null>('Assignees');
  readonly names = signal(['Ada Lovelace', 'Bob Marley', 'Carl Sagan', 'Dana Scully', 'Eve Polastri']);
}

describe('WrAvatarGroup', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const group = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-avatar-group')!;
  const avatars = (): HTMLElement[] => Array.from(group().querySelectorAll<HTMLElement>(':scope > wr-avatar'));
  const visible = (): HTMLElement[] => avatars().filter(a => !a.hidden);
  const more = (): HTMLElement | null => group().querySelector<HTMLElement>('.wr-avatar-group__more');

  const create = async (providers: unknown[] = []): Promise<void> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  };

  beforeEach(() => create());
  afterEach(() => fixture.destroy());

  it('keeps projected order and draws the first `max`, hiding the rest', () => {
    expect(avatars().length).toBe(6);
    expect(visible().length).toBe(4);
    expect(
      avatars()
        .slice(0, 3)
        .every(a => !a.hidden)
    ).toBe(true);
    expect(
      avatars()
        .slice(3, 5)
        .every(a => a.hidden)
    ).toBe(true);
    // The "+N" avatar is the last child.
    expect(avatars().at(-1)).toBe(more());
  });

  it('counts the hidden avatars in a "+N" avatar of the same size and shape', () => {
    expect(more()!.textContent.trim()).toBe('+2');
    expect(more()!.style.width).toBe('32px');
    expect(more()!.classList.contains('wr-avatar--circle')).toBe(true);
  });

  it('names the "+N" avatar "2 more" and drops its text from the tree', () => {
    expect(more()!.getAttribute('role')).toBe('img');
    expect(more()!.getAttribute('aria-label')).toBe('2 more');
  });

  it('takes the name from the catalog', async () => {
    await create([
      provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
      provideWrI18nStaticLoader({ ru: wrRu }),
    ]);
    await fixture.whenStable();

    expect(more()!.getAttribute('aria-label')).toBe('Ещё: 2');
  });

  it('follows max and the list', async () => {
    fixture.componentInstance.max.set(4);
    await fixture.whenStable();
    expect(more()!.textContent.trim()).toBe('+1');
    expect(visible().length).toBe(5);

    fixture.componentInstance.names.update(n => n.slice(0, 2));
    await fixture.whenStable();
    expect(more()).toBeNull();
    expect(visible().length).toBe(2);
  });

  it('draws everything with no max', async () => {
    for (const value of [null, '', 'abc', -1]) {
      fixture.componentInstance.max.set(value);
      await fixture.whenStable();

      expect(more(), String(value)).toBeNull();
      expect(visible().length).toBe(5);
    }
  });

  it('draws only the "+N" avatar at max 0', async () => {
    fixture.componentInstance.max.set(0);
    await fixture.whenStable();

    expect(visible()).toEqual([more()]);
    expect(more()!.textContent.trim()).toBe('+5');
  });

  it('is a named group, and carries no role without a label', async () => {
    expect(group().getAttribute('role')).toBe('group');
    expect(group().getAttribute('aria-label')).toBe('Assignees');

    fixture.componentInstance.label.set(null);
    await fixture.whenStable();
    expect(group().hasAttribute('role')).toBe(false);
    expect(group().hasAttribute('aria-label')).toBe(false);
  });

  describe('styles', () => {
    it('overlaps with a logical margin, so RTL mirrors it', { timeout: COMPILE_TIMEOUT }, () => {
      const css = compileSass("@use 'avatar/styles';");
      const block = css.slice(css.indexOf('.wr-avatar-group'));

      expect(block).toMatch(
        /margin-inline-start: calc\(var\(--wr-avatar-size\) \* var\(--wr-avatar-group-overlap\) \* -1\)/
      );
      expect(block).not.toMatch(/margin-(left|right)/);
    });

    it(
      'rings the avatars in the surface colour and hides the overflow by display',
      { timeout: COMPILE_TIMEOUT },
      () => {
        const css = compileSass("@use 'avatar/styles';");

        expect(css).toContain('--wr-avatar-group-ring-color: var(--wr-color-surface)');
        expect(css).toMatch(/\.wr-avatar-group > \.wr-avatar\[hidden\] \{\s*display: none;/);
      }
    );
  });
});
