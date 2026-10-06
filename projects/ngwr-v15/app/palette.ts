/** The five neutral families, for the hue decision. Blue cast falls left to right. */
export const NEUTRALS = {
  slate: { '200': '#e2e8f0', '300': '#cbd5e1', '400': '#94a3b8', '600': '#475569', '900': '#0f172a' },
  gray: { '200': '#e5e7eb', '300': '#d1d5db', '400': '#9ca3af', '600': '#4b5563', '900': '#111827' },
  zinc: { '200': '#e4e4e7', '300': '#d4d4d8', '400': '#a1a1aa', '600': '#52525b', '900': '#18181b' },
  neutral: { '200': '#e5e5e5', '300': '#d4d4d4', '400': '#a3a3a3', '600': '#525252', '900': '#171717' },
  stone: { '200': '#e7e5e4', '300': '#d6d3d1', '400': '#a8a29e', '600': '#57534e', '900': '#1c1917' },
} as const;

/** Tailwind's default scales — the only literals on the page; everything on the
 *  ngwr side is read out of the compiled theme at runtime. */
export const TW = {
  slate: {
    '50': '#f8fafc',
    '100': '#f1f5f9',
    '200': '#e2e8f0',
    '300': '#cbd5e1',
    '400': '#94a3b8',
    '500': '#64748b',
    '600': '#475569',
    '700': '#334155',
    '800': '#1e293b',
    '900': '#0f172a',
    '950': '#020617',
  },
  blue: { '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8' },
  green: { '400': '#4ade80', '500': '#22c55e', '600': '#16a34a', '700': '#15803d' },
  amber: { '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706' },
  red: { '400': '#f87171', '500': '#ef4444', '600': '#dc2626' },
  sky: { '400': '#38bdf8', '500': '#0ea5e9', '600': '#0284c7' },
} as const;

/**
 * What each ngwr token is compared against — and the counterpart FLIPS with the
 * theme, because a dark theme reads the ramp from the other end: our faintest
 * wash is their darkest step there, not their lightest.
 */
export const PAIRS: readonly {
  readonly ours: string;
  readonly light: string;
  readonly dark: string;
  readonly note: string;
}[] = [
  { ours: '--wr-color-gray-1', light: 'slate.50', dark: 'slate.950', note: 'faintest wash' },
  { ours: '--wr-color-gray-2', light: 'slate.100', dark: 'slate.900', note: 'fill / hover' },
  { ours: '--wr-color-gray-3', light: 'slate.200', dark: 'slate.800', note: 'fill-strong' },
  { ours: '--wr-color-gray-4', light: 'slate.300', dark: 'slate.700', note: 'the hairline' },
  { ours: '', light: 'slate.400', dark: 'slate.600', note: 'the gap — a 3:1 control border would live here' },
  { ours: '', light: 'slate.500', dark: 'slate.500', note: 'the gap' },
  { ours: '--wr-color-gray-5', light: 'slate.600', dark: 'slate.400', note: 'muted text' },
  { ours: '--wr-color-gray-6', light: 'slate.900', dark: 'slate.100', note: 'body text' },
];

export const INTENTS: readonly { readonly ours: string; readonly light: string; readonly dark: string }[] = [
  { ours: '--wr-color-primary', light: 'blue.600', dark: 'blue.500' },
  { ours: '--wr-color-success', light: 'green.600', dark: 'green.500' },
  { ours: '--wr-color-warning', light: 'amber.500', dark: 'amber.400' },
  { ours: '--wr-color-danger', light: 'red.500', dark: 'red.400' },
  { ours: '--wr-color-info', light: 'sky.600', dark: 'sky.500' },
];
