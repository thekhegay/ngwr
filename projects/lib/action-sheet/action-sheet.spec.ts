import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideWrI18n, provideWrI18nStaticLoader } from 'ngwr/i18n';
import { wrRu } from 'ngwr/i18n/ru';
import { provideWrOverlay } from 'ngwr/overlay';
import { WrHaptics } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrActionSheet } from './action-sheet';
import type { WrActionSheetAction } from './interfaces';

const ACTIONS: readonly WrActionSheetAction[] = [
  { label: 'Share', value: 'share' },
  { label: 'Delete', value: 'delete', role: 'destructive' },
  { label: 'Locked', value: 'locked', disabled: true },
  { label: 'Cancel', value: 'cancel', role: 'cancel' },
];

@Component({
  imports: [WrActionSheet],
  template: `
    <wr-action-sheet
      [(open)]="open"
      [actions]="actions()"
      [title]="title()"
      [message]="message()"
      (action)="chosen.push($event.value)"
    />
  `,
})
class Host {
  readonly open = signal(true);
  readonly actions = signal<readonly WrActionSheetAction[]>(ACTIONS);
  readonly title = signal('');
  readonly message = signal('');
  readonly chosen: unknown[] = [];
}

/**
 * The sheet renders through `<wr-drawer>`, which mounts into the overlay
 * container — so the rows are queried off `document`, not the fixture, and each
 * spec provides its own `provideWrOverlay()` to keep its container out of the next
 * file's.
 */
describe('WrActionSheet', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let haptics: { selection: ReturnType<typeof vi.fn>; impact: ReturnType<typeof vi.fn> };

  const rows = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('.wr-action-sheet__action')];
  const rowFor = (label: string): HTMLButtonElement => rows().find(b => b.textContent.includes(label))!;
  const text = (selector: string): string | null => document.querySelector(selector)?.textContent?.trim() ?? null;

  const mount = (providers: unknown[] = []): void => {
    haptics = { selection: vi.fn(), impact: vi.fn() };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWrOverlay(), { provide: WrHaptics, useValue: haptics }, ...(providers as never[])],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  beforeEach(() => mount());
  afterEach(() => fixture.destroy());

  it('lists every action, with the cancel row in its own group', () => {
    expect(rows().map(b => b.textContent.trim())).toEqual(['Share', 'Delete', 'Locked', 'Cancel']);
    expect(rowFor('Cancel').className).toContain('wr-action-sheet__action--cancel');
    expect(rowFor('Share').className).not.toContain('wr-action-sheet__action--cancel');
  });

  it('marks a destructive row and disables a disabled one', () => {
    expect(rowFor('Delete').className).toContain('wr-action-sheet__action--destructive');
    expect(rowFor('Locked').disabled).toBe(true);
  });

  it('reports the chosen row, taps, and closes', () => {
    rowFor('Share').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.chosen).toEqual(['share']);
    expect(haptics.selection).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('treats a cancel row as a choice, because the user made one', () => {
    rowFor('Cancel').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.chosen).toEqual(['cancel']);
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('ignores a disabled row entirely', () => {
    rowFor('Locked').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.chosen).toEqual([]);
    expect(haptics.selection).not.toHaveBeenCalled();
    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('shows the title and message when it has them', () => {
    fixture.componentInstance.title.set('Delete file?');
    fixture.componentInstance.message.set('This cannot be undone.');
    fixture.detectChanges();

    expect(text('.wr-action-sheet__title')).toBe('Delete file?');
    expect(text('.wr-action-sheet__message')).toBe('This cannot be undone.');
  });

  it('names the dialog even with no visible title', () => {
    // The drawer opens as an `aria-modal` dialog, and a dialog with no
    // accessible name is announced as nothing at all.
    expect(document.querySelector('.wr-action-sheet__header')).toBeNull();
    expect(text('.wr-action-sheet__sr-only')).toBeTruthy();
  });

  it('drops the fallback name once there is a real title', () => {
    fixture.componentInstance.title.set('Delete file?');
    fixture.detectChanges();

    expect(document.querySelector('.wr-action-sheet__sr-only')).toBeNull();
  });

  it('renders nothing while closed', () => {
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();

    expect(rows()).toEqual([]);
  });
});

describe('WrActionSheet under a localized catalog', () => {
  it('takes its fallback name from the catalog', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideWrOverlay(),
        { provide: WrHaptics, useValue: { selection: vi.fn(), impact: vi.fn() } },
        provideWrI18n({ defaultLocale: 'ru', availableLocales: ['ru'] }),
        provideWrI18nStaticLoader({ ru: wrRu }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const fallback = document.querySelector('.wr-action-sheet__sr-only')!;
    expect(fallback.textContent.trim()).not.toBe('Actions');
    expect(fallback.textContent.trim().length).toBeGreaterThan(0);

    fixture.destroy();
  });
});
