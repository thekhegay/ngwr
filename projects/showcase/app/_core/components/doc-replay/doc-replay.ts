import {
  Component,
  TemplateRef,
  ViewContainerRef,
  contentChild,
  effect,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { WrButton } from 'ngwr/button';

/**
 * A one-shot demo and the control that plays it again.
 *
 * An entrance effect plays once, by design, and has no method to restart: the
 * honest replay is a fresh host, so the effect runs the path a reader's page
 * runs. The demo is projected as an `<ng-template>` and rendered into an
 * outlet; Replay clears the outlet and creates the view anew. A `@for` keyed by
 * a counter re-creates it too, and warns `NG0956` on every click for doing so.
 *
 * The view is created from an effect, so the server renders the demo as well:
 * `<wr-letter-stagger>` starts from the prerendered pieces, which is the whole
 * point of that effect.
 *
 * @example
 * ```html
 * <ngwr-doc-replay>
 *   <ng-template><h2 wrBlurReveal>Signal Forms, with nothing in between.</h2></ng-template>
 * </ngwr-doc-replay>
 * ```
 */
@Component({
  selector: 'ngwr-doc-replay',
  templateUrl: './doc-replay.html',
  styleUrl: './doc-replay.scss',
  imports: [WrButton],
})
export class DocReplayComponent {
  private readonly demo = contentChild.required(TemplateRef);
  private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });

  /** Counts the replays; the effect below reads it, so each click re-creates the view. */
  private readonly run = signal(0);

  constructor() {
    effect(() => {
      const outlet = this.outlet();
      const demo = this.demo();
      this.run();
      untracked(() => {
        outlet.clear();
        outlet.createEmbeddedView(demo);
      });
    });
  }

  protected replay(): void {
    this.run.update(n => n + 1);
  }
}
