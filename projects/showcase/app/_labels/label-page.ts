import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { map } from 'rxjs';

import { DocPageComponent, DocSeeAlsoComponent, type DocSeeAlsoKind, type DocSeeAlsoLink } from '#core/components';
import { labelIndex } from '#core/utils';

const INDEX = labelIndex();

/** Every page carrying one label: `/labels/signal-forms`. */
@Component({
  selector: 'ngwr-label-page',
  imports: [DocPageComponent, DocSeeAlsoComponent],
  templateUrl: './label-page.html',
})
export default class LabelPage {
  private readonly slug = toSignal(inject(ActivatedRoute).paramMap.pipe(map(p => p.get('label') ?? '')), {
    initialValue: '',
  });

  protected readonly entry = computed(() => INDEX.get(this.slug()) ?? null);

  protected readonly description = computed(() => {
    const n = this.entry()?.pages.length ?? 0;
    return n === 1 ? 'One page has this label.' : `${n} pages have this label.`;
  });

  protected readonly links = computed<readonly DocSeeAlsoLink[]>(() =>
    (this.entry()?.pages ?? []).map(p => ({
      title: p.title,
      url: [`/${p.route}`],
      kind: (p.kind ?? undefined) as DocSeeAlsoKind | undefined,
    }))
  );
}
