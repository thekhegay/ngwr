import { Component, inject, signal } from '@angular/core';

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
    install: `import { provideWrMeta, WrMeta } from 'ngwr/meta';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrMeta({
      titleTemplate: '{{ title }} · NGWR',
      og: { siteName: 'NGWR', type: 'website' },
      twitter: { card: 'summary_large_image', creator: '@thekhegay' },
    }),
  ],
});`,
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
      description: 'Snapshot of the resolved metadata currently applied to <head>.',
      type: '() => Readonly<WrMetaConfig>',
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
