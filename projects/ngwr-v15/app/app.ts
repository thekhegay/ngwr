import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrTheme } from 'ngwr/theme';

import { INTENTS, PAIRS, TW } from './palette';

interface Row {
  readonly label: string;
  readonly note: string;
  readonly ours: string | null;
  readonly oursName: string;
  readonly theirs: string;
  readonly theirsName: string;
  readonly same: boolean;
  readonly oursRatio: string;
  readonly theirsRatio: string;
}

/**
 * A colour as the eye receives it — alpha COMPOSITED over what is behind it.
 *
 * Dropping the alpha is not a rounding error here: `--wr-border-subtle` and
 * `-strong` are the same base at 0.35 and 0.6, so a parser that keeps three
 * channels and throws the fourth away reports all three border tokens as one
 * colour at one ratio, which is what this page did until it was looked at.
 */
const hex = (v: string, over = '#ffffff'): string | null => {
  const trimmed = v.trim();
  const plain = /^#([0-9a-f]{6})$/i.exec(trimmed);
  if (plain) return `#${plain[1]}`;

  const rgb = /^rgba?\(([^)]+)\)$/.exec(trimmed);
  if (!rgb) return null;
  const parts = rgb[1].split(/[,/]/).map(n => Number(n.trim()));
  const [r, g, b] = parts;
  const a = parts.length > 3 && Number.isFinite(parts[3]) ? parts[3] : 1;

  const bg = /^#([0-9a-f]{6})$/i.test(over) ? over : '#ffffff';
  const back = [1, 3, 5].map(i => parseInt(bg.slice(i, i + 2), 16));
  const mix = [r, g, b].map((c, i) => Math.round(c * a + back[i] * (1 - a)));
  return `#${mix.map(n => n.toString(16).padStart(2, '0')).join('')}`;
};

const lum = (h: string): number => {
  // Sliced rather than shifted — the repo lints bitwise operators out.
  const ch = [h.slice(1, 3), h.slice(3, 5), h.slice(5, 7)].map(pair => {
    const s = parseInt(pair, 16) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};

const ratio = (a: string | null, b: string | null): string => {
  if (!a || !b) return '—';
  const [x, y] = [lum(a), lum(b)];
  return ((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
};

/** Our palette beside Tailwind's, ours read out of the compiled theme. */
@Component({
  selector: 'sbx-root',
  templateUrl: './app.html',
  styleUrls: ['./app.scss', './palette.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [WrButton],
})
export class AppComponent {
  protected readonly theme = inject(WrTheme);

  /** Bumped on every theme flip so the computed reads re-run. */
  private readonly tick = signal(0);

  protected toggleTheme(): void {
    this.theme.set(this.theme.resolved() === 'dark' ? 'light' : 'dark');
    requestAnimationFrame(() => this.tick.update(n => n + 1));
  }

  private read(token: string, over?: string): string | null {
    this.tick();
    this.theme.resolved();
    if (typeof document === 'undefined') return null;
    const style = getComputedStyle(document.documentElement);
    const raw = style.getPropertyValue(token);
    if (!raw) return null;
    // Default the ground to the live canvas, read straight rather than through
    // `canvas()` — that computed calls this one, and would recurse.
    const ground = over ?? hex(style.getPropertyValue('--wr-color-surface')) ?? '#ffffff';
    return hex(raw, ground);
  }

  private tw(path: string): string {
    const [family, step] = path.split('.');
    return (TW as unknown as Record<string, Record<string, string>>)[family][step];
  }

  /** The canvas each column is measured against — ours, in the live theme. */
  protected readonly canvas = computed(() => this.read('--wr-color-surface') ?? '#ffffff');

  private rows(
    pairs: readonly { readonly ours: string; readonly light: string; readonly dark: string; readonly note?: string }[]
  ): readonly Row[] {
    const bg = this.canvas();
    const isDark = this.theme.resolved() === 'dark';
    return pairs.map(p => {
      const ours = p.ours.startsWith('--') ? this.read(p.ours) : null;
      const theirs = this.tw(isDark ? p.dark : p.light);
      return {
        label: p.ours ? p.ours.replace('--wr-color-', '') : '(no step)',
        note: p.note ?? '',
        ours,
        oursName: ours ?? '—',
        theirs,
        theirsName: theirs,
        same: ours !== null && ours.toLowerCase() === theirs.toLowerCase(),
        oursRatio: ratio(ours, bg),
        theirsRatio: ratio(theirs, bg),
      };
    });
  }

  protected readonly ramp = computed(() => this.rows(PAIRS));

  /**
   * The renamed border family, live, with the one step the ramp does not have.
   * `aa` is not a token — it is the value a control border would need to meet
   * WCAG 1.4.11, shown so the gap is a number rather than an argument.
   */
  protected readonly borders = computed(() => {
    this.tick();
    const bg = this.canvas();
    const dark = this.theme.resolved() === 'dark';
    const live = (t: string): string | null => this.read(t);
    const rows: { name: string; value: string | null; ratio: string; note: string; decide: boolean }[] = [
      {
        name: '--wr-border-subtle',
        value: live('--wr-border-subtle'),
        ratio: '',
        note: 'the quiet end',
        decide: false,
      },
      {
        name: '--wr-border-base',
        value: live('--wr-border-base'),
        ratio: '',
        note: 'what 209 declarations draw — unchanged',
        decide: false,
      },
      {
        name: '--wr-border-strong',
        value: live('--wr-border-strong'),
        ratio: '',
        note: 'WHAT SHIPS TODAY — the ramp’s own next step, short of 1.4.11',
        decide: true,
      },
      {
        name: '(not a token)',
        value: dark ? '#4d608a' : '#718cad',
        ratio: '',
        note: 'WHAT 1.4.11 WOULD NEED — darker than the ramp’s rhythm, so every control edge gets heavier',
        decide: true,
      },
    ];
    return rows.map(r => ({ ...r, ratio: ratio(r.value, bg) }));
  });
  protected readonly intents = computed(() => this.rows(INTENTS));
}
