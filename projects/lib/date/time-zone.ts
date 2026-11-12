/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isDevMode } from '@angular/core';

/**
 * A display time zone, resolved: a fixed offset in minutes east of UTC, or an
 * IANA name with the formatter that reads its wall clock.
 *
 * @internal
 */
type WrResolvedZone =
  | { readonly kind: 'offset'; readonly id: string; readonly minutes: number }
  | { readonly kind: 'iana'; readonly id: string; readonly fields: Intl.DateTimeFormat };

/** `+05:00`, `+0530`, `-03`. */
const OFFSET = /^([+-])(\d{2})(?::?(\d{2}))?$/;

const MINUTE = 60_000;

const resolved = new Map<string, WrResolvedZone | null>();

/**
 * `Date.UTC` with the year taken literally: it reads one under 100 as 1900 + year.
 *
 * @internal
 */
function wrUtcTime(year: number, month: number, day: number, hours = 0, minutes = 0, seconds = 0, millis = 0): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(hours, minutes, seconds, millis);
  return date.getTime();
}

/**
 * What `withDates({ timeZone })` resolved to, or `null` for the browser's zone:
 * nothing set, or a value no engine knows, which warns once per value in dev mode.
 *
 * @internal
 */
function wrResolveZone(value: string | null | undefined): WrResolvedZone | null {
  const id = value?.trim();
  if (!id) return null;
  const known = resolved.get(id);
  if (known !== undefined) return known;

  let zone: WrResolvedZone | null = null;
  const offset = OFFSET.exec(id);
  if (offset) {
    const hours = Number(offset[2]);
    const minutes = Number(offset[3] ?? 0);
    if (hours <= 23 && minutes <= 59) {
      zone = { kind: 'offset', id, minutes: (offset[1] === '-' ? -1 : 1) * (hours * 60 + minutes) };
    }
  } else {
    try {
      zone = {
        kind: 'iana',
        id,
        fields: new Intl.DateTimeFormat('en-US', {
          timeZone: id,
          calendar: 'gregory',
          numberingSystem: 'latn',
          hourCycle: 'h23',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        }),
      };
    } catch {
      // `RangeError`: not a zone this engine knows.
    }
  }

  if (!zone && isDevMode()) {
    // eslint-disable-next-line no-console -- dev-mode validation
    console.warn(
      `[NGWR] withDates({ timeZone }) got '${id}', which is neither an IANA time zone this browser knows ` +
        `nor an offset such as '+05:00'. Dates are shown in the browser's own time zone.`
    );
  }
  resolved.set(id, zone);
  return zone;
}

/**
 * The zone's wall clock at an instant, as the epoch time of a `Date` whose UTC
 * fields read it. UTC has no daylight saving, so every wall clock of every zone
 * has exactly one such time, which a `Date` read with local getters cannot say.
 *
 * @internal
 */
function wrZoneWallTime(time: number, zone: WrResolvedZone | null): number {
  if (!zone) return time - new Date(time).getTimezoneOffset() * MINUTE;
  if (zone.kind === 'offset') return time + zone.minutes * MINUTE;

  const read: Record<string, number> = {};
  for (const part of zone.fields.formatToParts(time)) read[part.type] = Number(part.value);
  const millis = ((time % 1000) + 1000) % 1000;
  return wrUtcTime(read['year'], read['month'] - 1, read['day'], read['hour'], read['minute'], read['second'], millis);
}

/**
 * The instant a wall clock (see {@link wrZoneWallTime}) names in the zone. A
 * wall clock a daylight-saving change skips lands after the change, as
 * `new Date(y, m, d, h)` does for the browser's own zone.
 *
 * @internal
 */
function wrZoneInstant(wall: number, zone: WrResolvedZone | null): number {
  if (!zone) {
    const w = new Date(wall);
    const local = new Date(0);
    local.setFullYear(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate());
    local.setHours(w.getUTCHours(), w.getUTCMinutes(), w.getUTCSeconds(), w.getUTCMilliseconds());
    return local.getTime();
  }
  if (zone.kind === 'offset') return wall - zone.minutes * MINUTE;

  // The offset is known only for an instant, so guess with the offset the wall
  // clock would have as an instant and correct once: two passes settle
  // everything but a skipped hour, which has no answer to settle on.
  const first = wall - (wrZoneWallTime(wall, zone) - wall);
  const second = wall - (wrZoneWallTime(first, zone) - first);
  return second;
}

export { wrResolveZone, wrUtcTime, wrZoneInstant, wrZoneWallTime };
export type { WrResolvedZone };
