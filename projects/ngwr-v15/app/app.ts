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

const hex = (v: string): string | null => {
  const m = /^#([0-9a-f]{6})$/i.exec(v.trim());
  if (m) return `#${m[1]}`;
  const rgb = /^rgba?\(([^)]+)\)$/.exec(v.trim());
  if (!rgb) return null;
  const [r, g, b] = rgb[1].split(',').map(n => Number(n.trim()));
  return `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`;
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

  private read(token: string): string | null {
    this.tick();
    this.theme.resolved();
    if (typeof document === 'undefined') return null;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(token);
    return raw ? hex(raw) : null;
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
  protected readonly intents = computed(() => this.rows(INTENTS));
}
