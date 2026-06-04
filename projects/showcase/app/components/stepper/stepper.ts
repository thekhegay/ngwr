import { Component, signal, viewChild } from '@angular/core';

import { WrStep, WrStepper } from 'ngwr/stepper';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-stepper-page',
  templateUrl: './stepper.html',
  imports: [
    WrStepper,
    WrStep,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class StepperPageComponent {
  protected readonly basic = signal(0);
  protected readonly linear = signal(0);
  protected readonly vertical = signal(0);
  protected readonly linearStepper = viewChild<WrStepper>('linearStepper');

  protected linearNext(): void {
    this.linearStepper()?.next();
  }

  protected linearPrev(): void {
    this.linearStepper()?.prev();
  }

  protected readonly snippets = {
    install: `import { WrStepper, WrStep } from 'ngwr/stepper';

@Component({ imports: [WrStepper, WrStep] })
export class MyComponent {
  protected readonly step = signal(0);
}`,

    basic: `<wr-stepper [(active)]="step">
  <wr-step label="Account">Account form…</wr-step>
  <wr-step label="Profile" description="Optional">Profile form…</wr-step>
  <wr-step label="Confirm">Review and submit…</wr-step>
</wr-stepper>`,

    linear: `<wr-stepper #stepper [(active)]="step" linear>
  <wr-step label="One" [completed]="oneDone()">…</wr-step>
  <wr-step label="Two" [completed]="twoDone()">…</wr-step>
  <wr-step label="Three">…</wr-step>
</wr-stepper>

<button (click)="stepper.next()">Next</button>`,

    vertical: `<wr-stepper [(active)]="step" orientation="vertical">
  <wr-step label="Pick a plan">…</wr-step>
  <wr-step label="Billing">…</wr-step>
  <wr-step label="Done">…</wr-step>
</wr-stepper>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: '[(active)]', description: 'Active step index (two-way bindable).', type: 'number', default: '0' },
    {
      name: 'orientation',
      description: 'Layout direction.',
      type: "'horizontal' | 'vertical'",
      default: "'horizontal'",
    },
    {
      name: 'linear',
      description: 'Lock steps after the latest completed one.',
      type: 'boolean',
      default: 'false',
    },
    { name: 'next() / prev() / goTo(i)', description: 'Imperative navigation.', type: 'method', default: '—' },
    { name: '<wr-step>.label', description: 'Header text.', type: 'string', default: "''" },
    { name: '<wr-step>.description', description: 'Secondary header text.', type: 'string', default: "''" },
    {
      name: '<wr-step>.optional',
      description: 'Marks the step as optional in the header.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: '<wr-step>.completed',
      description: 'Override completion. When null, derived from `active > index`.',
      type: 'boolean | null',
      default: 'null',
    },
    { name: '<wr-step>.disabled', description: 'Blocks header clicks.', type: 'boolean', default: 'false' },
  ];
}
