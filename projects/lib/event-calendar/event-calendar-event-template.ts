/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { Directive, TemplateRef, inject } from '@angular/core';

import type { WrCalendarEventContext } from './interfaces';

/**
 * Replace the chip's contents. The event is the implicit context; the chip
 * itself — its button, its position and its drag handling — stays with the
 * calendar, so a custom template cannot break the geometry.
 *
 * @example
 * ```html
 * <wr-event-calendar [events]="events">
 *   <ng-template wrCalendarEvent let-event>
 *     <strong>{{ event.title }}</strong> — {{ event.data.room }}
 *   </ng-template>
 * </wr-event-calendar>
 * ```
 */
@Directive({
  selector: 'ng-template[wrCalendarEvent]',
})
export class WrCalendarEventTemplate {
  readonly template = inject<TemplateRef<WrCalendarEventContext>>(TemplateRef);
}
