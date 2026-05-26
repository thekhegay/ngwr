import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { WrMetaService } from 'ngwr/meta';

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
  templateUrl: './meta.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class MetaServicePageComponent {
  private readonly metaService = inject(WrMetaService);

  protected pushMeta(): void {
    const handle = this.metaService.push({
      title: 'Demo title pushed!',
      description: 'Open devtools → Elements → <head> to see the changes.',
    });
    setTimeout(() => handle.pop(), 4000);
  }

  protected readonly snippets = {
    install: `import { provideWrMeta, WrMetaService } from 'ngwr/meta';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrMeta({
      titleTemplate: '%s · NGWR',
      og: { siteName: 'NGWR', type: 'website' },
      twitter: { card: 'summary_large_image', creator: '@thekhegay' },
    }),
  ],
});`,
    push: `private readonly meta = inject(WrMetaService);

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
