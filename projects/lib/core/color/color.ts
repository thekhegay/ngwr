export const wrThemeColors = [
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'light',
  'medium',
  'dark',
] as const;

export type WrThemeColor = (typeof wrThemeColors)[number];
