import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { labelSlug, labelTone } from '#core/utils';

/**
 * A page label: coloured by kind (Component, Directive, …), neutral for a trait
 * (Standalone, Signal Forms, …). As a link it opens every page with that label.
 */
@Component({
  selector: 'ngwr-doc-label',
  imports: [RouterLink],
  templateUrl: './doc-label.html',
  styleUrl: './doc-label.scss',
})
export class DocLabelComponent {
  readonly label = input.required<string>();

  /** Render as a link to the label's page. Off inside another link. */
  readonly link = input(true);

  /** `sm` is the uppercase chip a card carries. */
  readonly size = input<'sm' | 'md'>('md');

  protected readonly tone = computed(() => labelTone(this.label()));
  protected readonly url = computed(() => ['/labels', labelSlug(this.label())]);
}
