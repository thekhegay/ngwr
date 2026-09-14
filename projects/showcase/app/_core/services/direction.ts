import { type Direction, Directionality } from '@angular/cdk/bidi';
import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, PLATFORM_ID, Service, inject } from '@angular/core';

/**
 * Read by the pre-paint script in `index.html` as well, which is why the value
 * is stored as the bare string rather than through `WrStorage`'s JSON envelope —
 * the same shape `ngwr-primary` uses. Change the key in both places or neither.
 */
const STORAGE_KEY = 'ngwr-direction';

function isDirection(value: unknown): value is Direction {
  return value === 'ltr' || value === 'rtl';
}

/** SSR-safe `localStorage` read; `null` when unavailable or not a direction. */
function readStored(): Direction | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return isDirection(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** SSR-safe `localStorage` write; silently ignored when unavailable. */
function writeStored(direction: Direction): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, direction);
  } catch {
    // ignore (private mode / disabled storage)
  }
}

/**
 * The docs site's reading direction — the settings panel's LTR / RTL switch,
 * persisted so a reload (a dev-server live reload included) keeps what the
 * reviewer picked instead of dropping back to LTR.
 *
 * Both halves have to move together or the toggle lies. `dir` on the document
 * is what mirrors the CSS (every logical property resolves against it), and
 * `Directionality` is what the components read for their keyboard and pointer
 * maths — a slider's arrows, a tree's expand key, a table's column drag. The
 * CDK's ambient instance reads the document ONCE, in its constructor, so
 * flipping the attribute alone would mirror the layout and leave every
 * interaction facing the old way. Writing its `valueSignal` is the documented
 * way to move the other half.
 *
 * The first paint is handled before any of this runs: a blocking script in
 * `index.html` writes the stored `dir` onto `<html>`, so an RTL reader never sees
 * the prerendered LTR page, and the CDK then boots already agreeing with it. The
 * restore here is the half that does not depend on that script having run.
 */
@Service()
class SiteDirection {
  private readonly doc = inject(DOCUMENT);
  private readonly directionality = inject(Directionality);

  /** The current direction, as the components see it. */
  readonly current = this.directionality.valueSignal.asReadonly();

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    const stored = readStored();
    if (stored && (stored !== this.directionality.value || this.doc.documentElement.dir !== stored)) {
      this.apply(stored);
    }
  }

  /** Switch direction and remember it. Only an explicit pick is ever stored. */
  set(direction: Direction): void {
    if (!isDirection(direction)) return;
    this.apply(direction);
    writeStored(direction);
  }

  private apply(direction: Direction): void {
    this.doc.documentElement.dir = direction;
    this.directionality.valueSignal.set(direction);
    // Components that cache a direction-derived value listen to `change` rather
    // than reading the signal, so a write alone would leave those stale.
    this.directionality.change.emit(direction);
  }
}

export { SiteDirection };
