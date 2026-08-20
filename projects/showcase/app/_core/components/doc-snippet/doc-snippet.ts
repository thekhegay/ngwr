import { Component, computed, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { Zap } from 'lucide';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

import { DocCodeComponent } from '../doc-code/doc-code';
import type { DocCodeFile } from '../doc-code/types';

import { canSandbox, SandboxService, toSandboxFiles } from '#core/sandbox';
import type { ShikiLang } from '#core/shiki';

/**
 * Live demo paired with its source code.
 *
 * Project the live demo as default content; pass the matching source via
 * the `code` input (single file) or `files` (multi-tab). Empty source
 * collapses the code block, leaving just the demo. Indentation is
 * normalized internally.
 *
 * @example
 * ```html
 * <ngwr-doc-snippet [code]="'<wr-badge>New</wr-badge>'">
 *   <wr-badge>New</wr-badge>
 * </ngwr-doc-snippet>
 *
 * <ngwr-doc-snippet [files]="[{ label: 'TS', language: 'angular-ts', code: tsCode }, …]">
 *   <wr-foo />
 * </ngwr-doc-snippet>
 * ```
 */
@Component({
  selector: 'ngwr-doc-snippet',
  templateUrl: './doc-snippet.html',
  styleUrl: './doc-snippet.scss',
  imports: [DocCodeComponent, WrIcon],
  // A component-level registration ADDS to the root set rather than replacing
  // it — `WrIconRegistry` walks the injector chain — so `monitor` and
  // `smartphone` from `COMMON_ICONS` keep resolving beside this one. The glyph
  // is lucide's `Zap` under a name that says what the button DOES; it is not
  // the StackBlitz mark, which is not lucide's to ship.
  providers: [provideWrIcons(lucideIcons({ stackblitz: Zap }))],
})
export class DocSnippetComponent {
  readonly code = input<string>('');
  readonly language = input<ShikiLang>('html');
  readonly files = input<readonly DocCodeFile[] | null>(null);

  /** Offer the phone-frame preview toggle on this demo. @default true */
  readonly framable = input(true);

  /**
   * Offer the "Open in StackBlitz" action on this demo. @default true
   *
   * It was off for a while and the reason is worth keeping, because it is what
   * the two fixes below were aimed at. A generated project used to die in
   * StackBlitz's container — first on `npm install`, then in the container's
   * own build, on `rxjs/dist/esm/internal/scheduled/scheduled.js` with an
   * ECMAScript-invariant error out of rolldown. Two things in the emitted
   * workspace caused it and both were ours:
   *
   * 1. no `development` configuration, so `ng serve` ran the OPTIMIZED build on
   *    every start — the dev server says so itself ("Prebundling has been
   *    configured but will not be used because scripts optimization is
   *    enabled"), and that is the path rolldown died on;
   * 2. `@use 'ngwr';`, which compiles all hundred-and-twenty component
   *    stylesheets to serve a two-element demo. Narrowed to the entry points
   *    the snippet renders, the CSS went from 287 kB to 44 kB and the container
   *    stopped running out of memory.
   *
   * With both fixed, a generated project was POSTed by hand and watched
   * through: install, `ng serve`, "Application bundle generation complete
   * [25.8 seconds]", and the demo painted in the preview pane — button, icon
   * and tag. That is the evidence this default rests on, and it is a single
   * observation rather than a guarantee: the cold path is roughly two and a
   * half minutes, and how long a container takes is StackBlitz's call.
   *
   * The button also hides itself when the source is not code an app can run
   * (a `bash` transcript, a stylesheet), independent of this input.
   */
  readonly sandboxable = input(true);

  /**
   * Name the generated project carries on StackBlitz. Defaults to the document
   * title, which is the page the visitor clicked from.
   */
  readonly sandboxTitle = input<string>('');

  /** Whether the demo is currently rendered inside a phone frame. */
  protected readonly framed = signal(false);

  protected readonly sandbox = inject(SandboxService);

  private readonly pageTitle = inject(Title);

  /** Drives the border between demo + code (hidden when nothing to show). */
  protected readonly hasCode = computed(() => {
    const fs = this.files();
    if (fs?.some(f => f.code.trim().length > 0)) return true;
    return this.code().trim().length > 0;
  });

  protected readonly sandboxFiles = computed(() => toSandboxFiles(this.files(), this.code(), this.language()));

  protected readonly canOpenSandbox = computed(() => this.sandboxable() && canSandbox(this.sandboxFiles()));

  protected openSandbox(): void {
    void this.sandbox.open({
      title: this.sandboxTitle() || this.pageTitle.getTitle() || 'ngwr example',
      files: this.sandboxFiles(),
    });
  }
}
