/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
} from '@angular/core';

import { provideWrIcons, WrIconComponent, chevronDown } from 'ngwr/icon';
import { randomId } from 'ngwr/utils';

import { WR_COLLAPSE_GROUP } from './tokens';

/**
 * Expandable panel with a clickable header. Two-way binds the `open`
 * state. When wrapped in `<wr-collapse-group accordion>`, only one
 * sibling can be open at a time.
 *
 * @example
 * ```html
 * <wr-collapse title="Section title">
 *   Section body…
 * </wr-collapse>
 *
 * <wr-collapse-group accordion>
 *   <wr-collapse title="A">…</wr-collapse>
 *   <wr-collapse title="B">…</wr-collapse>
 * </wr-collapse-group>
 * ```
 *
 * @see https://ngwr.dev/docs/components/collapse
 */
@Component({
  selector: 'wr-collapse',
  templateUrl: './collapse.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [WrIconComponent],
  providers: [provideWrIcons([chevronDown])],
})
export class WrCollapseComponent {
  /** Header text. */
  readonly title = input.required<string>();

  /** Two-way bindable open/closed state. @default false */
  readonly open = model<boolean>(false);

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Identity used by the parent group when tracking children. @internal */
  readonly id = { name: randomId('wr-collapse') };

  /** DOM id for the body element, referenced by header's `aria-controls`. */
  protected readonly bodyId = `wr-collapse-body-${this.id.name}`;

  private readonly group = inject(WR_COLLAPSE_GROUP, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  protected readonly classes = computed(() => {
    const parts = ['wr-collapse'];
    if (this.open()) parts.push('wr-collapse--open');
    if (this.disabled()) parts.push('wr-collapse--disabled');
    return parts.join(' ');
  });

  constructor() {
    if (this.group) {
      this.group.register({ id: this.id, close: () => this.open.set(false) });
      this.destroyRef.onDestroy(() => this.group?.unregister(this.id));

      // Tell the group whenever we open — group decides whether to close siblings.
      effect(() => {
        if (this.open()) this.group?.notifyOpened(this.id);
      });
    }
  }

  /** Open the panel. */
  openPanel(): void {
    if (this.disabled()) return;
    this.open.set(true);
  }

  /** Close the panel. */
  close(): void {
    this.open.set(false);
  }

  /** Toggle the panel. */
  toggle(): void {
    if (this.disabled()) return;
    this.open.update(v => !v);
  }
}
