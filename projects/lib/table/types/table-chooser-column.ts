/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/** One row of a column chooser: a column of the table, shown or hidden. */
export interface WrTableChooserColumn {
  /** The column's key in `columns`, the value `hiddenColumns` lists. */
  readonly key: string;
  /** The column's title, or its `headerHint`, or its key when it has neither. */
  readonly title: string;
  /** Whether the table leaves the column out. */
  readonly hidden: boolean;
  /** `false` for a `hideable: false` column, which is always shown. */
  readonly hideable: boolean;
  /** Whether the checkbox is disabled: a `hideable: false` column, or the last one shown. */
  readonly locked: boolean;
}
