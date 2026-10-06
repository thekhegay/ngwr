import { Component, ViewEncapsulation, inject, signal } from '@angular/core';

import { WrAvatar } from 'ngwr/avatar';
import { WrButton } from 'ngwr/button';
import { WrIcon } from 'ngwr/icon';
import { WrOption, WrOptionGroup, WrOptionLeading, WrSelect } from 'ngwr/select';
import { WrTheme } from 'ngwr/theme';

/**
 * The sandbox host.
 *
 * `ViewEncapsulation.None` on purpose: the library's own components are
 * unencapsulated and their `.wr-*` classes are public API, so a host that
 * scopes its styles would behave differently from the app a consumer writes.
 */
@Component({
  selector: 'sbx-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [WrAvatar, WrButton, WrIcon, WrOption, WrOptionGroup, WrOptionLeading, WrSelect],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);

  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
  }

  // Basic usage
  protected readonly size = signal<string | null>(null);

  // Groups
  protected readonly framework = signal<string | null>(null);

  // Multi mode
  protected readonly tags = signal<readonly string[]>([]);

  // Chip overflow + max items — four already chosen, maxItems is 4.
  protected readonly manyTags = signal<readonly string[]>(['typescript', 'angular', 'rxjs', 'signals']);

  // Search mode
  protected readonly country = signal<string | null>(null);
  protected readonly countries = ['Kazakhstan', 'Georgia', 'Germany', 'Portugal', 'Serbia', 'Turkey'];

  // Searchable multi-select
  protected readonly categories = signal<readonly string[]>([]);
  protected readonly allCategories = ['Design', 'Engineering', 'Marketing', 'Operations', 'Research'];

  // Leading visuals
  protected readonly owner = signal<string | null>(null);
  protected readonly people = [
    { id: 'ada', name: 'Ada Lovelace' },
    { id: 'alan', name: 'Alan Turing' },
    { id: 'grace', name: 'Grace Hopper' },
  ];

  protected readonly peopleIds = this.people.map(p => p.id);

  // FORCED to `unknown`. `WrSelect` is not generic: `displayWith` is typed
  // `(item: unknown) => string` and the `wrOptionLeading` value is `unknown`,
  // so a helper typed `(id: string)` does not compile — TS2322 on the binding,
  // TS2345 at every call in the template. The library's own avatar docs page
  // carries the same three helpers widened the same way, with nothing saying why.
  protected readonly personName = (id: unknown): string => this.people.find(p => p.id === id)?.name ?? String(id);
  protected readonly personInitials = (id: unknown): string => this.personName(id).slice(0, 1);
}
