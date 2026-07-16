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
    install: `import { WrCookie } from 'ngwr/cookie';

@Component({ /* … */ })
export class MyComponent {
  private readonly cookies = inject(WrCookie);

  protected init() {
    this.cookies.set('theme', 'dark', {
      expires: 60 * 60 * 24 * 30,   // 30 days
      sameSite: 'Strict',
      secure: true,
    });

    this.cookies.get('theme');     // 'dark'
    this.cookies.has('theme');     // true
    this.cookies.remove('theme');
  }
}`,
    expires: `// Numeric expires = seconds from now (Max-Age):
cookies.set('session', token, { expires: 3600 });          // 1 hour

// Date expires = absolute (HTTP-date):
const at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
cookies.set('preferences', JSON.stringify(p), { expires: at });

// Omit expires → session cookie (deleted on browser close).
cookies.set('csrf', token);`,
    keys: `cookies.keys();    // every cookie key visible to this document
cookies.clear();   // remove them all (path: '/')`,
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
        "Write a cookie. `expires` accepts `Date` (`expires=…`) or `number` (seconds → `max-age=…`). Defaults: `path: '/'`, `sameSite: 'Lax'`.",
      type: '(key, value, options?) => void',
      default: '—',
    },
    {
      name: 'remove(key, options?)',
      description: 'Delete a cookie. Pass `path` / `domain` matching what `set()` used.',
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
      url: ['/services', 'storage'],
      description: 'Sibling API for localStorage / sessionStorage / custom engines — same shape, no expiry headers.',
    },
  ];
}
