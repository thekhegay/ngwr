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
   * Offer the "Open in StackBlitz" action on this demo. @default false
   *
   * **Off by default, and the reason is a measurement rather than caution.** The
   * generated workspace is correct — written to disk it installs (433
   * dependencies), builds and renders: `ng build` reports a 565 kB initial
   * bundle and the page paints the snippet, icon and all. What has not worked
   * is the far end. A generated project POSTed to StackBlitz by hand reached
   * `ng serve` and died in the container's own build:
   *
   * > (esm) is not allowed to maintain invariants mandated by the ECMAScript
   * > specification. Try making at least part of the dependency in the graph
   * > lazily loaded. [plugin angular-compiler]
   * >     node_modules/rxjs/dist/esm/internal/scheduled/scheduled.js
   *
   * That is a resolution difference inside WebContainer — `dist/esm` rather than
   * the build a local install picks — not a defect in what this module emits,
   * and the platform is capable in principle: angular.dev's own playground runs
   * Angular 22 with a real `ng serve` in the same technology. Until someone has
   * watched a generated project serve, a first-impression button that lands on
   * a broken build is worse than no button, which is this module's stated
   * doctrine. Flip this default to `true` when it does.
   *
   * The button also hides itself when the source is not code an app can run
   * (a `bash` transcript, a stylesheet), independent of this input.
   */
  readonly sandboxable = input(false);

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
