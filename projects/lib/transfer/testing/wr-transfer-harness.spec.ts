import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrTransfer, type WrTransferItem } from 'ngwr/transfer';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrTransferHarness } from './wr-transfer-harness';
import { WrTransferItemHarness } from './wr-transfer-item-harness';
import { WrTransferPaneHarness } from './wr-transfer-pane-harness';

const ITEMS: readonly WrTransferItem[] = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'delete', label: 'Delete' },
  { value: 'audit', label: 'Audit', disabled: true },
];

@Component({
  imports: [WrTransfer],
  template: `
    <wr-transfer
      sourceTitle="Available"
      targetTitle="Granted"
      [items]="items()"
      [value]="granted()"
      [searchable]="searchable()"
      [disabled]="disabled()"
      (valueChange)="granted.set($event)"
      (touch)="touched = touched + 1"
    />
  `,
})
class Host {
  readonly items = signal<readonly WrTransferItem[]>(ITEMS);
  readonly granted = signal<readonly unknown[]>([]);
  readonly searchable = signal(false);
  readonly disabled = signal(false);
  touched = 0;
}

/** Two transfers on one page, for the filters that have to tell them apart. */
@Component({
  imports: [WrTransfer],
  template: `
    <wr-transfer searchable sourceTitle="Available" targetTitle="Granted" [items]="permissions" [value]="none" />
    <wr-transfer disabled sourceTitle="Regions" targetTitle="Chosen" [items]="regions" [value]="none" />
  `,
})
class PairHost {
  readonly permissions = ITEMS;
  readonly regions: readonly WrTransferItem[] = [
    { value: 'eu', label: 'Berlin' },
    { value: 'us', label: 'Boston' },
  ];
  readonly none: readonly unknown[] = [];
}

/** The labels of a pane query, so the filter assertions read as lists of rows. */
const labelsOf = async (query: Promise<WrTransferItemHarness[]>): Promise<string[]> => {
  const items = await query;
  return Promise.all(items.map(item => item.getLabel()));
};

/**
 * Used exactly as a consumer would: through the loader, reading the rendered DOM.
 *
 * The trap this component sets is that a pane has two different answers to "what is
 * chosen here" — the rows it HOLDS (which is the value) and the rows it has STAGED
 * for the next move (which is not) — and a third once a search is typed, since a row
 * staged before a filter hid it counts for nothing. These specs keep the three
 * apart, and pin the direction of the move buttons, which is the other thing that
 * can silently reverse with both directions still green.
 */
describe('WrTransferHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let host: Host;
  let transfer: WrTransferHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    host = fixture.componentInstance;
    transfer = await loader.getHarness(WrTransferHarness);
  });

  afterEach(() => fixture.destroy());

  it('splits the rows across the two panes, keyed by side', async () => {
    const source = await transfer.getPane('source');
    const target = await transfer.getPane('target');

    expect(await source.getSide()).toBe('source');
    expect(await target.getSide()).toBe('target');
    expect(await source.getTitle()).toBe('Available');
    expect(await target.getTitle()).toBe('Granted');
    expect(await source.getItemLabels()).toEqual(['Read', 'Write', 'Delete', 'Audit']);
    expect(await target.getItemLabels()).toEqual([]);
    expect(await target.getEmptyText()).toBeTruthy();
    expect(await source.getEmptyText()).toBeNull();
  });

  it('reads the right pane in the order the user built it, not `items` order', async () => {
    host.granted.set(['delete', 'read']);

    expect(await (await transfer.getPane('target')).getItemLabels()).toEqual(['Delete', 'Read']);
    expect(await (await transfer.getPane('source')).getItemLabels()).toEqual(['Write', 'Audit']);
  });

  it('counts a row and nothing else as a row', async () => {
    // The empty pane renders a placeholder `<li>`; taking that for a row would report
    // the right pane as holding one thing while it holds nothing.
    const rows = await loader.getAllHarnesses(WrTransferItemHarness);

    expect(await Promise.all(rows.map(row => row.getLabel()))).toEqual(['Read', 'Write', 'Delete', 'Audit']);
    expect(await (await transfer.getPane('target')).getItems()).toEqual([]);
  });

  it('keeps staging out of the value until a move commits it', async () => {
    const source = await transfer.getPane('source');
    await (await source.getItem({ label: 'Read' })).check();

    expect(await source.getCheckedLabels()).toEqual(['Read']);
    expect(host.granted()).toEqual([]);

    await transfer.moveTo('target');

    expect(host.granted()).toEqual(['read']);
    expect(await (await transfer.getPane('target')).getItemLabels()).toEqual(['Read']);
    // Staging is spent, not remembered.
    expect(await source.getCheckedLabels()).toEqual([]);
    expect(host.touched).toBe(1);
  });

  it('moves rows in the direction it is asked for, not the direction they are drawn', async () => {
    // The pin: both buttons carry the same `.wr-transfer__move` class and differ only
    // by their modifier, so a harness addressing them by DOM order would reverse
    // silently the day the template emits them the other way round — and both
    // directions would still look green if only one of them were asserted.
    host.granted.set(['read', 'write']);

    const target = await transfer.getPane('target');
    await (await target.getItem({ label: 'Write' })).check();
    await transfer.moveTo('source');

    expect(host.granted()).toEqual(['read']);
    expect(await (await transfer.getPane('source')).getItemLabels()).toEqual(['Write', 'Delete', 'Audit']);
  });

  it('offers no move until the other pane has something staged and showing', async () => {
    expect(await transfer.canMoveTo('target')).toBe(false);
    expect(await transfer.canMoveTo('source')).toBe(false);
    // The message has to name the pane that is empty, not the one being moved INTO:
    // a developer reading it goes and looks at whichever side it says, so getting
    // that backwards costs them the debugging session the message exists to save.
    await expect(transfer.moveTo('target')).rejects.toThrow(/The source pane has nothing staged and showing/);
    await expect(transfer.moveTo('source')).rejects.toThrow(/The target pane has nothing staged and showing/);

    const source = await transfer.getPane('source');
    await (await source.getItem({ label: 'Write' })).check();

    expect(await transfer.canMoveTo('target')).toBe(true);
    expect(await transfer.canMoveTo('source')).toBe(false);
  });

  it('names both move buttons, whose only content is a hidden chevron', async () => {
    const toTarget = await transfer.getMoveLabel('target');
    const toSource = await transfer.getMoveLabel('source');

    expect(toTarget).toBeTruthy();
    expect(toSource).toBeTruthy();
    expect(toTarget).not.toBe(toSource);
  });

  it('agrees with its own header count', async () => {
    const source = await transfer.getPane('source');
    expect(await source.getCountText()).toBe('0 / 4');
    expect(await (await transfer.getPane('target')).getCountText()).toBe('0 / 0');

    await (await source.getItem({ label: 'Read' })).check();

    // The header is an i18n format the harness deliberately does not parse; what it
    // can do is prove the two numbers are the ones the pane is showing.
    expect(await source.getCountText()).toBe('1 / 4');
    expect(await source.getCountText()).toBe(
      `${(await source.getCheckedLabels()).length} / ${(await source.getItems()).length}`
    );
  });

  it('stages every row select-all can reach, and leaves the disabled one alone', async () => {
    const source = await transfer.getPane('source');
    await source.checkAll();

    expect(await source.getCheckedLabels()).toEqual(['Read', 'Write', 'Delete']);
    expect(await source.isAllChecked()).toBe(true);
    expect(await source.isPartiallyChecked()).toBe(false);

    // Already fully staged: asking again must not clear it.
    await source.checkAll();
    expect(await source.getCheckedLabels()).toHaveLength(3);
  });

  it('clears a partly staged pane, which takes two clicks of a box that reads unchecked', async () => {
    const source = await transfer.getPane('source');
    await (await source.getItem({ label: 'Read' })).check();

    expect(await source.isPartiallyChecked()).toBe(true);
    expect(await source.isAllChecked()).toBe(false);

    await source.uncheckAll();
    expect(await source.getCheckedLabels()).toEqual([]);
    expect(await source.isPartiallyChecked()).toBe(false);
  });

  it('refuses select-all on a pane with nothing it can stage', async () => {
    // Every visible row disabled is not the same as an empty pane, and both leave the
    // box inert — clicking it would stage nothing while looking like it worked.
    host.items.set([
      { value: 'audit', label: 'Audit', disabled: true },
      { value: 'trace', label: 'Trace', disabled: true },
    ]);

    const source = await transfer.getPane('source');
    expect(await source.isSelectAllDisabled()).toBe(true);
    await expect(source.toggleSelectAll()).rejects.toThrow(/no row that can be staged/);

    // The empty right pane is inert for the other of the two reasons.
    expect(await (await transfer.getPane('target')).isSelectAllDisabled()).toBe(true);
  });

  it('gives select-all a name of its own, since the heading already names the list', async () => {
    const source = await transfer.getPane('source');
    const name = await source.getSelectAllLabel();

    expect(name).toBeTruthy();
    expect(name).not.toBe(await source.getTitle());
    expect(name).toContain('Available');
  });

  it('publishes each list as a plain, named list rather than a listbox', async () => {
    const source = await transfer.getPane('source');
    const target = await transfer.getPane('target');

    // `null` is the answer: a `role="option"` may not contain an interactive control,
    // so the checkbox in each row carries the semantics instead.
    expect(await source.getListRole()).toBeNull();
    expect(await target.getListRole()).toBeNull();
    expect(await source.getListLabel()).toBe('Available');
    expect(await target.getListLabel()).toBe('Granted');

    // The list's name and the heading are the SAME string, so asserting the value alone
    // cannot tell which of the two the harness read — and a harness reading the heading
    // would report a happy name for a `<ul>` that had lost its own. Take the attribute
    // away and the answer has to disappear with it.
    (fixture.nativeElement as HTMLElement).querySelector('ul.wr-transfer__list')?.removeAttribute('aria-label');
    expect(await source.getListLabel()).toBeNull();
    expect(await source.getTitle()).toBe('Available');
  });

  it('filters a pane, and names the box that does it', async () => {
    const source = await transfer.getPane('source');
    expect(await transfer.isSearchable()).toBe(false);
    expect(await source.hasSearch()).toBe(false);
    await expect(source.search('read')).rejects.toThrow(/`searchable` is off/);

    host.searchable.set(true);
    expect(await transfer.isSearchable()).toBe(true);
    expect(await source.hasSearch()).toBe(true);

    await source.search('te');
    expect(await source.getItemLabels()).toEqual(['Write', 'Delete']);
    expect(await source.getSearchValue()).toBe('te');
    expect(await source.getSearchPlaceholder()).toBeTruthy();
    // Both panes carry the same placeholder, so the name has to say which list it filters.
    expect(await source.getSearchLabel()).toContain('Available');
    expect(await (await transfer.getPane('target')).getSearchLabel()).toContain('Granted');

    await source.search('');
    expect(await source.getItemLabels()).toHaveLength(4);
    expect(await source.getSearchValue()).toBe('');
  });

  it('leaves behind a row that was staged before a filter hid it', async () => {
    // The failure this would otherwise hide: a user who saw one row ticked watches two
    // rows leave. Staging outlives the filter change, so everything downstream — the
    // count, the tick, the button and the move — has to be scoped to what the pane is
    // SHOWING, and this spec is what says so.
    host.searchable.set(true);
    const source = await transfer.getPane('source');

    await source.search('read');
    await (await source.getItem({ label: 'Read' })).check();
    expect(await transfer.canMoveTo('target')).toBe(true);

    await source.search('write');
    expect(await source.getCheckedLabels()).toEqual([]);
    expect(await source.getCountText()).toBe('0 / 1');
    expect(await transfer.canMoveTo('target')).toBe(false);

    await (await source.getItem({ label: 'Write' })).check();
    await transfer.moveTo('target');

    expect(host.granted()).toEqual(['write']);
  });

  it('moves everything a pane is showing, and only that', async () => {
    await transfer.moveAllTo('target');
    expect(host.granted()).toEqual(['read', 'write', 'delete']);
    expect(await (await transfer.getPane('source')).getItemLabels()).toEqual(['Audit']);

    await transfer.moveAllTo('source');
    expect(host.granted()).toEqual([]);

    host.searchable.set(true);
    await (await transfer.getPane('source')).search('te');
    await transfer.moveAllTo('target');
    expect(host.granted()).toEqual(['write', 'delete']);
  });

  it('says what a pane is showing when a row is asked for that is not there', async () => {
    const source = await transfer.getPane('source');

    await expect(source.getItem({ label: 'Nope' })).rejects.toThrow(/showing \[Read, Write, Delete, Audit\]/);
  });

  it('narrows the rows of a pane by label, staged state and disabled state', async () => {
    const source = await transfer.getPane('source');
    await (await source.getItem({ label: /^Wr/ })).check();

    expect(await labelsOf(source.getItems({ checked: true }))).toEqual(['Write']);
    expect(await labelsOf(source.getItems({ checked: false }))).toEqual(['Read', 'Delete', 'Audit']);
    expect(await labelsOf(source.getItems({ disabled: true }))).toEqual(['Audit']);
    expect(await labelsOf(source.getItems({ label: 'Delete' }))).toEqual(['Delete']);

    // `getItem` is documented to answer with the FIRST match in render order, which a
    // filter matching one row on its own can never prove: three rows are unstaged here
    // and the topmost is the one a consumer means.
    expect(await (await source.getItem({ checked: false })).getLabel()).toBe('Read');
  });

  it('ticks, unticks and flips one row without disturbing the rest', async () => {
    const source = await transfer.getPane('source');
    const read = await source.getItem({ label: 'Read' });

    await read.check();
    await read.check();
    expect(await read.isChecked()).toBe(true);
    expect(await source.getCheckedLabels()).toEqual(['Read']);

    await read.uncheck();
    expect(await read.isChecked()).toBe(false);

    await read.toggle();
    expect(await read.isChecked()).toBe(true);
  });

  it('refuses to stage a disabled row', async () => {
    const source = await transfer.getPane('source');
    const audit = await source.getItem({ label: 'Audit' });

    expect(await audit.isDisabled()).toBe(true);
    await expect(audit.toggle()).rejects.toThrow(/is disabled and the component refuses to stage it/);
    expect(await transfer.canMoveTo('target')).toBe(false);
  });

  it('moves focus onto the row control a keyboard reaches', async () => {
    const read = await (await transfer.getPane('source')).getItem({ label: 'Read' });
    await read.focus();

    expect(await read.isFocused()).toBe(true);
  });

  it('reports a disabled transfer everywhere the state actually lands', async () => {
    host.disabled.set(true);
    const source = await transfer.getPane('source');

    expect(await transfer.isDisabled()).toBe(true);
    expect(await transfer.canMoveTo('target')).toBe(false);
    expect(await transfer.canMoveTo('source')).toBe(false);
    expect(await source.isSelectAllDisabled()).toBe(true);
    // Every row refuses staging, though none of them carries `disabled` in the data —
    // which is why a row's disabled state is read from the control and not the modifier.
    expect(await labelsOf(source.getItems({ disabled: true }))).toEqual(['Read', 'Write', 'Delete', 'Audit']);
    expect(await source.getItems({ disabled: false })).toEqual([]);
  });

  describe('with two transfers on the page', () => {
    let pair: ReturnType<typeof TestBed.createComponent<PairHost>>;
    let pairLoader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      pair = TestBed.createComponent(PairHost);
      pair.detectChanges();
      pairLoader = TestbedHarnessEnvironment.loader(pair);
    });

    afterEach(() => pair.destroy());

    it('narrows by either pane heading', async () => {
      const regions = await pairLoader.getHarness(WrTransferHarness.with({ sourceTitle: 'Regions' }));
      expect(await (await regions.getPane('target')).getTitle()).toBe('Chosen');

      const granted = await pairLoader.getHarness(WrTransferHarness.with({ targetTitle: /^Gran/ }));
      expect(await (await granted.getPane('source')).getItemLabels()).toContain('Read');
    });

    it('narrows by a row it is showing — the only handle when both use the default headings', async () => {
      const regions = await pairLoader.getHarness(WrTransferHarness.with({ itemLabel: 'Berlin' }));

      expect(await (await regions.getPane('source')).getItemLabels()).toEqual(['Berlin', 'Boston']);
      expect(await pairLoader.getAllHarnesses(WrTransferHarness.with({ itemLabel: 'Nowhere' }))).toEqual([]);
    });

    it('narrows by searchable and by disabled', async () => {
      const searchable = await pairLoader.getAllHarnesses(WrTransferHarness.with({ searchable: true }));
      expect(await Promise.all(searchable.map(async t => (await t.getPane('source')).getTitle()))).toEqual([
        'Available',
      ]);

      const disabled = await pairLoader.getAllHarnesses(WrTransferHarness.with({ disabled: true }));
      expect(await Promise.all(disabled.map(async t => (await t.getPane('source')).getTitle()))).toEqual(['Regions']);

      const enabled = await pairLoader.getAllHarnesses(WrTransferHarness.with({ disabled: false, searchable: false }));
      expect(enabled).toEqual([]);
    });

    it('finds one pane on its own by heading', async () => {
      const panes = await pairLoader.getAllHarnesses(WrTransferPaneHarness.with({ title: 'Chosen' }));

      expect(panes).toHaveLength(1);
      expect(await panes[0].getSide()).toBe('target');
    });
  });
});
