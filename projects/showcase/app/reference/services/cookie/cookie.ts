import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrButton } from 'ngwr/button';
import { WrCookie } from 'ngwr/cookie';
import { WrInput } from 'ngwr/input';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-cookie-page',
  templateUrl: './cookie.html',
  imports: [
    FormsModule,
    WrButton,
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class CookieServicePage {
  private readonly cookies = inject(WrCookie);

  protected readonly key = signal('demo:key');
  protected readonly value = signal('hello cookie');
  protected readonly all = signal<readonly string[]>(this.cookies.keys());
  protected readonly read = signal<string | null>(null);

  protected refresh(): void {
    this.all.set(this.cookies.keys());
    this.read.set(this.cookies.get(this.key()));
  }

  protected save(): void {
    // 1 hour TTL
    this.cookies.set(this.key(), this.value(), { expires: 3600 });
    this.refresh();
  }

  protected remove(): void {
    this.cookies.remove(this.key());
    this.refresh();
  }

  protected wipe(): void {
    this.cookies.clear();
    this.refresh();
  }

  protected readonly snippets = {
    expires: `cookies.set('session', token, { expires: 3600 }); // in an hour
cookies.set('prefs', value, { expires: new Date('2027-01-01') }); // on a date
cookies.set('csrf', token); // when the browser closes`,
    keys: `cookies.keys(); // every key this document can see
cookies.clear(); // removes them all, on path '/'`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'get(key, fallback?)',
      description: 'Read a cookie. Returns `fallback` (default `null`) when missing.',
      type: '(key, fallback?) => string | null',
      default: '—',
    },
    { name: 'has(key)', description: 'Is the cookie present?', type: '(key) => boolean', default: '—' },
    {
      name: 'set(key, value, options?)',
      description:
        "Write a cookie. `expires` takes a `Date` or seconds. Defaults: `path: '/'`, `sameSite: 'Lax'`. `sameSite: 'None'` adds `secure`.",
      type: '(key, value, options?) => void',
      default: '—',
    },
    {
      name: 'remove(key, options?)',
      description: 'Delete a cookie. Pass the `path` and `domain` that `set()` used.',
      type: '(key, options?) => void',
      default: '—',
    },
    {
      name: 'keys()',
      description: 'Every cookie key visible to this document.',
      type: '() => readonly string[]',
      default: '—',
    },
    { name: 'clear()', description: "Remove every cookie. Uses `path: '/'`.", type: '() => void', default: '—' },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Service',
      title: 'WrStorage',
      url: ['/reference/services', 'storage'],
      description: 'The same API for localStorage.',
    },
  ];
}
