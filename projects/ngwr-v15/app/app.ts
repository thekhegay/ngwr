import { Component, ViewEncapsulation, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrTheme } from 'ngwr/theme';

interface Step {
  readonly name: string;
  readonly value: string;
  readonly uses?: number;
}

/** The proposed scales, rendered at their real values. Nothing here ships yet. */
@Component({
  selector: 'sbx-root',
  templateUrl: './app.html',
  styleUrls: ['./app.scss', './tokens.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [WrButton],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);
  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }

  /** `uses` is how many of the 303 literals in the catalog already equal this. */
  protected readonly space: readonly Step[] = [
    { name: 'xs', value: '0.25rem', uses: 50 },
    { name: 'sm', value: '0.5rem', uses: 51 },
    { name: 'md', value: '0.75rem', uses: 43 },
    { name: 'lg', value: '1rem', uses: 25 },
    { name: 'xl', value: '1.5rem', uses: 9 },
  ];

  protected readonly radius: readonly Step[] = [
    { name: 'xs', value: '0.25rem' },
    { name: 'sm', value: '0.375rem' },
    { name: 'md', value: '0.5rem' },
    { name: 'lg', value: '0.75rem' },
    { name: 'xl', value: '1rem' },
  ];

  protected readonly shadow: readonly Step[] = [
    { name: 'xs', value: 'hairline' },
    { name: 'sm', value: 'raised' },
    { name: 'md', value: 'overlay' },
    { name: 'lg', value: 'floating' },
    { name: 'xl', value: 'modal' },
  ];

  protected readonly borders: readonly Step[] = [
    { name: 'subtle', value: '1.23 / 1.21' },
    { name: 'base', value: '1.48 / 1.41' },
    { name: 'strong', value: '2.56 / 2.03' },
    { name: 'aa', value: '3.47 / 3.01' },
  ];
}
