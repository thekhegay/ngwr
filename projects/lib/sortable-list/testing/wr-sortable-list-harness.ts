/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, HarnessPredicate, type TestElement, TestKey } from '@angular/cdk/testing';

import type { WrSortableListHarnessFilters } from './types';

/**
 * Test harness for `<wr-sortable-list>`.
 *
 * Every move goes through the keyboard path: pick up, arrows, drop. There is
 * no drag method, because a drag is decided by measured boxes and jsdom has
 * none, so one would report success on a list that sorts nothing.
 *
 * The moves drive a VERTICAL list (ArrowUp / ArrowDown inside it, ArrowLeft /
 * ArrowRight across its group). `orientation` is an input that never reaches
 * the DOM, so the harness cannot read it; on a horizontal list a move lands
 * nowhere and throws, rather than resolving on an order nobody asked for.
 *
 * @example
 * ```ts
 * const todo = await loader.getHarness(WrSortableListHarness.with({ ariaLabel: 'To do' }));
 * const done = await loader.getHarness(WrSortableListHarness.with({ ariaLabel: 'Done' }));
 *
 * await todo.moveItemTo(0, done, 0);
 * expect(await done.getItems()).toEqual(['Write the spec']);
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrSortableListHarness extends ComponentHarness {
  static hostSelector = 'wr-sortable-list';

  /** Build a predicate that narrows the query: pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrSortableListHarnessFilters = {}): HarnessPredicate<WrSortableListHarness> {
    return new HarnessPredicate(WrSortableListHarness, options)
      .addOption('ariaLabel', options.ariaLabel, async (harness, label) =>
        HarnessPredicate.stringMatches(harness.getAriaLabel(), label)
      )
      .addOption('item', options.item, async (harness, item) => {
        for (const text of await harness.getItems()) {
          if (await HarnessPredicate.stringMatches(text, item)) return true;
        }
        return false;
      });
  }

  private readonly rows = this.locatorForAll('.wr-sortable-list__item');
  private readonly list = this.locatorFor('.wr-sortable-list__list');
  private readonly status = this.locatorFor('[role="status"]');
  /** The row the keyboard is holding, in whichever list of the page has it. */
  private readonly held = this.documentRootLocatorFactory().locatorForOptional('.wr-sortable-list__item--grabbed');
  private readonly allLists = this.documentRootLocatorFactory().locatorForAll('wr-sortable-list');

  /** The text of every row, in order. The empty-state slot is not a row. */
  async getItems(): Promise<string[]> {
    const rows = await this.rows();
    return Promise.all(rows.map(row => row.text()));
  }

  /** The list's accessible name, or `null` when it has none. */
  async getAriaLabel(): Promise<string | null> {
    return (await this.list()).getAttribute('aria-label');
  }

  /** The host's `id`: the `id` input, or the generated one. */
  async getId(): Promise<string | null> {
    return (await this.host()).getAttribute('id');
  }

  /** Whether the list has no rows. */
  async isEmpty(): Promise<boolean> {
    return (await this.host()).hasClass('wr-sortable-list--empty');
  }

  /** Whether the list belongs to a group, so it can exchange rows with other lists. */
  async isConnected(): Promise<boolean> {
    return (await this.host()).hasClass('wr-sortable-list--connected');
  }

  /** The text projected into the empty-state slot, or `null` when the list has rows or projects nothing. */
  async getEmptyText(): Promise<string | null> {
    const empty = await this.locatorForOptional('.wr-sortable-list__empty')();
    const text = (await empty?.text()) ?? '';
    return text === '' ? null : text;
  }

  /** What the list's live region last said. Written by keyboard moves only. */
  async getAnnouncement(): Promise<string> {
    return (await this.status()).text();
  }

  /** Index of the row the keyboard is holding in THIS list, or `null`. */
  async getHeldIndex(): Promise<number | null> {
    const rows = await this.rows();
    for (const [index, row] of rows.entries()) {
      if (await row.hasClass('wr-sortable-list__item--grabbed')) return index;
    }
    return null;
  }

  /**
   * Moves the row at `from` to `to` inside this list: pick up, arrows, drop.
   * The list emits one `reorder`. Throws when the row does not land on `to`,
   * which is what a disabled or horizontal list does.
   */
  async moveItem(from: number, to: number): Promise<void> {
    const text = await this.grab(from, 'moveItem');
    await this.walkTo(to, 'moveItem');
    await this.release(text, to, 'moveItem');
  }

  /**
   * Moves the row at `from` into another list of the same group, at `to`.
   * The target emits one `move`.
   *
   * It walks the group one way, then the other, so it needs no knowledge of the
   * page's direction. Throws when the row never reaches `target`: another
   * group, a list that is disabled, or a `canEnter` that refuses the item. The
   * row is back where it started by then.
   */
  async moveItemTo(from: number, target: WrSortableListHarness, to: number): Promise<void> {
    const name = 'moveItemTo';
    const reach = (await this.allLists()).length;

    for (const key of [TestKey.RIGHT_ARROW, TestKey.LEFT_ARROW]) {
      const text = await this.grab(from, name);
      for (let i = 0; i < reach && (await target.getHeldIndex()) === null; i += 1) {
        await (await this.heldRow(name)).sendKeys(key);
      }
      if ((await target.getHeldIndex()) !== null) {
        await target.walkTo(to, name);
        await target.release(text, to, name);
        return;
      }
      await (await this.heldRow(name)).sendKeys(TestKey.ESCAPE);
    }

    throw new Error(
      `WrSortableListHarness.${name}(): the row never reached the target list. The two lists share no group, ` +
        `or the target is disabled or its canEnter refused the item. The row is back at index ${from}.`
    );
  }

  private async grab(index: number, name: string): Promise<string> {
    const rows = await this.rows();
    const row = rows[index];
    if (!row) {
      throw new Error(
        `WrSortableListHarness.${name}(): index ${index} is out of range. This list holds ${rows.length} row(s).`
      );
    }
    const text = await row.text();
    await row.sendKeys(TestKey.ENTER);
    if ((await this.getHeldIndex()) !== index) {
      throw new Error(`WrSortableListHarness.${name}(): the row at ${index} was not picked up. Is the list disabled?`);
    }
    return text;
  }

  private async walkTo(to: number, name: string): Promise<void> {
    const total = (await this.rows()).length;
    if (to < 0 || to >= total) {
      await (await this.heldRow(name)).sendKeys(TestKey.ESCAPE);
      throw new Error(
        `WrSortableListHarness.${name}(): target index ${to} is out of range. The list holds ${total} row(s) ` +
          `with the moved one, so the last index is ${total - 1}. The move was cancelled.`
      );
    }
    for (let i = 0; i < total; i += 1) {
      const at = await this.getHeldIndex();
      if (at === null || at === to) return;
      await (await this.heldRow(name)).sendKeys(at < to ? TestKey.DOWN_ARROW : TestKey.UP_ARROW);
    }
  }

  private async release(text: string, to: number, name: string): Promise<void> {
    const at = await this.getHeldIndex();
    await (await this.heldRow(name)).sendKeys(at === to ? TestKey.ENTER : TestKey.ESCAPE);
    if (at !== to || (await this.getItems())[to] !== text) {
      throw new Error(
        `WrSortableListHarness.${name}(): the row stopped at ${at} instead of ${to} and the move was cancelled. ` +
          `This harness drives vertical lists only.`
      );
    }
  }

  private async heldRow(name: string): Promise<TestElement> {
    const row = await this.held();
    if (!row) throw new Error(`WrSortableListHarness.${name}(): no row is being held, the gesture ended early.`);
    return row;
  }
}
