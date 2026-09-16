/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, TemplateRef, inject } from '@angular/core';

import type { WrOptionLeadingContext } from './interfaces';

/**
 * A leading visual — an avatar, an icon, a colour dot — drawn before an
 * option's label, and kept out of that label.
 *
 * It is a TEMPLATE, and that is the point. Projected `<wr-option>` children are
 * created as soon as the page renders, panel open or not, so an avatar written
 * straight into each option is 200 components and 200 image requests for an
 * assignee picker nobody has opened. A template is only instantiated where it is
 * drawn:
 *
 * - in an option row, while the panel is OPEN — destroyed again when it closes,
 *   and under `virtualScroll` only for the rows in the rendered window;
 * - in a selected chip on a `mode="multi"` trigger, one per visible chip;
 * - beside the selected value on a single-mode BUTTON trigger — one copy;
 * - before the input on a SEARCH-shaped trigger (`mode="search"`, a searchable
 *   single), while that input is showing the selected label. It goes beside the
 *   field rather than into it — an `<input>` holds a string — and it steps aside
 *   while a query is on screen, panel open or half-typed, because the value it
 *   names is not what the field is showing then. Picking an option brings it
 *   back with the label. Stepping aside is a DESTROY, like a closing panel's
 *   rows, so an `<img>`-backed visual re-mounts once per open-and-dismiss.
 *
 * Every copy sits in an `aria-hidden` wrapper and is skipped when the option's
 * text is read, so the trigger label, the chip, the search filter and the
 * option's accessible name all stay the option's words — never "ХР Хегай Роман".
 * Anything the visual says has to be said by the label as well.
 *
 * Two places to declare it. Inside a `<wr-option>` it belongs to that option.
 * As a DIRECT child of `<wr-select>` it is the default for every row, which is the
 * only way to reach rows the select draws itself — `[options]`, `[loader]`
 * results and virtual rows. An option's own template wins over the select's.
 *
 * @example
 * ```html
 * <wr-select mode="multi" placeholder="Assignees" [(value)]="assignees">
 *   @for (p of people; track p.id) {
 *     <wr-option [value]="p.id">
 *       <ng-template wrOptionLeading let-placement="placement">
 *         <wr-avatar shape="circle" [size]="placement === 'chip' ? 16 : 24" [url]="p.photo">{{ p.initials }}</wr-avatar>
 *       </ng-template>
 *       {{ p.name }}
 *     </wr-option>
 *   }
 * </wr-select>
 * ```
 */
@Directive({
  selector: 'ng-template[wrOptionLeading]',
})
export class WrOptionLeading {
  readonly template = inject<TemplateRef<WrOptionLeadingContext>>(TemplateRef);

  /**
   * Types the template's `let-` variables under `strictTemplates`. Without it
   * `let-placement` is `any`, and indexing a `Record<WrOptionLeadingPlacement, …>`
   * with it — the obvious way to size one visual per surface — does not compile.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a guard's parameters exist to be narrowed, never read
  static ngTemplateContextGuard(_dir: WrOptionLeading, _ctx: unknown): _ctx is WrOptionLeadingContext {
    return true;
  }
}
