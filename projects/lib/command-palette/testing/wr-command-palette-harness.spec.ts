import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCommandPalette, type WrCommandItem } from 'ngwr/command-palette';
import { provideWrIcons, svgIcon } from 'ngwr/icon';
import { WrPlatform } from 'ngwr/platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrCommandPaletteHarness } from './wr-command-palette-harness';

/**
 * The `<title>` earns its place: `WrIcon` writes a registered icon in with
 * `innerHTML`, so that text joins the row's `textContent` — which is what makes
 * `getLabel()` reading the label element rather than the host observable. A row
 * with an icon would otherwise answer "Folder icon Open file".
 */
const FOLDER_SVG = '<svg viewBox="0 0 24 24"><title>Folder icon</title><path d="M3 6h6l2 2h10v10H3z" /></svg>';

@Component({
  imports: [WrCommandPalette],
  template: `
    <wr-command-palette
      paletteLabel="Commands"
      placeholder="Search commands"
      emptyText="Nothing matches"
      [items]="items()"
      [(open)]="open"
      [responsive]="responsive()"
      (picked)="picked.push($event.id)"
    />
  `,
})
class Host {
  readonly ran: string[] = [];
  readonly picked: string[] = [];
  readonly open = signal(false);
  readonly responsive = signal<boolean | undefined>(undefined);

  /**
   * Two groups, INTERLEAVED in source order on purpose: the palette buckets by
   * group as each first appears, so the screen reads Open, Save, Undo while this
   * list reads Open, Undo, Save. A harness that answered in source order would
   * disagree with every index the component counts.
   */
  readonly items = signal<readonly WrCommandItem[]>([
    {
      id: 'open',
      label: 'Open file',
      group: 'File',
      description: 'From your recent projects',
      shortcut: '⌘O',
      icon: 'folder',
    },
    { id: 'undo', label: 'Undo', group: 'Edit', keywords: ['revert'] },
    { id: 'save', label: 'Save file', group: 'File', action: () => this.ran.push('save') },
  ]);
}

@Component({
  imports: [WrCommandPalette],
  template: `
    <wr-command-palette paletteLabel="Files" [items]="fileItems" [(open)]="fileOpen" />
    <wr-command-palette paletteLabel="Mail" [items]="mailItems" [(open)]="mailOpen" />
  `,
})
class TwoHost {
  readonly fileOpen = signal(false);
  readonly mailOpen = signal(false);
  readonly fileItems: readonly WrCommandItem[] = [
    { id: 'open', label: 'Open file', group: 'File' },
    { id: 'save', label: 'Save file', group: 'File' },
  ];
  readonly mailItems: readonly WrCommandItem[] = [{ id: 'compose', label: 'Compose mail', group: 'Mail' }];
}

/** A palette the consumer drives entirely themselves — nothing is bound to a chord. */
@Component({
  imports: [WrCommandPalette],
  template: `<wr-command-palette [trigger]="null" [items]="items" [(open)]="open" />`,
})
class UntriggeredHost {
  readonly open = signal(false);
  readonly items: readonly WrCommandItem[] = [{ id: 'open', label: 'Open file' }];
}

/** A palette on the default `mod+k`, with nothing else configured. */
@Component({
  imports: [WrCommandPalette],
  template: `<wr-command-palette [items]="items" [(open)]="open" />`,
})
class PlainHost {
  readonly open = signal(false);
  readonly items: readonly WrCommandItem[] = [{ id: 'open', label: 'Open file' }];
}

/** A palette on a chord of its own, which `open()` cannot guess. */
@Component({
  imports: [WrCommandPalette],
  template: `<wr-command-palette trigger="ctrl+shift+p" [items]="items" [(open)]="open" />`,
})
class CustomTriggerHost {
  readonly open = signal(false);
  readonly items: readonly WrCommandItem[] = [{ id: 'open', label: 'Open file' }];
}

/**
 * Unlike every other overlay harness in the library, this spec provides no
 * `provideWrOverlay()`: the palette portals nothing. Its whole `role="dialog"`
 * renders inside `<wr-command-palette>`, so there is no shared container to keep
 * out of the next file — and host-scoped queries are all the isolation two
 * palettes need.
 *
 * What DOES leak across files here is the trigger: `WrHotkey` binds `mod+k` on the
 * document, and only the fixture being destroyed takes the listener down again. So
 * every `describe` destroys its fixture.
 */
describe('WrCommandPaletteHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    // jsdom implements no `scrollIntoView` AT ALL, and the palette calls it to keep
    // the highlighted row on screen — so every arrow key would throw. Teaching the
    // prototype about it here is what the component's own spec does, and it keeps a
    // test-environment guard out of production code.
    Element.prototype.scrollIntoView = (): undefined => undefined;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrIcons([svgIcon('folder', FOLDER_SVG)])] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    // `stubGlobal` is not undone on its own; a narrow viewport left behind would
    // make the NEXT file's overlays present as sheets.
    vi.unstubAllGlobals();
  });

  it('opens on its global hotkey and closes on Escape', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    expect(await palette.isOpen()).toBe(false);

    await palette.open();

    expect(await palette.isOpen()).toBe(true);
    expect(fixture.componentInstance.open()).toBe(true);
    expect(await palette.getRole()).toBe('dialog');
    expect(await palette.isModal()).toBe(true);
    expect(await palette.getLabel()).toBe('Commands');

    await palette.close();

    expect(await palette.isOpen()).toBe(false);
    expect(fixture.componentInstance.open()).toBe(false);
    // Everything the dialog carried went with it, names included.
    expect(await palette.getRole()).toBeNull();
    expect(await palette.isModal()).toBe(false);
    expect(await palette.getLabel()).toBeNull();
  });

  it('toggles on the trigger chord', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);

    await palette.pressTrigger();
    expect(await palette.isOpen()).toBe(true);

    await palette.pressTrigger();
    expect(await palette.isOpen()).toBe(false);
  });

  it('dismisses on a press outside the panel', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    await palette.clickBackdrop();

    expect(await palette.isOpen()).toBe(false);
  });

  it('refuses to read a palette that is not showing', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);

    // A silent `[]` / `''` here becomes a confusing failure three lines later.
    await expect(palette.getItems()).rejects.toThrow(/palette is closed/);
    await expect(palette.getGroups()).rejects.toThrow(/palette is closed/);
    await expect(palette.getQuery()).rejects.toThrow(/palette is closed/);
    await expect(palette.getPlaceholder()).rejects.toThrow(/palette is closed/);
    await expect(palette.setQuery('file')).rejects.toThrow(/palette is closed/);
    await expect(palette.getEmptyText()).rejects.toThrow(/palette is closed/);
    await expect(palette.clickBackdrop()).rejects.toThrow(/palette is closed/);
    await expect(palette.moveToNextItem()).rejects.toThrow(/palette is closed/);
    await expect(palette.moveToPreviousItem()).rejects.toThrow(/palette is closed/);
    await expect(palette.moveToFirstItem()).rejects.toThrow(/palette is closed/);
    await expect(palette.moveToLastItem()).rejects.toThrow(/palette is closed/);
    await expect(palette.runActiveItem()).rejects.toThrow(/palette is closed/);
    await expect(palette.runItem({ text: 'Undo' })).rejects.toThrow(/palette is closed/);
    await expect(palette.isSearchWiredToList()).rejects.toThrow(/palette is closed/);
    await expect(palette.isActiveItemAnnounced()).rejects.toThrow(/palette is closed/);
    await expect(palette.focus()).rejects.toThrow(/palette is closed/);
    await expect(palette.blur()).rejects.toThrow(/palette is closed/);
    await expect(palette.isSearchInputFocused()).rejects.toThrow(/palette is closed/);

    // The readers a spec uses to ASK whether it is showing answer instead of throwing.
    expect(await palette.isOpen()).toBe(false);
    expect(await palette.isPresentedAsSheet()).toBe(false);
  });

  it('groups the commands in the order the groups first appear', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    expect(await palette.getItemLabels()).toEqual(['Open file', 'Save file', 'Undo']);
    expect(await palette.getGroupTitles()).toEqual(['File', 'Edit']);

    const [file, edit] = await palette.getGroups();
    expect(await file.getRole()).toBe('group');
    expect(await file.isLabelledByTitle()).toBe(true);
    expect(await file.getItemLabels()).toEqual(['Open file', 'Save file']);
    expect(await edit.getItemLabels()).toEqual(['Undo']);

    // The highlight starts on the first row, which is this bucket's.
    expect(await file.getItems({ active: true })).toHaveLength(1);
    expect(await edit.getItems({ active: true })).toHaveLength(0);
  });

  it('narrows a bucket by its heading', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    const exact = await palette.getGroups({ title: 'File' });
    const tested = await palette.getGroups({ title: /^E/ });

    expect(await Promise.all(exact.map(group => group.getItemLabels()))).toEqual([['Open file', 'Save file']]);
    expect(await Promise.all(tested.map(group => group.getTitle()))).toEqual(['Edit']);
  });

  it('reports the ungrouped bucket as the one ARIA has a rule for', async () => {
    fixture.componentInstance.items.set([
      { id: 'plain', label: 'No group' },
      { id: 'beta', label: 'Beta', group: 'Greek' },
    ]);
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    expect(await palette.getGroupTitles()).toEqual([null, 'Greek']);

    // A listbox may own only `option` and `group` children, so the untitled bucket
    // steps out of the tree and hands its rows to the listbox directly.
    const [bare, greek] = await palette.getGroups();
    expect(await bare.getRole()).toBe('none');
    expect(await bare.isLabelledByTitle()).toBe(false);
    expect(await bare.getItemLabels()).toEqual(['No group']);
    expect(await greek.getRole()).toBe('group');
    expect(await greek.isLabelledByTitle()).toBe(true);
  });

  it('wires the search box to the list it controls', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    expect(await palette.isSearchWiredToList()).toBe(true);
    expect(await palette.getPlaceholder()).toBe('Search commands');
    expect(await palette.getQuery()).toBe('');
  });

  it('starts on the first command and announces it', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    expect(await palette.getActiveItemIndex()).toBe(0);
    expect(await palette.getActiveItem()).not.toBeNull();
    expect(await palette.getActiveItemLabel()).toBe('Open file');
    expect(await palette.isActiveItemAnnounced()).toBe(true);

    const [first] = await palette.getItems();
    expect(await first.getRole()).toBe('option');
    expect(await first.isActive()).toBe(true);
  });

  it('answers from the ARIA state rather than from the paint', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    const [first] = await palette.getItems();
    const [dialog] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="dialog"]'));
    const [row] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.wr-command-palette__option'));

    // Both attributes are struck out of the DOM by hand because no input produces
    // their absence: `aria-modal` is static, and the `aria-selected` binding only
    // rewrites when its own value changes, so the edit sticks. Without it, a harness
    // that answered `isModal()` from "a dialog exists" or `isActive()` from the
    // `--active` class — painted from the very same predicate — would agree with
    // this spec everywhere, and dropping either attribute from the template would
    // break no test.
    dialog.removeAttribute('aria-modal');
    row.removeAttribute('aria-selected');

    expect(await palette.isOpen()).toBe(true);
    expect(await palette.isModal()).toBe(false);

    expect(await first.isActive()).toBe(false);
    expect(await palette.getActiveItem()).toBeNull();
    expect(await palette.getActiveItemIndex()).toBe(-1);
    // The highlight is still PAINTED, which is what makes the attribute the thing
    // worth reading — and the search box still points at a row that no longer says
    // it is selected, so the pair no longer agrees.
    expect(row.classList.contains('wr-command-palette__option--active')).toBe(true);
    expect(await palette.isActiveItemAnnounced()).toBe(false);
  });

  it('walks the highlight in rendered order, and wraps', async () => {
    // The bug this stands for: navigation once used the flat SOURCE order while the
    // template rendered the grouped order, so one ArrowDown jumped the highlight
    // from the first row to the THIRD.
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    await palette.moveToNextItem();
    expect(await palette.getActiveItemIndex()).toBe(1);
    expect(await palette.getActiveItemLabel()).toBe('Save file');
    expect(await palette.isActiveItemAnnounced()).toBe(true);

    await palette.moveToNextItem();
    expect(await palette.getActiveItemLabel()).toBe('Undo');

    await palette.moveToNextItem();
    expect(await palette.getActiveItemIndex()).toBe(0);

    await palette.moveToPreviousItem();
    expect(await palette.getActiveItemIndex()).toBe(2);
  });

  it('jumps to the ends of the list', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    await palette.moveToLastItem();
    expect(await palette.getActiveItemLabel()).toBe('Undo');

    await palette.moveToFirstItem();
    expect(await palette.getActiveItemLabel()).toBe('Open file');
  });

  it('follows the pointer as well as the keyboard', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    const [, , undo] = await palette.getItems();
    await undo.hover();

    expect(await palette.getActiveItemIndex()).toBe(2);
    expect(await palette.isActiveItemAnnounced()).toBe(true);
  });

  it('filters on the label, the description, the group and the keywords', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    await palette.setQuery('recent');
    expect(await palette.getItemLabels()).toEqual(['Open file']);

    await palette.setQuery('edit');
    expect(await palette.getItemLabels()).toEqual(['Undo']);

    await palette.setQuery('revert');
    expect(await palette.getItemLabels()).toEqual(['Undo']);

    await palette.setQuery('file');
    expect(await palette.getItemLabels()).toEqual(['Open file', 'Save file']);
    expect(await palette.getQuery()).toBe('file');
  });

  it('sends the highlight back to the top on every keystroke', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    await palette.moveToLastItem();
    expect(await palette.getActiveItemIndex()).toBe(2);

    await palette.setQuery('file');

    expect(await palette.getActiveItemIndex()).toBe(0);
    expect(await palette.isActiveItemAnnounced()).toBe(true);
  });

  it('reports the empty state, and refuses to run nothing', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    await palette.setQuery('zzzz');

    expect(await palette.getItemLabels()).toEqual([]);
    expect(await palette.getGroupTitles()).toEqual([]);
    expect(await palette.getEmptyText()).toBe('Nothing matches');
    expect(await palette.getActiveItem()).toBeNull();
    expect(await palette.getActiveItemLabel()).toBeNull();
    expect(await palette.getActiveItemIndex()).toBe(-1);
    // Nothing highlighted, nothing announced: the pair still agrees.
    expect(await palette.isActiveItemAnnounced()).toBe(true);

    await expect(palette.runActiveItem()).rejects.toThrow(/nothing is highlighted/);
    await expect(palette.runItem({ text: 'Undo' })).rejects.toThrow(/the query matches none/);
  });

  it('runs the highlighted command on Enter, action and all', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();
    await palette.moveToNextItem();
    expect(await palette.getActiveItemLabel()).toBe('Save file');

    await palette.runActiveItem();

    expect(fixture.componentInstance.ran).toEqual(['save']);
    expect(fixture.componentInstance.picked).toEqual(['save']);
    // `closeOnPick` is on by default.
    expect(await palette.isOpen()).toBe(false);
  });

  it('runs a command by its label, with the pointer', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    await palette.runItem({ text: 'Undo' });

    expect(fixture.componentInstance.picked).toEqual(['undo']);
    expect(await palette.isOpen()).toBe(false);
  });

  it('says what it was offering when no command matched', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    await expect(palette.runItem({ text: 'Explode' })).rejects.toThrow(/Open file, Save file, Undo/);
  });

  it("reads a command's description, shortcut and icon", async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    const [openFile, saveFile] = await palette.getItems();

    // Not "Folder icon Open file": the icon's own `<title>` is in the row's text.
    expect(await openFile.getLabel()).toBe('Open file');
    expect(await openFile.getDescription()).toBe('From your recent projects');
    expect(await openFile.getShortcut()).toBe('⌘O');
    expect(await openFile.getIconName()).toBe('folder');
    expect(await openFile.getId()).toBeTruthy();

    // The icon slot is painted for every row, so its presence says nothing.
    expect(await saveFile.getDescription()).toBeNull();
    expect(await saveFile.getShortcut()).toBeNull();
    expect(await saveFile.getIconName()).toBeNull();
  });

  it('narrows the commands by text and by highlight', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();

    const matching = await palette.getItems({ text: /file/ });
    const active = await palette.getItems({ active: true });
    const rest = await palette.getItems({ active: false });

    expect(await Promise.all(matching.map(item => item.getLabel()))).toEqual(['Open file', 'Save file']);
    expect(await Promise.all(active.map(item => item.getLabel()))).toEqual(['Open file']);
    expect(rest).toHaveLength(2);
  });

  it('narrows the palette itself by its state and its name', async () => {
    // A closed palette has no accessible name to match — the element carrying it is
    // not rendered — so the label filter cannot find one before it opens.
    expect(await loader.getAllHarnesses(WrCommandPaletteHarness.with({ label: 'Commands' }))).toHaveLength(0);

    const closed = await loader.getHarness(WrCommandPaletteHarness.with({ open: false }));
    await closed.open();

    const named = await loader.getHarness(WrCommandPaletteHarness.with({ label: 'Commands' }));
    expect(await named.isOpen()).toBe(true);
    expect(await loader.getAllHarnesses(WrCommandPaletteHarness.with({ open: false }))).toHaveLength(0);
  });

  it('puts the caret in the search box as it opens, and puts it back', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);

    await palette.open();
    // The palette focuses its input from a microtask queued in an effect, so the
    // caret lands only once the panel is in the DOM — `whenStable` is what flushes it.
    await fixture.whenStable();
    expect(await palette.isSearchInputFocused()).toBe(true);

    await palette.blur();
    expect(await palette.isSearchInputFocused()).toBe(false);

    await palette.focus();
    expect(await palette.isSearchInputFocused()).toBe(true);
  });

  it('reports the full-screen presentation', async () => {
    // `responsive` never reaches the DOM, and the decision also reads
    // `window.innerWidth` — jsdom's default 1024 is a desktop, so a narrow viewport
    // has to be stubbed in for the sheet branch to be reachable at all.
    vi.stubGlobal('innerWidth', 500);

    const palette = await loader.getHarness(WrCommandPaletteHarness);
    await palette.open();
    expect(await palette.isPresentedAsSheet()).toBe(false);

    fixture.componentInstance.responsive.set(true);
    await fixture.whenStable();
    expect(await palette.isPresentedAsSheet()).toBe(true);

    fixture.componentInstance.responsive.set(false);
    await fixture.whenStable();
    expect(await palette.isPresentedAsSheet()).toBe(false);
  });
});

describe('WrCommandPaletteHarness — two on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    Element.prototype.scrollIntoView = (): undefined => undefined;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it('reads only its own rows while both are open', async () => {
    fixture.componentInstance.fileOpen.set(true);
    fixture.componentInstance.mailOpen.set(true);
    await fixture.whenStable();

    const [files, mail] = await loader.getAllHarnesses(WrCommandPaletteHarness);
    expect(await files.isOpen()).toBe(true);
    expect(await mail.isOpen()).toBe(true);

    // The LIST path.
    expect(await files.getItemLabels()).toEqual(['Open file', 'Save file']);
    expect(await mail.getItemLabels()).toEqual(['Compose mail']);
    expect(await files.getGroupTitles()).toEqual(['File']);
    expect(await mail.getGroupTitles()).toEqual(['Mail']);

    // The SINGLE-ELEMENT path — one dialog, one search box, one highlight each.
    expect(await files.getLabel()).toBe('Files');
    expect(await mail.getLabel()).toBe('Mail');
    expect(await files.isSearchWiredToList()).toBe(true);
    expect(await mail.isSearchWiredToList()).toBe(true);

    await files.setQuery('file');
    await files.moveToLastItem();

    expect(await files.getQuery()).toBe('file');
    expect(await mail.getQuery()).toBe('');
    expect(await files.getActiveItemLabel()).toBe('Save file');
    expect(await mail.getActiveItemLabel()).toBe('Compose mail');
    expect(await files.isActiveItemAnnounced()).toBe(true);
    expect(await mail.isActiveItemAnnounced()).toBe(true);

    // The row ids are per instance, which is the shape a leak would take: one
    // palette announcing the row of the other.
    const [fileRow] = await files.getItems({ active: true });
    const [mailRow] = await mail.getItems({ active: true });
    expect(await fileRow.getId()).not.toBe(await mailRow.getId());

    // And the agreement above has teeth: point the files palette at the mail
    // palette's row — the exact shape a cross-instance leak would take — and it
    // stops agreeing. Written straight into the DOM because no API produces it; the
    // binding only rewrites the attribute when its own value changes, so it stays.
    const [filesInput] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input[role="combobox"]'));
    filesInput.setAttribute('aria-activedescendant', await mailRow.getId());
    expect(await files.isActiveItemAnnounced()).toBe(false);
    expect(await mail.isActiveItemAnnounced()).toBe(true);

    await mail.setQuery('zzz');
    expect(await mail.getEmptyText()).toBeTruthy();
    expect(await files.getEmptyText()).toBeNull();
  });

  it('shares one chord between them, and only the first binding wins it', async () => {
    const [files, mail] = await loader.getAllHarnesses(WrCommandPaletteHarness);

    await files.pressTrigger();

    // The trigger is bound on the DOCUMENT, and the first binding to match a chord
    // calls `preventDefault()`, which stops the rest — so the second palette never
    // sees the chord it is also bound to.
    expect(await files.isOpen()).toBe(true);
    expect(await mail.isOpen()).toBe(false);

    // Which means the second one cannot be opened this way at all: its attempt
    // toggles the FIRST palette on the way past and then reports that nothing moved.
    await expect(mail.pressTrigger()).rejects.toThrow(/another palette is bound to the same chord/);
    expect(await files.isOpen()).toBe(false);
    expect(await mail.isOpen()).toBe(false);
  });
});

describe('WrCommandPaletteHarness — no trigger of its own', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<UntriggeredHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(UntriggeredHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('says that nothing is bound, then reads the palette the host opened', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);

    await expect(palette.open()).rejects.toThrow(/nothing is bound/);

    fixture.componentInstance.open.set(true);
    await fixture.whenStable();

    expect(await palette.isOpen()).toBe(true);
    expect(await palette.getItemLabels()).toEqual(['Open file']);
    // No `paletteLabel`, so the name is the one the i18n catalogue falls back to.
    expect(await palette.getLabel()).toBeTruthy();
  });
});

/**
 * `mod` resolves to Cmd on a Mac and to Ctrl everywhere else, from the user agent —
 * and jsdom's says neither, so every case above reaches the palette through the
 * Ctrl chord. Faking a Mac agent is the only way to exercise the other half of
 * `pressTrigger()`, which is the half a macOS developer runs.
 */
describe('WrCommandPaletteHarness — mod is Cmd on a Mac', () => {
  it('falls back to the Cmd chord when Ctrl moves nothing', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: WrPlatform, useValue: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } }],
    });
    const fixture = TestBed.createComponent(PlainHost);
    fixture.detectChanges();
    const loader = TestbedHarnessEnvironment.loader(fixture);

    const palette = await loader.getHarness(WrCommandPaletteHarness);

    // Ctrl is not `mod` here, so the first half of `pressTrigger()` moves nothing —
    // which is also what proves the faked agent reached the binding.
    await palette.pressHotkey('k', { control: true });
    expect(await palette.isOpen()).toBe(false);

    // `open()` goes on to the Cmd chord and gets in.
    await palette.open();
    expect(await palette.isOpen()).toBe(true);
    expect(fixture.componentInstance.open()).toBe(true);

    fixture.destroy();
  });
});

describe('WrCommandPaletteHarness — a chord of its own', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CustomTriggerHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(CustomTriggerHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('opens on the chord the consumer chose', async () => {
    const palette = await loader.getHarness(WrCommandPaletteHarness);

    // `open()` only knows the default `mod+k`, and says so rather than hanging
    // around waiting for a palette that will never open.
    await expect(palette.open()).rejects.toThrow(/pressHotkey/);

    await palette.pressHotkey('p', { control: true, shift: true });

    expect(await palette.isOpen()).toBe(true);
    expect(fixture.componentInstance.open()).toBe(true);
  });
});
