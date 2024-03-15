import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { NGWR_STORAGE_THEME_KEY } from '#core/constants';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private r2: Renderer2;
  readonly isDarkModeEnabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private readonly rf2: RendererFactory2) {
    this.r2 = this.rf2.createRenderer(null, null);
  }

  init(): void {
    const localStorageValue: string | null = localStorage.getItem(NGWR_STORAGE_THEME_KEY);
    if (localStorageValue) {
      const value: boolean = JSON.parse(localStorageValue);
      value ? this.enableDarkTheme() : this.disableDarkTheme();
    } else {
      this.detectPrefersColorScheme();
    }
  }

  toggleDarkTheme(): void {
    const localStorageValue: string = localStorage.getItem(NGWR_STORAGE_THEME_KEY) || '';
    const value: boolean = JSON.parse(localStorageValue);
    value ? this.disableDarkTheme() : this.enableDarkTheme();
  }

  private detectPrefersColorScheme(): void {
    if (window.matchMedia('(prefers-color-scheme)').media !== 'not all') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.enableDarkTheme();
      }
    }
  }

  private enableDarkTheme(): void {
    localStorage.setItem(NGWR_STORAGE_THEME_KEY, 'true');
    this.isDarkModeEnabled$.next(true);
    this.r2.addClass(document.documentElement, 'dark');
  }

  private disableDarkTheme(): void {
    localStorage.setItem(NGWR_STORAGE_THEME_KEY, 'false');
    this.isDarkModeEnabled$.next(false);
    this.r2.removeClass(document.documentElement, 'dark');
  }
}
