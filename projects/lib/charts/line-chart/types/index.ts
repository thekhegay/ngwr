/** One line of a `<wr-line-chart>`: a name, one value per x, and optionally its own colour. */
interface WrLineSeries {
  /** The series' name, in the legend, the tooltip and the data table's column heading. */
  readonly label: string;
  /**
   * One value per x, evenly spaced along the axis, in the order of `xLabels`. A value that
   * is not a finite number — `NaN` is how to write one — is a HOLE: the line, and its fill
   * with `showArea`, break there, it adds nothing to a stack, and the tooltip and the data
   * table leave it out. A shorter list ends where it ends.
   */
  readonly data: readonly number[];
  /** Any CSS colour, `var(--wr-…)` included. Left out, the series takes the next palette colour. */
  readonly color?: string;
}

export type { WrLineSeries };
