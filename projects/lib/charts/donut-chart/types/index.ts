/** One slice of a `<wr-donut-chart>`: a name, a value, and optionally its own colour. */
interface WrDonutSegment {
  /** The slice's name, in the legend and the tooltip. */
  readonly label: string;
  /**
   * The slice's size, as its share of the segments shown. A negative value, or one that is
   * not a finite number, draws no slice and takes no share; the legend keeps its row with
   * the segment's own figure — none for a value that is not a number.
   */
  readonly value: number;
  /** Any CSS colour, `var(--wr-…)` included. Left out, the slice takes the next palette colour. */
  readonly color?: string;
}

export type { WrDonutSegment };
