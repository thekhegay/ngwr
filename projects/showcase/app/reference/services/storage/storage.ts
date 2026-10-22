import { Component, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrStorage } from 'ngwr/storage';

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
  selector: 'ngwr-svc-storage-page',
  templateUrl: './storage.html',
  imports: [
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class StorageServicePage {
  private readonly store = inject(WrStorage);

  /** Reactive read — auto-updates on writes from this tab or cross-tab. */
  protected readonly visits = this.store.watch<number>('demo:visits', 0);

  /** TTL demo — short-lived value. */
  protected readonly note = signal<string | null>(this.store.get('demo:note'));

  protected bump(): void {
    this.store.set('demo:visits', (this.visits() ?? 0) + 1);
  }

  protected stash(): void {
    this.store.set('demo:note', `Stashed at ${new Date().toLocaleTimeString()}`, { ttl: 10_000 });
    this.note.set(this.store.get('demo:note'));
  }

  protected refresh(): void {
    this.note.set(this.store.get('demo:note'));
  }

  protected reset(): void {
    this.store.remove('demo:visits');
    this.store.remove('demo:note');
    this.note.set(null);
  }

  protected readonly snippets = {
    swap: `provideWr(withStorage({ engine: sessionStorage }))

// A factory, for a wrapper such as encrypted storage:
provideWr(withStorage({ engine: () => new EncryptedStorage(localStorage, key) }))

// Or the token, at bootstrap only:
providers: [{ provide: WR_STORAGE_ENGINE, useValue: sessionStorage }]`,
    usage: `private readonly store = inject(WrStorage);

this.store.set('user', { name: 'Ada' });
this.store.get<{ name: string }>('user'); // { name: 'Ada' }

this.store.set('cart', items, { ttl: 60_000 }); // gone after 60 s
this.store.has('cart'); // ignores expiry

const theme = this.store.watch<'light' | 'dark'>('theme', 'light');
effect(() => console.log('theme is', theme()));`,
    format: `import type { WrStorageEnvelope } from 'ngwr/storage';

// provideWr(withStorage({ prefix: 'myapp:' }))
store.set('theme', 'dark');
// localStorage['myapp:theme'] === '{"v":"dark"}'

store.set('cart', [{ sku: 'a1' }], { ttl: 60_000 });
// localStorage['myapp:cart'] === '{"v":[{"sku":"a1"}],"e":1767225600000}'

// Reading it outside Angular:
const raw = localStorage.getItem('myapp:theme');
const env = raw === null ? null : (JSON.parse(raw) as WrStorageEnvelope<string>);
const value = env && (env.e === undefined || env.e >= Date.now()) ? env.v : null;`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'get(key, fallback?)',
      description: 'Read a value. Returns `fallback` (default `null`) when absent or expired.',
      type: '<T>(k: string, f?: T) => T | null',
      default: '—',
    },
    {
      name: 'set(key, value, opts?)',
      description: 'Write a value. `ttl` (ms) overrides the configured default.',
      type: '<T>(k: string, v: T, opts?: { ttl?: number }) => void',
      default: '—',
    },
    { name: 'remove(key)', description: 'Remove the value at `key`.', type: '(k: string) => void', default: '—' },
    {
      name: 'clear()',
      description: 'Clear every key under the prefix, or every key when there is none.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'has(key)',
      description: 'Whether the key exists, ignoring expiry.',
      type: '(k: string) => boolean',
      default: '—',
    },
    {
      name: 'keys()',
      description: 'All known keys with the prefix stripped.',
      type: '() => readonly string[]',
      default: '—',
    },
    {
      name: 'watch(key, fallback?)',
      description: 'Read as a signal. Follows writes from this tab and others.',
      type: '<T>(k: string, f?: T) => Signal<T | null>',
      default: '—',
    },
    {
      name: 'withStorage(options?)',
      description: 'The `provideWr()` feature: `prefix`, `json`, `ttl` and `engine`.',
      type: "(options?: WrStorageOptions) => WrFeature<'storage'>",
      default: '—',
    },
    {
      name: 'WR_STORAGE_ENGINE',
      description:
        'The active `Storage` engine. Provide it at bootstrap; a route or component provider is ignored unless it also provides `WrStorage`.',
      type: 'InjectionToken<Storage>',
      default: 'localStorage / memory fallback',
    },
    {
      name: 'createMemoryStorage()',
      description: 'An in-memory `Storage`, for tests.',
      type: '() => Storage',
      default: '—',
    },
    {
      name: 'WrStorageEnvelope',
      description: 'The stored format while `json` is on: value `v`, expiry `e` in epoch ms.',
      type: '{ readonly v: T; readonly e?: number }',
      default: '—',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Service',
      title: 'WrCookie',
      url: ['/reference/services', 'cookie'],
      description: 'The same API for cookies.',
    },
    {
      kind: 'Service',
      title: 'WrTheme',
      url: ['/reference/services', 'theme'],
      description: 'Stores the theme here.',
    },
  ];
}
