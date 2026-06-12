/** One bar's worth of data. */
interface WrBarChartDatum {
  readonly label: string;
  readonly value: number;
  readonly color?: string;
}

export type { WrBarChartDatum };
