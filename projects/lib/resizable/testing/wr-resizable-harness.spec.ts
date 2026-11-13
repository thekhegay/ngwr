import { Directionality } from '@angular/cdk/bidi';
import type { Direction } from '@angular/cdk/bidi';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { WrResizable, type WrResizableEdge, type WrResizableLimit } from 'ngwr/resizable';
import { afterEach, describe, expect, it } from 'vitest';

import { WrResizableHarness } from './wr-resizable-harness';

@Component({
  imports: [WrResizable],
  template: `
    <div class="parent">
      <aside
        wrResizable
        [edge]="edge()"
        [(size)]="size"
        [minSize]="min()"
        [maxSize]="max()"
        [defaultSize]="fallback()"
        [step]="step()"
        [collapsed]="collapsed()"
        [disabled]="disabled()"
        [resizeLabel]="label()"
        (sizeChange)="changes.push($event)"
      >
        <div wrResizable edge="bottom" resizeLabel="Inner" [size]="80">nested</div>
      </aside>
    </div>
  `,
})
class Host {
  readonly edge = signal<WrResizableEdge>('end');
  readonly size = signal<number | null>(320);
  readonly min = signal<WrResizableLimit | null>(200);
  readonly max = signal<WrResizableLimit | null>(600);
  readonly fallback = signal<number | null>(null);
  readonly step = signal(10);
  readonly collapsed = signal(false);
  readonly disabled = signal(false);
  readonly label = signal<string | null>(null);
  readonly changes: (number | null)[] = [];
}

/**
 * Every write goes through the keys on the handle, and every size is read back
 * off the page: jsdom lays nothing out, so a size the directive did not write
 * is a size nobody can see here.
 */
describe('WrResizableHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const mount = async (direction: Direction = 'ltr'): Promise<WrResizableHarness> => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: Directionality, useValue: { value: direction, change: new Subject<Direction>() } }],
    });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    return TestbedHarnessEnvironment.loader(fixture).getHarness(WrResizableHarness.with({ label: 'Resize' }));
  };

  afterEach(() => fixture.destroy());

  it('reads the size, the limits, the edge and the label of its own handle', async () => {
    const panel = await mount();

    // The nested resizable's handle comes first in the document; these are the outer one's.
    expect([
      await panel.getSize(),
      await panel.getAnnouncedSize(),
      await panel.getMinSize(),
      await panel.getMaxSize(),
      await panel.getEdge(),
      await panel.getLabel(),
    ]).toEqual([320, 320, 200, 600, 'end', 'Resize']);
  });

  it('answers null for a size nobody set, and for a maximum there is none of', async () => {
    const panel = await mount();
    fixture.componentInstance.size.set(null);
    fixture.componentInstance.max.set(null);
    await fixture.whenStable();

    expect([await panel.getSize(), await panel.getMaxSize()]).toEqual([null, null]);
    await expect(panel.resizeToMax()).rejects.toThrow(/announces no maximum/);
  });

  it.each([
    ['end', 'ltr'],
    ['end', 'rtl'],
    ['start', 'ltr'],
    ['start', 'rtl'],
    ['top', 'ltr'],
    ['bottom', 'rtl'],
  ] as const)('grows and shrinks from the %s edge under %s', async (edge, direction) => {
    const panel = await mount(direction);
    fixture.componentInstance.edge.set(edge);
    await fixture.whenStable();

    await panel.resizeBy(40);
    expect([await panel.getSize(), fixture.componentInstance.size()]).toEqual([360, 360]);

    await panel.resizeBy(-70);
    expect([await panel.getSize(), fixture.componentInstance.size()]).toEqual([290, 290]);
  });

  it('presses once per step and nothing more when the first guess is right', async () => {
    const panel = await mount();

    await panel.resizeBy(30);

    expect(fixture.componentInstance.changes).toEqual([330, 340, 350]);
  });

  it('walks away from a limit under rtl, where the first guess is clamped', async () => {
    const panel = await mount('rtl');
    fixture.componentInstance.size.set(600);
    await fixture.whenStable();

    await panel.resizeBy(-20);

    expect(await panel.getSize()).toBe(580);
  });

  it('says where it stopped when a limit is in the way', async () => {
    const panel = await mount();

    await expect(panel.resizeBy(400)).rejects.toThrow(/stopped at 600, from 320/);
    expect(await panel.getSize()).toBe(600);

    // Already at the limit: both arrows are tried, and the wrong step is put back.
    await expect(panel.resizeBy(10)).rejects.toThrow(/stopped at 600, from 600/);
    expect(await panel.getSize()).toBe(600);
  });

  it('refuses a distance that is not a multiple of the step', async () => {
    const panel = await mount();

    await expect(panel.resizeBy(25)).rejects.toThrow(/stopped at 350, from 320/);
  });

  it('goes to either limit, and back to where it started', async () => {
    const panel = await mount();

    await panel.resizeToMax();
    expect(await panel.getSize()).toBe(600);
    await panel.resizeToMin();
    expect(await panel.getSize()).toBe(200);

    await panel.reset();
    expect(await panel.getSize()).toBe(320);

    fixture.componentInstance.fallback.set(400);
    await fixture.whenStable();
    await panel.reset();
    expect(await panel.getSize()).toBe(400);
  });

  it('reports a disabled element and refuses to resize it', async () => {
    const panel = await mount();
    expect([await panel.isDisabled(), await panel.isHandleActive()]).toEqual([false, true]);

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect([await panel.isDisabled(), await panel.isHandleActive()]).toEqual([true, false]);
    await expect(panel.resizeBy(10)).rejects.toThrow(/stopped at 320, from 320/);
    expect(fixture.componentInstance.changes).toEqual([]);
  });

  it('reports a collapsed element: zero wide, its size kept, its handle inert', async () => {
    const panel = await mount();
    fixture.componentInstance.collapsed.set(true);
    await fixture.whenStable();

    expect([await panel.isCollapsed(), await panel.getSize(), await panel.isHandleActive()]).toEqual([true, 0, false]);
    expect(fixture.componentInstance.size()).toBe(320);
  });

  it('moves focus to its own handle and reports it', async () => {
    const panel = await mount();
    expect(await panel.isFocused()).toBe(false);

    await panel.focus();

    expect(await panel.isFocused()).toBe(true);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Resize');
  });

  it('narrows by label, edge, disabled and collapsed', async () => {
    await mount();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const labels = async (filters: Parameters<typeof WrResizableHarness.with>[0]): Promise<(string | null)[]> =>
      Promise.all((await loader.getAllHarnesses(WrResizableHarness.with(filters))).map(each => each.getLabel()));

    // The outer harness reads its own handle, the last one: both elements answer.
    expect(await labels({})).toEqual(['Resize', 'Inner']);
    expect(await labels({ edge: 'bottom' })).toEqual(['Inner']);
    expect(await labels({ label: /^Res/ })).toEqual(['Resize']);
    expect(await labels({ disabled: true })).toEqual([]);
    expect(await labels({ collapsed: false })).toEqual(['Resize', 'Inner']);
  });
});
