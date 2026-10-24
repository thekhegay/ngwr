/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The values of a `<wr-heatmap-chart>`, rows × columns: one array per row, in the order
 * of `rows`, each holding one value per column, in the order of `columns`.
 *
 * A cell is EMPTY — no data, which is not zero — when its value is `null`, is not a
 * finite number, or lies past the end of a shorter row. An empty cell is drawn hatched
 * and outlined, never as the lowest level of the scale.
 */
type WrHeatmapMatrix = readonly (readonly (number | null)[])[];

export type { WrHeatmapMatrix };
