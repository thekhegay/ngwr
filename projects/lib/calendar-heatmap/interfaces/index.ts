interface WrHeatmapDatum {
  /** ISO date string (`YYYY-MM-DD`) or `Date`. */
  readonly date: string | Date;
  readonly value: number;
}

export type { WrHeatmapDatum };
