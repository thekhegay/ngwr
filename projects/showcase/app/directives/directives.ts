import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  WrAutofocus,
  WrAutosize,
  WrBorderGlow,
  WrClickOutside,
  WrCopyToClipboard,
  WrReveal,
  WrShimmer,
  WrSpotlight,
  WrTilt,
} from 'ngwr/directives';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-directives-page',
  templateUrl: './directives.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    WrAutofocus,
    WrAutosize,
    WrBorderGlow,
    WrClickOutside,
    WrCopyToClipboard,
    WrReveal,
    WrShimmer,
    WrSpotlight,
    WrTilt,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class DirectivesPageComponent {
  protected readonly textareaValue = signal('Type more lines\nto see\nthis grow…');
  protected readonly clipboardText = signal('Hello from ngwr!');
  protected readonly copied = signal<string>('');
  protected readonly outside = signal<number>(0);
  protected readonly autofocusOn = signal(true);

  protected onCopied(text: string): void {
    this.copied.set(text);
  }

  protected onOutside(): void {
    this.outside.update(n => n + 1);
  }

  protected toggleAutofocus(): void {
    this.autofocusOn.update(v => !v);
  }

  protected readonly snippets = {
    install: `import {
  WrAutofocus,
  WrAutosize,
  WrBorderGlow,
  WrClickOutside,
  WrCopyToClipboard,
  WrReveal,
  WrShimmer,
  WrSpotlight,
  WrTilt,
} from 'ngwr/directives';`,

    autofocus: `<input wrAutofocus placeholder="Focused on init" />
<input [wrAutofocus]="shouldFocus()" />`,

    autosize: `<textarea wrAutosize minRows="2" maxRows="8" [(ngModel)]="text"></textarea>`,

    borderGlow: `<!-- Loads from 'ngwr/animations' — make sure it's imported. -->
<div wrBorderGlow [speed]="6" [thickness]="2" class="card">…</div>`,

    clickOutside: `<div class="popup" (wrClickOutside)="close()"> … </div>`,

    clipboard: `<button [wrCopyToClipboard]="value" (copied)="toast('Copied!')">Copy</button>`,

    reveal: `<!-- Add 'ngwr/animations' for the .wr-reveal enter styles. -->
<h2 wrReveal>Animates in once visible</h2>
<div wrReveal threshold="0.5" rootMargin="-100px 0px">…</div>
<p wrReveal [once]="false">Re-runs on every entry</p>`,

    shimmer: `<!-- Add 'ngwr/animations' for the .wr-shimmer keyframes. -->
<h1 wrShimmer>Premium</h1>`,

    spotlight: `<!-- Cursor-following radial highlight. -->
<div wrSpotlight class="hero-card">…</div>`,

    tilt: `<!-- Cursor-tracked 3D tilt. Adjusts perspective on hover. -->
<div wrTilt [maxTilt]="10" [scale]="1.02">
  <img src="…" />
</div>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrAutofocus]',
      description: 'Focus host on init, or whenever the bound expression becomes truthy.',
      type: 'boolean (default true)',
      default: '—',
    },
    {
      name: '[wrAutosize]',
      description: 'Auto-grow <textarea> based on scrollHeight; bounded by minRows / maxRows.',
      type: 'directive on textarea',
      default: '—',
    },
    {
      name: '[wrBorderGlow]',
      description: 'Animated rotating conic-gradient border. `[speed]` (seconds) and `[thickness]` (px) inputs.',
      type: 'directive',
      default: '—',
    },
    {
      name: '(wrClickOutside)',
      description: 'Emits when a mousedown event lands outside the host element.',
      type: 'EventEmitter<MouseEvent>',
      default: '—',
    },
    {
      name: '[wrCopyToClipboard]',
      description: 'Copies the bound string on host click. `(copied)` / `(copyFailed)` outputs.',
      type: 'string',
      default: '—',
    },
    {
      name: '[wrReveal]',
      description: 'Adds `.wr-reveal--visible` once the host enters the viewport. Pair with `ngwr/animations` styles.',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrShimmer]',
      description: 'Applies a moving highlight sweep to text. Pair with `ngwr/animations` for keyframes.',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrSpotlight]',
      description: 'Cursor-following radial highlight on hover — gives flat cards interactive depth.',
      type: 'directive',
      default: '—',
    },
    {
      name: '[wrTilt]',
      description: '3D tilt that follows the cursor. `[maxTilt]` degrees and `[scale]` factor inputs.',
      type: 'directive',
      default: '—',
    },
  ];
}
