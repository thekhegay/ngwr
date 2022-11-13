import { SafeAny } from 'ngwr/core/types';

import { wrThemeColors, WrThemeColor } from './color';

export function isThemeColor(color: string): color is WrThemeColor {
  const is: boolean = wrThemeColors.indexOf(color as SafeAny) !== -1;

  if (!is) {
    console.warn(`${color} is not NGWR theme color`);
  }

  return is;
}
