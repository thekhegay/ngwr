import { Component, ViewEncapsulation, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrTheme } from 'ngwr/theme';
import { WrToast } from 'ngwr/toast';

/** Reproduction of the reported toast-stack defect: several arriving fast. */
@Component({
  selector: 'sbx-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [WrButton],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);
  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }

  private readonly toast = inject(WrToast);
  private n = 0;

  /** The reported shape: identical messages, no gap between them. */
  protected burst(count: number): void {
    for (let i = 0; i < count; i++) {
      this.toast.show({ message: `Редкие пакеты локаций · 66119${i}`, type: 'warning', duration: 20000 });
    }
  }

  protected one(): void {
    this.n += 1;
    this.toast.show({ message: `Toast ${this.n}`, type: 'info', duration: 20000 });
  }

  /** The reported timing: one arriving while another is on its way out. */
  protected stream(): void {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.n += 1;
        this.toast.show({
          message: `Редкие пакеты локаций · 6611${90 + this.n}`,
          type: 'warning',
          duration: 1600,
        });
      }, i * 450);
    }
  }
}
