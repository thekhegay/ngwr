import { Component, DestroyRef, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrI18n } from 'ngwr/i18n';
import { WrMeta, type WrMetaHandle } from 'ngwr/meta';

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
  imports: [WrButton, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class MetaServicePageComponent {
  private readonly metaService = inject(WrMeta);
  protected readonly i18n = inject(WrI18n);

  private reactiveHandle: WrMetaHandle | null = null;
  protected readonly reactiveBound = signal(false);

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
    push: `private readonly meta = inject(WrMeta);

ngOnInit() {
  const handle = this.meta.push({
    title: 'Pricing',
    description: 'Plans for every team.',
    og: { image: '/og/pricing.png' },
  });
  this.destroyRef.onDestroy(() => handle.pop());
}`,
    directive: `<!-- Auto-pops on destroy. Perfect for route components. -->
<div [wrMeta]="{ title: 'Pricing', description: 'Plans for every team.' }">
  …
</div>`,
    reactive: `private readonly meta = inject(WrMeta);
private readonly i18n = inject(WrI18n);

ngOnInit() {
  // \`i18n.t(...)\` tracks the active locale, so the document title
  // re-renders automatically whenever the language changes — no
  // manual re-set on \`NavigationEnd\` or a locale subscription.
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
      description: 'Push a new layer. Returns `{ pop }` — call `.pop()` to remove.',
      type: '(config: WrMetaConfig) => WrMetaHandle',
      default: '—',
    },
    {
      name: 'bind(factory)',
      description:
        'Reactive layer — re-applies whenever a signal read inside `factory` changes (e.g. `WrI18n.t()` on locale switch). Returns `{ pop }`.',
      type: '(factory: () => WrMetaConfig) => WrMetaHandle',
      default: '—',
    },
    { name: 'pop()', description: 'Pop the most recently pushed layer.', type: '() => void', default: '—' },
    {
      name: 'reset()',
      description: 'Clear all overrides, restore defaults registered via provideWrMeta.',
      type: '() => void',
      default: '—',
    },
    {
      name: 'current()',
      description:
        'A SNAPSHOT of what is in `<head>` right now — a plain method, not a signal, so a template reading it does not re-render when the stack changes. Reach for it from code that is already running at the moment it asks.',
      type: '() => Readonly<WrMetaConfig>',
      default: '—',
    },
    {
      name: 'resolved()',
      description:
        'The same merged configuration, as a SIGNAL — the reactive half, and what a template or a `computed()` should read. It follows every `set()`, `push()` and `pop()`; `current()` only answers for the instant you call it.',
      type: 'Signal<WrMetaConfig>',
      default: '—',
    },
    {
      name: '[wrMeta]',
      description: 'Directive: pushes on init, re-pushes on input change, pops on destroy.',
      type: 'WrMetaConfig',
      default: '—',
    },
  ];
}
