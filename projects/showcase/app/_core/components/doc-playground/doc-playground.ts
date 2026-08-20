import { Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';

import { Zap } from 'lucide';
import { WrColorPickerTrigger } from 'ngwr/color-picker';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrInput } from 'ngwr/input';
import { WrOption, WrSelect } from 'ngwr/select';
import { WrSlider } from 'ngwr/slider';
import { WrSwitch } from 'ngwr/switch';

import { DocCodeComponent } from '../doc-code/doc-code';
import type { DocCodeFile } from '../doc-code/types';

import type { DocControl, DocSliderControl } from './types';

import { canSandbox, SandboxService, toSandboxFiles } from '#core/sandbox';
import type { ShikiLang } from '#core/shiki';

/**
 * Interactive demo card. Like `<ngwr-doc-snippet>` but with:
 *
 *  - A floating replay button on the preview (when `[showReplay]="true"`)
 *  - A "Customize" panel beneath the card with chip-style controls
 *    bound to writable signals on the host page.
 *
 * Each control is a `DocControl` descriptor (`select | slider | toggle |
 * text`). The chip reads `signal()` for its value and calls `.set()` on
 * change — so two-way binding happens via the signal itself, no
 * `(controlChange)` event needed.
 *
 * @example
 * ```ts
 * protected readonly splitType = signal<'chars' | 'words'>('chars');
 * protected readonly duration = signal(1.2);
 * protected readonly replayKey = signal(0);
 *
 * protected readonly controls: readonly DocControl[] = [
 *   { kind: 'select', label: 'Split Type', signal: this.splitType, options: ['chars', 'words'] },
 *   { kind: 'slider', label: 'Duration (s)', signal: this.duration, min: 0.2, max: 3, step: 0.1, precision: 1, unit: 's' },
 * ];
 * ```
 *
 * ```html
 * <ngwr-doc-playground
 *   [code]="snippets.basic"
 *   [controls]="controls"
 *   [showReplay]="true"
 *   (replay)="replayKey.update(n => n + 1)"
 * >
 *   @for (k of [replayKey()]; track k) {
 *     <wr-split-text [text]="text()" [splitType]="splitType()" [duration]="duration()" />
 *   }
 * </ngwr-doc-playground>
 * ```
 */
@Component({
  selector: 'ngwr-doc-playground',
  templateUrl: './doc-playground.html',
  styleUrl: './doc-playground.scss',
  imports: [
    DocCodeComponent,
    FormsModule,
    WrColorPickerTrigger,
    WrIcon,
    WrInput,
    WrOption,
    WrSelect,
    WrSlider,
    WrSwitch,
  ],
  // Adds to the root set rather than replacing it — `WrIconRegistry` walks the
  // injector chain — so the chips' own components keep their icons. The glyph
  // is lucide's `Zap` under a name that says what the button DOES; it is not
  // the StackBlitz mark.
  providers: [provideWrIcons(lucideIcons({ stackblitz: Zap }))],
})
export class DocPlaygroundComponent {
  /** Single source snippet shown beneath the preview. Pass `''` to omit. */
  readonly code = input<string>('');

  /** Shiki language for the single-file snippet. @default 'html' */
  readonly language = input<ShikiLang>('html');

  /** Multi-file source — rendered with a tab strip when set. */
  readonly files = input<readonly DocCodeFile[] | null>(null);

  protected readonly hasCode = computed(() => {
    const fs = this.files();
    if (fs?.some(f => f.code.trim().length > 0)) return true;
    return this.code().trim().length > 0;
  });

  /** Customise-panel controls. Empty array hides the panel. */
  readonly controls = input<readonly DocControl[]>([]);

  /** Render the floating replay button on the preview. @default false */
  readonly showReplay = input(false);

  /** Fired when the replay button is clicked. */
  readonly replay = output<void>();

  /**
   * Offer the "Open in StackBlitz" action on this demo. @default false
   *
   * The mirror of `<ngwr-doc-snippet>`'s input of the same name, kept so the
   * two components answer the same question the same way — including the
   * default, which is off for the reason recorded there: the workspace this
   * hands over builds and renders locally, and the container's own build of it
   * does not. Flip both together, not one.
   */
  readonly sandboxable = input(false);

  /** Name the generated project carries on StackBlitz. @default the page title */
  readonly sandboxTitle = input<string>('');

  protected readonly sandbox = inject(SandboxService);

  private readonly pageTitle = inject(Title);

  protected readonly sandboxFiles = computed(() => toSandboxFiles(this.files(), this.code(), this.language()));

  protected readonly canOpenSandbox = computed(() => this.sandboxable() && canSandbox(this.sandboxFiles()));

  protected openSandbox(): void {
    void this.sandbox.open({
      title: this.sandboxTitle() || this.pageTitle.getTitle() || 'ngwr example',
      files: this.sandboxFiles(),
    });
  }

  protected readonly hasControls = computed(() => this.controls().length > 0);

  // Chip handlers
  // Signals are non-narrow here on purpose — the template's @switch
  // discriminates by kind, and each branch only touches the right shape.

  protected inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  // `wr-select` publishes `unknown` and `wr-slider` publishes `number | [number,
  // number]`, because either can be right for a consumer. Binding their own models
  // rather than `ngModel` makes that width visible, so the narrowing lives here —
  // where the control's `kind` already says what the value has to be.
  protected setStr(c: DocControl, v: unknown): void {
    if (typeof v !== 'string') return;
    if (c.kind === 'select' || c.kind === 'text' || c.kind === 'color') c.signal.set(v);
  }

  protected setNum(c: DocControl, v: number | readonly [number, number]): void {
    if (typeof v !== 'number' || Number.isNaN(v)) return;
    if (c.kind === 'slider') c.signal.set(v);
  }

  protected toggle(c: DocControl): void {
    if (c.kind === 'toggle') c.signal.set(!c.signal());
  }

  protected display(c: DocSliderControl): string {
    const v = c.signal().toFixed(c.precision ?? 0);
    return c.unit ? `${v} ${c.unit}` : v;
  }

  protected onReplayClick(): void {
    this.replay.emit();
  }
}
