import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DarkModeService {
  private r2: Renderer2;
  private readonly storageKey = 'ngwr.keys.isDarkModeEnabled';
  public readonly isDarkModeEnabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private readonly rf2: RendererFactory2) {
    this.r2 = this.rf2.createRenderer(null, null);
  }

  init(): void {
    const localStorageValue: string | null = localStorage.getItem(this.storageKey);
    if (localStorageValue) {
      const value: boolean = JSON.parse(localStorageValue);
      value ? this.enableDarkTheme() : this.disableDarkTheme();
    } else {
      this.detectPrefersColorScheme();
    }
  }

  public toggleDarkTheme(): void {
    const localStorageValue: string = localStorage.getItem(this.storageKey) || '';
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
    localStorage.setItem(this.storageKey, 'true');
    this.isDarkModeEnabled$.next(true);
    this.r2.addClass(document.documentElement, 'dark');
  }

  private disableDarkTheme(): void {
    localStorage.setItem(this.storageKey, 'false');
    this.isDarkModeEnabled$.next(false);
    this.r2.removeClass(document.documentElement, 'dark');
  }
}
