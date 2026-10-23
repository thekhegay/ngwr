import { Component, DestroyRef, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrI18n } from 'ngwr/i18n';
import { WrMeta, WrMetaBinding, type WrMetaHandle } from 'ngwr/meta';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-svc-meta-page',
  templateUrl: './meta.html',
  imports: [
    WrButton,
    WrMetaBinding,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class MetaServicePageComponent {
  private readonly metaService = inject(WrMeta);
  protected readonly i18n = inject(WrI18n);

  private reactiveHandle: WrMetaHandle | null = null;
  protected readonly reactiveBound = signal(false);

  /** Mounts the `[wrMeta]` block, so the directive's own lifecycle is what the demo shows. */
  protected readonly directiveMounted = signal(false);

  constructor() {
    // The page's own `reactive` snippet tells a reader to pop the handle on
    // destroy, and the page did not. `bind()` creates its effect on the
    // ROOT-provided service's injector, so navigating away left the layer and
    // its effect alive: switch the locale on another page and the stale
    // binding re-applies, overwriting whatever title that page had pushed.
    inject(DestroyRef).onDestroy(() => this.reactiveHandle?.pop());
  }

  protected pushMeta(): void {
    const handle = this.metaService.push({
      title: 'Demo title pushed!',
      description: 'Open devtools → Elements → <head> to see the changes.',
    });
    setTimeout(() => handle.pop(), 4000);
  }

  /** Bind a locale-aware title — `i18n.t()` re-applies on every locale switch. */
  protected toggleReactiveTitle(): void {
    if (this.reactiveHandle) {
      this.reactiveHandle.pop();
      this.reactiveHandle = null;
      this.reactiveBound.set(false);
      return;
    }
    this.reactiveHandle = this.metaService.bind(() => ({ title: this.i18n.t('app.title') }));
    this.reactiveBound.set(true);
  }

  protected toggleLocale(): void {
    this.i18n.use(this.i18n.locale() === 'en' ? 'ru' : 'en');
  }

  protected readonly snippets = {
    defaults: `import { provideWr } from 'ngwr';
import { withMeta } from 'ngwr/meta';

providers: [
  provideWr(
    withMeta({
      titleTemplate: '{{ title }} · My app',
      description: 'What the app does, in one line.',
      og: { siteName: 'My app', type: 'website' },
      twitter: { card: 'summary_large_image' },
    }),
  ),
],`,
    push: `private readonly meta = inject(WrMeta);

ngOnInit() {
  const handle = this.meta.push({
    title: 'Pricing',
    description: 'Plans for every team.',
    og: { image: '/og/pricing.png' },
  });
  this.destroyRef.onDestroy(() => handle.pop());
}`,
    directive: `<div [wrMeta]="{ title: 'Pricing', description: 'Plans for every team.' }">
  …
</div>`,
    reactive: `private readonly meta = inject(WrMeta);
private readonly i18n = inject(WrI18n);

ngOnInit() {
  const handle = this.meta.bind(() => ({
    title: this.i18n.t('home.title'),
    description: this.i18n.t('home.description'),
  }));
  this.destroyRef.onDestroy(() => handle.pop());
}`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'set(config)',
      description: 'Replace the current top of the stack.',
      type: '(config: WrMetaConfig) => void',
      default: '—',
    },
    {
      name: 'push(config)',
      description: 'Push a layer. Returns `{ pop }`.',
      type: '(config: WrMetaConfig) => WrMetaHandle',
      default: '—',
    },
    {
      name: 'bind(factory)',
      description: 'Push a layer that re-applies when a signal read in `factory` changes. Returns `{ pop }`.',
      type: '(factory: () => WrMetaConfig) => WrMetaHandle',
      default: '—',
    },
    { name: 'pop()', description: 'Pop the most recently pushed layer.', type: '() => void', default: '—' },
    {
      name: 'reset()',
      description: 'Clear every layer and restore the `withMeta()` defaults.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'current()',
      description: 'A snapshot of `<head>` now. Not a signal: a template should read `resolved()`.',
      type: '() => Readonly<WrMetaConfig>',
      default: '—',
    },
    {
      name: 'resolved()',
      description: 'The merged configuration as a signal.',
      type: 'Signal<WrMetaConfig>',
      default: '—',
    },
    {
      name: '[wrMeta]',
      description: 'Pushes on init, re-pushes on change, pops on destroy.',
      type: 'WrMetaConfig',
      default: '—',
    },
  ];
}
