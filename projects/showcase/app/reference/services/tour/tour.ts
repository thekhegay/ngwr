import { Component, inject } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrInput } from 'ngwr/input';
import { WrTour } from 'ngwr/tour';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-tour-page',
  templateUrl: './tour.html',
  imports: [
    WrButton,
    WrInput,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TourComponent {
  protected readonly tour = inject(WrTour);

  protected start(): void {
    this.tour.start([
      {
        target: '[data-tour="search"]',
        title: 'Start here',
        content: 'Type a name and the list narrows as you go.',
      },
      {
        target: '[data-tour="filter"]',
        title: 'Narrow it down',
        content: 'Filters stack — pick as many as you like.',
        placement: 'right',
      },
      {
        target: '[data-tour="save"]',
        content: 'Nothing is saved until you press this.',
        placement: 'top',
      },
      {
        // Deliberately absent from the page: a tour survives a step whose
        // target is behind a permission or a feature flag.
        target: '[data-tour="does-not-exist"]',
        content: 'You should never see this step.',
      },
    ]);
  }

  protected readonly snippets = {
    install: `import { WrTour } from 'ngwr/tour';

// Nothing to import into a component — the service owns the overlay.
private readonly tour = inject(WrTour);`,
    start: `this.tour.start([
  { target: '[data-tour="search"]', title: 'Start here', content: 'Type a name…' },
  { target: '[data-tour="filter"]', content: 'Filters stack.', placement: 'right' },
  { target: '[data-tour="save"]', content: 'Nothing is saved until you press this.', placement: 'top' },
]);`,
    state: `// Signals, so a template can react without a subscription.
tour.active();  // is a tour running
tour.index();   // 0-based step, -1 when idle
tour.total();   // how many steps
tour.step();    // the current WrTourStep | null`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'WrTour',
      description: 'Injectable service. No module, no component to place.',
      type: 'service',
      default: '—',
    },
    {
      name: 'start(steps)',
      description: 'Begin a tour. Restarts if one is running; a no-op under SSR.',
      type: '(steps: readonly WrTourStep[]) => void',
      default: '—',
      sub: true,
    },
    {
      name: 'next()',
      description: 'Advance. Past the last step it finishes the tour.',
      type: '() => void',
      default: '—',
      sub: true,
    },
    {
      name: 'prev()',
      description: 'Go back. Stays put on the first step.',
      type: '() => void',
      default: '—',
      sub: true,
    },
    {
      name: 'stop()',
      description: 'End the tour and return focus where it started.',
      type: '() => void',
      default: '—',
      sub: true,
    },
    { name: 'active', description: 'Whether a tour is running.', type: 'Signal<boolean>', default: 'false', sub: true },
    {
      name: 'index',
      description: '0-based index of the current step, `-1` when idle.',
      type: 'Signal<number>',
      default: '-1',
      sub: true,
    },
    { name: 'total', description: 'Step count of the running tour.', type: 'Signal<number>', default: '0', sub: true },
    {
      name: 'step',
      description: 'The step being shown.',
      type: 'Signal<WrTourStep | null>',
      default: 'null',
      sub: true,
    },
    { name: 'WrTourStep', description: 'One stop on the tour.', type: 'interface', default: '—' },
    {
      name: 'target',
      description:
        'CSS selector resolved when the step opens, or the element itself. A step matching nothing is SKIPPED.',
      type: 'string | HTMLElement',
      default: '— (required)',
      sub: true,
    },
    { name: 'title', description: 'Heading above the copy.', type: 'string', default: '—', sub: true },
    { name: 'content', description: "The step's body text.", type: 'string', default: '— (required)', sub: true },
    {
      name: 'placement',
      description: 'Preferred side. Falls back to the opposite side near a viewport edge.',
      type: "'top' | 'bottom' | 'left' | 'right'",
      default: "'bottom'",
      sub: true,
    },
  ];
}
