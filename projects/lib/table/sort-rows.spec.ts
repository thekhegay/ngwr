/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { describe, expect, it } from 'vitest';

import { wrReadField, wrSortRows } from './sort-rows';
import type { WrTableSortState } from './types';

const asc = (key: string): WrTableSortState => ({ key, direction: 'asc' });
const desc = (key: string): WrTableSortState => ({ key, direction: 'desc' });
const values = (rows: readonly { v: unknown }[]): unknown[] => rows.map(row => row.v);

describe('wrReadField', () => {
  it("reads null, undefined, '' and a missing key as ''", () => {
    expect(wrReadField({ v: null }, 'v')).toBe('');
    expect(wrReadField({ v: undefined }, 'v')).toBe('');
    expect(wrReadField({ v: '' }, 'v')).toBe('');
    expect(wrReadField({}, 'v')).toBe('');
    expect(wrReadField(null, 'v')).toBe('');
  });

  it('keeps a number and converts a numeric string', () => {
    expect(wrReadField({ v: 0 }, 'v')).toBe(0);
    expect(wrReadField({ v: '10' }, 'v')).toBe(10);
    expect(wrReadField({ v: '-1.5' }, 'v')).toBe(-1.5);
    expect(wrReadField({ v: 10n }, 'v')).toBe(10);
  });

  it('keeps a blank or non-numeric string as text', () => {
    expect(wrReadField({ v: '  ' }, 'v')).toBe('  ');
    expect(wrReadField({ v: 'abc' }, 'v')).toBe('abc');
    expect(wrReadField({ v: '10px' }, 'v')).toBe('10px');
    expect(wrReadField({ v: 'Infinity' }, 'v')).toBe('Infinity');
  });

  it('reads a boolean as 0 or 1', () => {
    expect(wrReadField({ v: false }, 'v')).toBe(0);
    expect(wrReadField({ v: true }, 'v')).toBe(1);
  });

  it("reads a Date as its timestamp, and an invalid one as ''", () => {
    expect(wrReadField({ v: new Date(1_700_000_000_000) }, 'v')).toBe(1_700_000_000_000);
    expect(wrReadField({ v: new Date('nope') }, 'v')).toBe('');
  });

  it('reads anything else through String()', () => {
    expect(wrReadField({ v: ['a', 'b'] }, 'v')).toBe('a,b');
    expect(wrReadField({ v: [] }, 'v')).toBe('');
    expect(wrReadField({ v: { toString: () => 'obj' } }, 'v')).toBe('obj');
  });
});

describe('wrSortRows', () => {
  it('sorts numbers written as strings numerically', () => {
    const rows = [{ v: '100' }, { v: '9' }, { v: '10' }];

    expect(values(wrSortRows(rows, [asc('v')]))).toEqual(['9', '10', '100']);
    expect(values(wrSortRows(rows, [desc('v')]))).toEqual(['100', '10', '9']);
  });

  it('puts empty values first ascending and last descending', () => {
    const rows = [{ v: 2 }, { v: null }, { v: 1 }, { v: '' }, { v: undefined }, { v: 0 }];

    expect(values(wrSortRows(rows, [asc('v')]))).toEqual([null, '', undefined, 0, 1, 2]);
    expect(values(wrSortRows(rows, [desc('v')]))).toEqual([2, 1, 0, null, '', undefined]);
  });

  it('orders a mixed column as empties, numbers, then text', () => {
    const rows = [{ v: 'b' }, { v: 3 }, { v: '' }, { v: 'a' }, { v: '20' }, { v: -1 }, { v: '  ' }];

    expect(values(wrSortRows(rows, [asc('v')]))).toEqual(['', -1, 3, '20', '  ', 'a', 'b']);
    expect(values(wrSortRows(rows, [desc('v')]))).toEqual(['b', 'a', '  ', '20', 3, -1, '']);
  });

  it('gives the same order whatever order a mixed column arrives in', () => {
    const rows = [{ v: 'x' }, { v: 5 }, { v: 'a' }, { v: '' }, { v: 1 }, { v: '10' }];
    const expected = ['', 1, 5, '10', 'a', 'x'];

    expect(values(wrSortRows(rows, [asc('v')]))).toEqual(expected);
    expect(values(wrSortRows([...rows].reverse(), [asc('v')]))).toEqual(expected);
  });

  it('compares text by code unit, not by locale', () => {
    const rows = [{ v: 'b' }, { v: 'a' }, { v: 'B' }, { v: 'ä' }];

    expect(values(wrSortRows(rows, [asc('v')]))).toEqual(['B', 'a', 'b', 'ä']);
  });

  it('sorts booleans and dates by what wrReadField reads', () => {
    const early = new Date(2020, 0, 1);
    const late = new Date(2026, 0, 1);

    expect(values(wrSortRows([{ v: true }, { v: false }], [asc('v')]))).toEqual([false, true]);
    expect(values(wrSortRows([{ v: late }, { v: early }], [asc('v')]))).toEqual([early, late]);
  });

  it('breaks ties on the first key with the second', () => {
    const rows = [
      { role: 'editor', name: 'Cara' },
      { role: 'admin', name: 'Roman' },
      { role: 'editor', name: 'Alice' },
      { role: 'admin', name: 'Bob' },
    ];

    expect(wrSortRows(rows, [asc('role'), desc('name')]).map(row => row.name)).toEqual([
      'Roman',
      'Bob',
      'Cara',
      'Alice',
    ]);
  });

  it('skips an entry with a null direction', () => {
    const rows = [
      { role: 'b', name: 'y' },
      { role: 'a', name: 'z' },
      { role: 'c', name: 'x' },
    ];

    expect(wrSortRows(rows, [{ key: 'role', direction: null }, asc('name')]).map(row => row.name)).toEqual([
      'x',
      'y',
      'z',
    ]);
  });

  it('keeps the input order of rows equal on every key', () => {
    const rows = Array.from({ length: 40 }, (_, id) => ({ id, group: id % 3 }));

    const sorted = wrSortRows(rows, [asc('group')]);

    for (const group of [0, 1, 2]) {
      const ids = sorted.filter(row => row.group === group).map(row => row.id);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
    }
    expect(
      wrSortRows(rows, [desc('group')])
        .map(row => row.id)
        .slice(0, 3)
    ).toEqual([2, 5, 8]);
  });

  it('returns the same array when nothing sorts', () => {
    const rows = [{ v: 2 }, { v: 1 }];
    const empty: { v: number }[] = [];

    expect(wrSortRows(rows, [])).toBe(rows);
    expect(wrSortRows(rows, [{ key: 'v', direction: null }])).toBe(rows);
    expect(wrSortRows(empty, [asc('v')])).toBe(empty);
  });

  it('returns a copy and never mutates the input', () => {
    const rows = Object.freeze([{ v: 3 }, { v: 1 }, { v: 2 }]);
    const snapshot = [...rows];

    const sorted = wrSortRows(rows, [asc('v')]);

    expect(sorted).not.toBe(rows);
    expect(values(sorted)).toEqual([1, 2, 3]);
    expect([...rows]).toEqual(snapshot);
  });

  it('reads a computed or nested key through the accessor', () => {
    interface Line {
      readonly price: number;
      readonly qty: number;
      readonly owner: { readonly name: string };
    }
    const rows: readonly Line[] = [
      { price: 5, qty: 4, owner: { name: 'Cara' } },
      { price: 30, qty: 1, owner: { name: 'Alice' } },
      { price: 2, qty: 3, owner: { name: 'Bob' } },
    ];
    const accessor = (row: Line, key: string): string | number =>
      key === 'total' ? row.price * row.qty : key === 'owner' ? row.owner.name : wrReadField(row, key);

    expect(wrSortRows(rows, [desc('total')], accessor).map(row => row.price)).toEqual([30, 5, 2]);
    expect(wrSortRows(rows, [asc('owner')], accessor).map(row => row.owner.name)).toEqual(['Alice', 'Bob', 'Cara']);
    expect(wrSortRows(rows, [asc('qty')], accessor).map(row => row.qty)).toEqual([1, 3, 4]);
  });

  it('sorts a NaN from an accessor with the empties', () => {
    const rows = [{ v: 2 }, { v: 'x' }, { v: 1 }];
    const accessor = (row: { v: unknown }): number => Number(row.v);

    expect(values(wrSortRows(rows, [asc('v')], accessor))).toEqual(['x', 1, 2]);
  });
});
