import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { WrStorage } from 'ngwr/storage';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-storage-page',
  templateUrl: './storage.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
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
    install: `import { provideWrStorage, WrStorage } from 'ngwr/storage';

bootstrapApplication(AppComponent, {
  providers: [
    // Optional — defaults to localStorage with an in-memory SSR fallback.
    provideWrStorage({ prefix: 'myapp:', ttl: 24 * 60 * 60 * 1000 }),
  ],
});`,
    swap: `// Swap the engine globally (e.g. sessionStorage for a tab-only app):
provideWrStorage({ engine: sessionStorage })

// Or lazily — useful when wrapping with encryption / IndexedDB / a worker bridge:
provideWrStorage({ engine: () => new EncryptedStorage(localStorage, key) })

// Or directly via the token (per-feature overrides through nested injectors):
providers: [{ provide: WR_STORAGE_ENGINE, useValue: sessionStorage }]`,
    usage: `private readonly store = inject(WrStorage);

this.store.set('user', { name: 'Ada' });
this.store.get<{ name: string }>('user');         // → { name: 'Ada' }

this.store.set('cart', items, { ttl: 60_000 });   // expires in 60s
this.store.has('cart');                            // true → false after 60s

const theme = this.store.watch<'light' | 'dark'>('theme', 'light');
effect(() => console.log('theme is', theme()));`,
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
      description: 'Write a value. Per-call `ttl` (ms) overrides config default.',
      type: '<T>(k: string, v: T, opts?: { ttl?: number }) => void',
      default: '—',
    },
    { name: 'remove(key)', description: 'Remove the value at `key`.', type: '(k: string) => void', default: '—' },
    {
      name: 'clear()',
      description: 'Clear all keys under our prefix (or everything when prefix is empty).',
      type: '() => void',
      default: '—',
    },
    {
      name: 'has(key)',
      description: 'Whether the key is present (ignoring expiry).',
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
      description: 'Reactive read. Updates on local writes and cross-tab `storage` events.',
      type: '<T>(k: string, f?: T) => Signal<T | null>',
      default: '—',
    },
    {
      name: 'provideWrStorage(opts?)',
      description: 'Configure prefix, json, ttl, and swap the engine.',
      type: '(opts?) => EnvironmentProviders',
      default: '—',
    },
    {
      name: 'WR_STORAGE_ENGINE',
      description: 'InjectionToken for the active `Storage` engine — override at any level to swap.',
      type: 'InjectionToken<Storage>',
      default: 'localStorage / memory fallback',
    },
    {
      name: 'createMemoryStorage()',
      description: 'Map-backed `Storage` shim. Useful for tests.',
      type: '() => Storage',
      default: '—',
    },
  ];
}
