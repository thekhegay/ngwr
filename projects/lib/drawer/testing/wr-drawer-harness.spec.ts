import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrButton } from 'ngwr/button';
import { WrButtonHarness } from 'ngwr/button/testing';
import {
  WrDrawer,
  WrDrawerClose,
  WrDrawerContent,
  WrDrawerFooter,
  WrDrawerManager,
  type WrDrawerOptions,
  type WrDrawerPosition,
  type WrDrawerRef,
  WrDrawerTitle,
} from 'ngwr/drawer';
import { provideWrOverlay } from 'ngwr/overlay';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrDrawerHarness } from './wr-drawer-harness';

/**
 * jsdom lays nothing out, so every element measures 0x0 and the CDK's
 * `InteractivityChecker` reads them all as invisible — the focus trap then finds
 * nothing tabbable and never moves focus. Handing elements a box is what lets the
 * focus assertions test the harness rather than the DOM stub.
 */
const stubLayout = (): void => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    new DOMRect(0, 0, 320, 480),
  ] as unknown as DOMRectList);
};

@Component({
  imports: [WrButton, WrDrawer, WrDrawerClose, WrDrawerContent, WrDrawerFooter, WrDrawerTitle],
  template: `
    <wr-drawer
      [(open)]="open"
      [position]="position()"
      [rounded]="rounded()"
      [showHandle]="showHandle()"
      [safeArea]="safeArea()"
      [closable]="closable()"
      [closeLabel]="closeLabel()"
      [hasBackdrop]="hasBackdrop()"
      [closeOnEscape]="closeOnEscape()"
      [closeOnBackdropClick]="closeOnBackdropClick()"
    >
      @if (showTitle()) {
        <h2 wrDrawerTitle>Filters</h2>
      }
      <div wrDrawerContent>Two of nine selected.</div>
      <div wrDrawerFooter>
        <button type="button" wr-btn wrDrawerClose>Cancel</button>
        <button type="button" wr-btn color="primary">Apply</button>
      </div>
    </wr-drawer>
  `,
})
class Host {
  readonly open = signal(false);
  readonly showTitle = signal(true);
  readonly position = signal<WrDrawerPosition>('right');
  readonly rounded = signal(false);
  readonly showHandle = signal(false);
  readonly safeArea = signal(false);
  readonly closable = signal(true);
  readonly closeLabel = signal<string | null>(null);
  readonly hasBackdrop = signal(true);
  readonly closeOnEscape = signal(true);
  readonly closeOnBackdropClick = signal(true);
}

@Component({
  imports: [WrButton, WrDrawerClose, WrDrawerContent, WrDrawerTitle],
  template: `
    <h2 wrDrawerTitle>Share</h2>
    <div wrDrawerContent>Anyone with the link can view.</div>
    <button type="button" wr-btn wrDrawerClose>Done</button>
  `,
})
class SharePanel {}

@Component({ template: '' })
class ServiceHost {
  readonly drawers = inject(WrDrawerManager);
}

@Component({
  imports: [WrDrawer, WrDrawerContent, WrDrawerTitle],
  template: `
    <wr-drawer [(open)]="open" position="left" rounded showHandle>
      <h2 wrDrawerTitle>Filters</h2>
      <div wrDrawerContent>Two of nine selected.</div>
    </wr-drawer>
  `,
})
class MixedHost {
  readonly open = signal(false);
  readonly drawers = inject(WrDrawerManager);
}

/**
 * The declarative flavour. `<wr-drawer>` leaves nothing but a `display: none` host
 * in the template — the panel is a template portal in the overlay container — so
 * the harness comes from the DOCUMENT ROOT here too, not from the fixture loader.
 * `provideWrOverlay()` keeps this file's container out of the next one's.
 */
describe('WrDrawerHarness — <wr-drawer>', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let rootLoader: ReturnType<typeof TestbedHarnessEnvironment.documentRootLoader>;

  const open = async (): Promise<WrDrawerHarness> => {
    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    return rootLoader.getHarness(WrDrawerHarness);
  };

  beforeEach(() => {
    stubLayout();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it('has no panel to find until the drawer is opened', async () => {
    expect(await rootLoader.getHarnessOrNull(WrDrawerHarness)).toBeNull();

    const drawer = await open();

    expect(await drawer.isOpen()).toBe(true);
    expect(await drawer.getTitleText()).toBe('Filters');
    expect(await drawer.getContentText()).toBe('Two of nine selected.');
  });

  it('presents itself as a modal dialog named by its own title', async () => {
    const drawer = await open();

    expect(await drawer.getRole()).toBe('dialog');
    expect(await drawer.isModal()).toBe(true);
    expect(await drawer.isLabelledByTitle()).toBe(true);
  });

  it('stops reporting a title-derived name once the title element is gone', async () => {
    const drawer = await open();
    expect(await drawer.isLabelledByTitle()).toBe(true);

    // The panel keeps the `aria-labelledby` it wrote when it opened, so the id now
    // points at nothing. A dangling reference is not an accessible name, and the
    // harness has to resolve it rather than trust the attribute's presence.
    fixture.componentInstance.showTitle.set(false);
    await fixture.whenStable();

    expect(await drawer.getTitleText()).toBeNull();
    expect(await drawer.isLabelledByTitle()).toBe(false);
  });

  it('reports the edge it is attached to, and which of them are sheets', async () => {
    for (const position of ['left', 'right', 'top', 'bottom'] as const) {
      fixture.componentInstance.position.set(position);
      const drawer = await open();

      expect(await drawer.getPosition()).toBe(position);
      // top/bottom is the axis where the panel spans the viewport and sizes itself
      // by height — the bottom-sheet flavour of the same component.
      expect(await drawer.isSheet()).toBe(position === 'top' || position === 'bottom');

      // The position is baked in when the overlay is created, so a new side needs
      // a fresh open.
      fixture.componentInstance.open.set(false);
      await fixture.whenStable();
    }
  });

  it('reads the bottom-sheet trimmings off the panel', async () => {
    fixture.componentInstance.position.set('bottom');
    fixture.componentInstance.rounded.set(true);
    fixture.componentInstance.showHandle.set(true);
    fixture.componentInstance.safeArea.set(true);

    const sheet = await open();

    expect(await sheet.isSheet()).toBe(true);
    expect(await sheet.isRounded()).toBe(true);
    expect(await sheet.hasHandle()).toBe(true);
    expect(await sheet.hasSafeArea()).toBe(true);
  });

  it('reports a plain side panel as none of those', async () => {
    const drawer = await open();

    const trimmings = [
      await drawer.isSheet(),
      await drawer.isRounded(),
      await drawer.hasHandle(),
      await drawer.hasSafeArea(),
    ];

    expect(trimmings).toEqual([false, false, false, false]);
  });

  it('closes through the built-in dismiss button, and writes back through [(open)]', async () => {
    const drawer = await open();

    expect(await drawer.isClosable()).toBe(true);
    // Plain English with no catalog registered: `t()` hands back the KEY on a miss,
    // so the bug this guards against is a button announced as "drawer.close".
    expect(await drawer.getCloseLabel()).toBe('Close drawer');

    await drawer.close();
    await fixture.whenStable();

    expect(fixture.componentInstance.open()).toBe(false);
    expect(await drawer.isOpen()).toBe(false);
    expect(await rootLoader.getHarnessOrNull(WrDrawerHarness)).toBeNull();
  });

  it('reads a dismiss label the host overrode', async () => {
    fixture.componentInstance.closeLabel.set('Close filters');

    const drawer = await open();

    expect(await drawer.getCloseLabel()).toBe('Close filters');
  });

  it('refuses to close a drawer that opted out of the dismiss button', async () => {
    fixture.componentInstance.closable.set(false);
    const drawer = await open();

    expect(await drawer.isClosable()).toBe(false);
    expect(await drawer.getCloseLabel()).toBeNull();
    await expect(drawer.close()).rejects.toThrow(/closable/);

    // Escape still has to work, or a drawer with no dismiss button is a trap.
    await drawer.sendEscape();
    await fixture.whenStable();

    expect(await drawer.isOpen()).toBe(false);
  });

  it('closes on Escape, and leaves an opt-out drawer open', async () => {
    fixture.componentInstance.closeOnEscape.set(false);
    const stubborn = await open();

    await stubborn.sendEscape();
    await fixture.whenStable();

    expect(await stubborn.isOpen()).toBe(true);

    fixture.componentInstance.open.set(false);
    await fixture.whenStable();
    fixture.componentInstance.closeOnEscape.set(true);

    const normal = await open();
    await normal.sendEscape();
    await fixture.whenStable();

    expect(await normal.isOpen()).toBe(false);
  });

  it('dismisses itself when its own backdrop is clicked', async () => {
    const drawer = await open();
    expect(await drawer.hasBackdrop()).toBe(true);

    await drawer.clickBackdrop();
    await fixture.whenStable();

    expect(fixture.componentInstance.open()).toBe(false);
    expect(await drawer.isOpen()).toBe(false);
  });

  it('keeps the backdrop but survives its clicks when told to', async () => {
    fixture.componentInstance.closeOnBackdropClick.set(false);
    const drawer = await open();

    await drawer.clickBackdrop();
    await fixture.whenStable();

    // The backdrop still has to be there — it is what makes the drawer read as
    // modal — it just must not dismiss.
    expect(await drawer.hasBackdrop()).toBe(true);
    expect(await drawer.isOpen()).toBe(true);
  });

  it('refuses to click a backdrop on a drawer opened without one', async () => {
    fixture.componentInstance.hasBackdrop.set(false);
    const drawer = await open();

    expect(await drawer.hasBackdrop()).toBe(false);
    await expect(drawer.clickBackdrop()).rejects.toThrow(/hasBackdrop/);
    expect(await drawer.isOpen()).toBe(true);
  });

  it('sees focus land inside the panel', async () => {
    const drawer = await open();

    expect(await drawer.isFocusTrapped()).toBe(true);
  });

  it("reaches the consumer's own components inside the panel", async () => {
    const drawer = await open();

    // The point of a content container: the button harness resolves INSIDE this
    // drawer, so a second drawer's "Cancel" cannot be picked up by mistake.
    expect(await (await drawer.getHarness(WrButtonHarness.with({ text: 'Apply' }))).getColor()).toBe('primary');

    await (await drawer.getHarness(WrButtonHarness.with({ text: 'Cancel' }))).click();
    await fixture.whenStable();

    // `[wrDrawerClose]` clears the component's `open` model rather than closing a
    // ref — the element flavour has no result to carry.
    expect(fixture.componentInstance.open()).toBe(false);
    expect(await drawer.isOpen()).toBe(false);
  });
});

/**
 * The imperative flavour. `WrDrawerManager` attaches the caller's component
 * straight into the overlay pane, so the panel classes, the role and the dismiss
 * button all land on the pane itself — one level shallower than `<wr-drawer>`, and
 * the same harness has to answer either way.
 */
describe('WrDrawerHarness — WrDrawerManager.open()', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<ServiceHost>>;
  let rootLoader: ReturnType<typeof TestbedHarnessEnvironment.documentRootLoader>;
  const opened: WrDrawerRef<SharePanel>[] = [];

  const open = async (options: WrDrawerOptions = {}): Promise<WrDrawerHarness> => {
    opened.push(fixture.componentInstance.drawers.open(SharePanel, options));
    await fixture.whenStable();
    return rootLoader.getHarness(WrDrawerHarness);
  };

  beforeEach(() => {
    stubLayout();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(ServiceHost);
    fixture.detectChanges();
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  });

  afterEach(() => {
    // A service-opened drawer outlives the fixture — nothing in the template owns
    // it — so an undismissed one would leak into the next spec.
    for (const ref of opened) ref.close();
    opened.length = 0;
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it("reads the title and content out of the caller's own component", async () => {
    const drawer = await open();

    expect(await drawer.getTitleText()).toBe('Share');
    expect(await drawer.getContentText()).toBe('Anyone with the link can view.');
    expect(await drawer.getPosition()).toBe('right');
    expect(await drawer.getRole()).toBe('dialog');
    expect(await drawer.isModal()).toBe(true);
    expect(await drawer.isLabelledByTitle()).toBe(true);
  });

  it('reads the sheet presentation out of the open options', async () => {
    const sheet = await open({ position: 'bottom', rounded: true, safeArea: true });

    expect(await sheet.getPosition()).toBe('bottom');
    expect(await sheet.isSheet()).toBe(true);
    expect(await sheet.isRounded()).toBe(true);
    expect(await sheet.hasSafeArea()).toBe(true);
    // Not an oversight: the grab handle lives in `<wr-drawer>`'s own wrapper markup,
    // which this path replaces with the caller's component, so `showHandle` is not
    // even an option here.
    expect(await sheet.hasHandle()).toBe(false);
  });

  it("closes through the dismiss button the manager appends, settling the caller's ref", async () => {
    const drawer = await open();
    const [ref] = opened;

    expect(await drawer.isClosable()).toBe(true);
    expect(await drawer.getCloseLabel()).toBe('Close drawer');

    await drawer.close();
    await fixture.whenStable();

    await expect(ref.awaitClose()).resolves.toBeUndefined();
    expect(await drawer.isOpen()).toBe(false);
    expect(await rootLoader.getHarnessOrNull(WrDrawerHarness)).toBeNull();
  });

  it('reads a dismiss label the caller overrode', async () => {
    const drawer = await open({ closeLabel: 'Close sharing' });

    expect(await drawer.getCloseLabel()).toBe('Close sharing');
  });

  it('refuses to close a drawer opened closable: false', async () => {
    const drawer = await open({ closable: false });

    expect(await drawer.isClosable()).toBe(false);
    await expect(drawer.close()).rejects.toThrow(/closable/);

    await drawer.sendEscape();
    await fixture.whenStable();

    expect(await drawer.isOpen()).toBe(false);
  });

  it('leaves a drawer opened closeOnEscape: false open', async () => {
    const drawer = await open({ closeOnEscape: false });

    await drawer.sendEscape();
    await fixture.whenStable();

    expect(await drawer.isOpen()).toBe(true);
  });

  it('dismisses itself when its own backdrop is clicked', async () => {
    const drawer = await open();
    expect(await drawer.hasBackdrop()).toBe(true);

    await drawer.clickBackdrop();
    await fixture.whenStable();

    expect(await drawer.isOpen()).toBe(false);
  });

  it('survives a backdrop click when opened closeOnBackdropClick: false', async () => {
    const drawer = await open({ closeOnBackdropClick: false });

    await drawer.clickBackdrop();
    await fixture.whenStable();

    expect(await drawer.isOpen()).toBe(true);
  });

  it('refuses to click a backdrop on a drawer opened hasBackdrop: false', async () => {
    const drawer = await open({ hasBackdrop: false });

    expect(await drawer.hasBackdrop()).toBe(false);
    await expect(drawer.clickBackdrop()).rejects.toThrow(/hasBackdrop/);
  });

  it('sees focus land inside the panel', async () => {
    const drawer = await open();

    expect(await drawer.isFocusTrapped()).toBe(true);
  });

  it("reaches the content component's own close affordance", async () => {
    const drawer = await open();
    const [ref] = opened;

    await (await drawer.getHarness(WrButtonHarness.with({ text: 'Done' }))).click();
    await fixture.whenStable();

    // Here `[wrDrawerClose]` closes the REF — the same button markup, a different
    // owner, which is the one thing the two flavours do not share.
    await expect(ref.awaitClose()).resolves.toBeUndefined();
    expect(await drawer.isOpen()).toBe(false);
  });
});

/**
 * Both flavours open at once, which is the case a harness gets wrong quietly. The
 * panels and their backdrops are siblings in ONE shared container, so anything read
 * by class off the document — a title, a side modifier, "is there a backdrop" —
 * answers with whichever drawer got there first rather than with the drawer asked.
 */
describe('WrDrawerHarness — two drawers open at once', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<MixedHost>>;
  let rootLoader: ReturnType<typeof TestbedHarnessEnvironment.documentRootLoader>;
  const opened: WrDrawerRef<SharePanel>[] = [];

  /** Filters (element, left, rounded, handle, backdrop), then Share (service, bottom, none). */
  const openBoth = async (): Promise<[WrDrawerHarness, WrDrawerHarness]> => {
    fixture.componentInstance.open.set(true);
    opened.push(fixture.componentInstance.drawers.open(SharePanel, { position: 'bottom', hasBackdrop: false }));
    await fixture.whenStable();

    return [
      await rootLoader.getHarness(WrDrawerHarness.with({ title: 'Filters' })),
      await rootLoader.getHarness(WrDrawerHarness.with({ title: 'Share' })),
    ];
  };

  beforeEach(() => {
    stubLayout();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrOverlay()] });
    fixture = TestBed.createComponent(MixedHost);
    fixture.detectChanges();
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
  });

  afterEach(() => {
    for (const ref of opened) ref.close();
    opened.length = 0;
    vi.restoreAllMocks();
    fixture.destroy();
  });

  it('answers per drawer, backdrop included', async () => {
    const [filters, share] = await openBoth();

    expect((await rootLoader.getAllHarnesses(WrDrawerHarness)).length).toBe(2);

    expect(await filters.getPosition()).toBe('left');
    expect(await share.getPosition()).toBe('bottom');
    expect(await filters.isSheet()).toBe(false);
    expect(await share.isSheet()).toBe(true);
    expect(await filters.getContentText()).toBe('Two of nine selected.');
    expect(await share.getContentText()).toBe('Anyone with the link can view.');

    // The one that breaks silently: a bare `.wr-drawer-backdrop` query finds the
    // element drawer's backdrop and reports it for BOTH, so the sheet looks modal
    // when it is not.
    expect(await filters.hasBackdrop()).toBe(true);
    expect(await share.hasBackdrop()).toBe(false);

    // Same trap one level in: both flavours carry `.wr-drawer__panel` and the
    // handle is a plain class in the shared container, so a query that leaves the
    // pane reports the OTHER drawer's trimmings — the service sheet would claim a
    // grab handle it cannot even be given.
    expect(await filters.isRounded()).toBe(true);
    expect(await share.isRounded()).toBe(false);
    expect(await filters.hasHandle()).toBe(true);
    expect(await share.hasHandle()).toBe(false);
  });

  it('narrows by content and by edge', async () => {
    await openBoth();

    const byContent = await rootLoader.getHarness(WrDrawerHarness.with({ content: /nine selected/ }));
    const byPosition = await rootLoader.getHarness(WrDrawerHarness.with({ position: 'bottom' }));

    expect(await byContent.getTitleText()).toBe('Filters');
    expect(await byPosition.getTitleText()).toBe('Share');
  });

  it('closes the drawer it was given and leaves the other standing', async () => {
    const [filters, share] = await openBoth();

    await filters.close();
    await fixture.whenStable();

    expect(await filters.isOpen()).toBe(false);
    expect(await share.isOpen()).toBe(true);
    // …and the closed drawer's backdrop went with it, rather than being inherited
    // by the drawer that is still up.
    expect(await share.hasBackdrop()).toBe(false);
    expect((await rootLoader.getAllHarnesses(WrDrawerHarness)).length).toBe(1);
  });
});
