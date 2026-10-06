import { Component, ViewEncapsulation, inject, signal } from '@angular/core';

import { WrAlert } from 'ngwr/alert';
import { WrButton } from 'ngwr/button';
import { WrEmpty } from 'ngwr/empty';
import { WrProgress } from 'ngwr/progress';
import { WrPullToRefresh } from 'ngwr/pull-to-refresh';
import { WrResult, WrResult403, WrResult404, WrResult500 } from 'ngwr/result';
import { WrSkeleton } from 'ngwr/skeleton';
import { WrSlider } from 'ngwr/slider';
import { WrSpinner } from 'ngwr/spinner';
import { WrTheme } from 'ngwr/theme';

/** The sandbox host. Everything below is a docs snippet, copied as written. */
@Component({
  selector: 'sbx-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [
    WrAlert,
    WrButton,
    WrEmpty,
    WrProgress,
    WrPullToRefresh,
    WrResult,
    WrResult403,
    WrResult404,
    WrResult500,
    WrSkeleton,
    WrSlider,
    WrSpinner,
  ],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);

  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }

  protected readonly value = signal(42);
  protected readonly loading = signal(false);
  protected readonly items = signal(['one', 'two', 'three']);

  protected onClose(): void {
    this.loading.set(false);
  }

  protected reset(): void {
    this.value.set(0);
  }

  protected reload(): void {
    this.loading.set(true);
  }
}
