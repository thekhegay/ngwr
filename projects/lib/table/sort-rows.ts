/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrTableSortAccessor, WrTableSortState } from './types';

// `>` between a number and a string coerces and is false both ways, which is
// not an order. Ranking the kind first keeps a mixed column totally ordered.
function compareValues(left: string | number, right: string | number): number {
  const rank = kindOf(left) - kindOf(right);

  if (rank !== 0) {
    return rank;
  }

  return left > right ? 1 : left < right ? -1 : 0;
}

function kindOf(value: string | number): number {
  if (value === '' || Number.isNaN(value)) {
    return 0;
  }

  return typeof value === 'number' ? 1 : 2;
}

/**
 * Reads the column `key` off a row as the value `wrSortRows` compares.
 *
 * - `null`, `undefined`, `''` and an invalid `Date` read as `''`.
 * - A number stays a number, and a bigint reads as one.
 * - A string that is a finite number reads as that number, so `'10'` sorts
 *   after `'9'`. A blank string stays a string: it is not `0`.
 * - A boolean reads as `0` or `1`, so `false` sorts before `true`.
 * - A `Date` reads as its timestamp.
 * - Anything else reads as `String(value)`.
 *
 * @example
 * ```ts
 * wrReadField({ qty: '10' }, 'qty'); // 10
 * wrReadField({ qty: null }, 'qty'); // ''
 * ```
 *
 * @param item The row.
 * @param key  The column key, a property of the row.
 */
export function wrReadField<T>(item: T, key: string): string | number {
  const value = (item as Record<string, unknown> | null | undefined)?.[key];

  if (value === null || value === undefined || value === '') {
    return '';
  }

  switch (typeof value) {
    case 'number':
      return value;
    case 'boolean':
    case 'bigint':
      return Number(value);
    case 'string': {
      const asNumber = value.trim() === '' ? NaN : Number(value);
      return Number.isFinite(asNumber) ? asNumber : value;
    }
  }

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? '' : time;
  }

  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- an object answers with its own toString
  return String(value);
}

/**
 * Sorts rows by the sort state `<wr-table>` holds. The table draws the arrows
 * and never reorders `items`, so the host sorts them.
 *
 * Entries apply in array order: the first decides, later ones break ties. An
 * entry with a `null` direction is skipped. Within a column, empty values come
 * first, then numbers, then text in code-unit order; `desc` reverses all of
 * it. Rows equal on every key keep their input order.
 *
 * Returns `rows` itself when there is nothing to sort, and a sorted copy
 * otherwise: the input is never mutated.
 *
 * @example
 * ```ts
 * protected readonly sort = signal<readonly WrTableSortState[]>([]);
 * protected readonly rows = computed(() => wrSortRows(this.source(), this.sort()));
 * ```
 *
 * @param rows     The rows to sort.
 * @param sort     The table's `sort` state.
 * @param accessor Reads the value of a key; defaults to `wrReadField`.
 */
export function wrSortRows<T>(
  rows: readonly T[],
  sort: readonly WrTableSortState[],
  accessor: WrTableSortAccessor<T> = wrReadField
): readonly T[] {
  const active = (sort ?? []).filter(state => !!state.direction);

  if (!active.length || !rows?.length) {
    return rows;
  }

  return [...rows].sort((a, b) => {
    for (const { key, direction } of active) {
      const result = compareValues(accessor(a, key), accessor(b, key));

      if (result !== 0) {
        return direction === 'desc' ? -result : result;
      }
    }

    return 0;
  });
}
