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

/** @deprecated use import from 'ngwr/types' */
export type WrThemeColor = (typeof wrThemeColors)[number];
