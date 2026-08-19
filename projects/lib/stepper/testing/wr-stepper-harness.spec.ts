import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrStep, WrStepper } from 'ngwr/stepper';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrStepHarness } from './wr-step-harness';
import { WrStepperHarness } from './wr-stepper-harness';

/**
 * A three-step wizard, every mode reachable from a signal.
 *
 * The `stepper` viewChild is not the spec reaching into internals — it is what a real
 * wizard's own Next button is wired to, since the component renders no Next of its
 * own. One test needs exactly that path, because the imperative API is not gated the
 * way the header strip is.
 */
@Component({
  imports: [WrStepper, WrStep],
  template: `
    <wr-stepper [(active)]="active" [linear]="linear()" [orientation]="orientation()" [responsive]="responsive()">
      <wr-step label="Account">Account body</wr-step>
      <wr-step label="Address" description="Where we ship" [completed]="addressDone()">Address body</wr-step>
      <wr-step label="Review" optional [disabled]="reviewDisabled()">Review body</wr-step>
    </wr-stepper>
  `,
})
class Host {
  readonly stepper = viewChild.required(WrStepper);
  readonly active = signal(0);
  readonly linear = signal(false);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly responsive = signal(false);
  readonly addressDone = signal<boolean | null>(null);
  readonly reviewDisabled = signal(false);
}

/** Two wizards on one page — the shape that catches a harness answering for its neighbour. */
@Component({
  imports: [WrStepper, WrStep],
  template: `
    <wr-stepper linear orientation="vertical">
      <wr-step label="Plan">Plan body</wr-step>
      <wr-step label="Pay">Pay body</wr-step>
    </wr-stepper>

    <wr-stepper>
      <wr-step label="Ship">Ship body</wr-step>
      <wr-step label="Done">Done body</wr-step>
    </wr-stepper>
  `,
})
class TwoHost {}

@Component({ imports: [WrStepper], template: '<wr-stepper />' })
class EmptyHost {}

/**
 * Used the way a consumer uses it: through the loader, reading the rendered DOM.
 *
 * Every navigation is asserted against the HOST's `active` model as well as the
 * rendered wizard, because a stepper that moves its own header ring without moving the
 * bound index is the failure that matters — the app reads the index.
 */
describe('WrStepperHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let stepper: WrStepperHarness;

  const labels = async (filters: Parameters<WrStepperHarness['getSteps']>[0]): Promise<string[]> =>
    Promise.all((await stepper.getSteps(filters)).map(step => step.getLabel()));

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    stepper = await loader.getHarness(WrStepperHarness);
  });

  afterEach(() => fixture.destroy());

  it('lists its steps in order, and reports where the wizard is', async () => {
    expect(await stepper.getStepLabels()).toEqual(['Account', 'Address', 'Review']);
    expect(await stepper.getActiveIndex()).toBe(0);
    expect(await stepper.getActiveLabel()).toBe('Account');
  });

  it('keeps the list semantics a screen reader counts the steps with', async () => {
    // Redundant on an `<ol>` until the stylesheet removes the markers, which it does:
    // Safari drops list semantics from a marker-less list, taking "list, 3 items" with
    // it — the announcement that says how long the wizard is before you start it.
    expect(await stepper.getListRole()).toBe('list');
  });

  it('reads one step: label, description, optional flag and the announced name', async () => {
    const [account, address, review] = await stepper.getSteps();

    expect(await address.getLabel()).toBe('Address');
    expect(await address.getDescription()).toBe('Where we ship');
    expect(await account.getDescription()).toBeNull();
    expect(await review.isOptional()).toBe(true);
    expect(await account.isOptional()).toBe(false);

    // The label is the label alone — the badge and the description are siblings of it
    // inside the same span, so a step stays addressable by label either way.
    expect(await review.getLabel()).toBe('Review');
    expect(await review.getAccessibleName()).toBe('Review optional');
    expect(await address.getAccessibleName()).toBe('Address Where we ship');

    // Why the name excludes the indicator: the number is rendered and hidden, so a
    // screen reader never hears "3" and a harness that read the button's whole text
    // would report a name nobody gets.
    const indicator = (fixture.nativeElement as HTMLElement).querySelectorAll('.wr-stepper__indicator')[2];
    expect(indicator.textContent?.trim()).toBe('3');
    expect(indicator.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows one body while keeping every step mounted', async () => {
    expect(await stepper.getActiveStepText()).toBe('Account body');
    // All three are in the DOM — the inactive ones are hidden by a class, so a form
    // half-filled on step 1 survives a trip to step 3. It also means the raw
    // `textContent` of the fixture holds every step at once, jsdom loading no CSS.
    expect(await stepper.getStepTexts()).toEqual(['Account body', 'Address body', 'Review body']);
  });

  it('walks forward and back through the headers, moving the host model with it', async () => {
    await stepper.next();

    expect(fixture.componentInstance.active()).toBe(1);
    expect(await stepper.getActiveLabel()).toBe('Address');
    expect(await stepper.getActiveStepText()).toBe('Address body');

    await stepper.previous();

    expect(fixture.componentInstance.active()).toBe(0);
    expect(await stepper.getActiveStepText()).toBe('Account body');
  });

  it('refuses to walk off either end instead of clamping in silence', async () => {
    await expect(stepper.previous()).rejects.toThrow(/already on its first step/);

    await stepper.goTo(2);

    // `WrStepper.next()` clamps here and reports nothing, which reads as a passing
    // "we moved" in a spec that never checks the index afterwards.
    await expect(stepper.next()).rejects.toThrow(/already on its last step \("Review"\)/);
    expect(fixture.componentInstance.active()).toBe(2);
  });

  it('jumps to a step by index and by label', async () => {
    expect(await stepper.canGoTo(2)).toBe(true);
    await stepper.goTo(2);
    expect(await stepper.getActiveLabel()).toBe('Review');

    await stepper.goToLabel('Account');
    expect(fixture.componentInstance.active()).toBe(0);

    await stepper.goToLabel(/^Addr/);
    expect(await stepper.getActiveLabel()).toBe('Address');
  });

  it('says which steps exist when an index or a label names none', async () => {
    await expect(stepper.goToLabel('Payment')).rejects.toThrow(/Account, Address, Review/);
    // "You cannot go there" and "there is no there" are different findings, so an
    // out-of-range index throws rather than answering `false`.
    await expect(stepper.canGoTo(9)).rejects.toThrow(/no step 9 — this wizard has 3 steps/);
    await expect(stepper.goTo(-1)).rejects.toThrow(/no step -1/);
  });

  it('moves completion with the active step, and lets a step override it', async () => {
    expect(await stepper.getCompletedLabels()).toEqual([]);

    await stepper.next();
    expect(await stepper.getCompletedLabels()).toEqual(['Account']);

    fixture.componentInstance.active.set(0);
    fixture.componentInstance.addressDone.set(true);
    await fixture.whenStable();

    // Completion is not "everything before the active step": a `completed` input wins,
    // which is how a linear wizard opens a gate it has not walked through yet.
    expect(await stepper.getCompletedLabels()).toEqual(['Address']);
    expect(await stepper.getActiveLabel()).toBe('Account');
  });

  it('separates a step switched off from one merely out of reach', async () => {
    fixture.componentInstance.reviewDisabled.set(true);
    await fixture.whenStable();

    const [, , review] = await stepper.getSteps();

    expect(await review.isDisabled()).toBe(true);
    expect(await review.isReachable()).toBe(false);
    expect(await stepper.canGoTo(2)).toBe(false);
    expect(await stepper.getTabStopLabels()).toEqual(['Account', 'Address']);

    await expect(stepper.goTo(2)).rejects.toThrow(/carries `disabled`/);
    await expect(review.select()).rejects.toThrow(/refuses a click/);
    expect(fixture.componentInstance.active()).toBe(0);
  });

  it('still announces a disabled step as current while the keyboard cannot reach it', async () => {
    fixture.componentInstance.active.set(2);
    fixture.componentInstance.reviewDisabled.set(true);
    await fixture.whenStable();

    const [, , review] = await stepper.getSteps();

    // The two answers to "which step is active" come apart here, and this is the pair
    // a stepper gets wrong: the wizard is SHOWING Review and announcing it current,
    // while its header is out of the tab order entirely — a disabled button cannot
    // take focus, so nothing on the keyboard can reach the step being displayed.
    expect(await stepper.getActiveLabel()).toBe('Review');
    expect(await review.isActive()).toBe(true);
    expect(await stepper.getActiveStepText()).toBe('Review body');
    expect(await review.isReachable()).toBe(false);
    expect(await stepper.getTabStopLabels()).toEqual(['Account', 'Address']);

    await review.focus();
    expect(await review.isFocused()).toBe(false);
    expect(await stepper.getFocusedLabel()).toBeNull();

    // Going back is still open, so the wizard is not a dead end.
    await stepper.previous();
    expect(await stepper.getActiveLabel()).toBe('Address');
  });

  it('focuses a header, which is not the same thing as showing its step', async () => {
    expect(await stepper.getFocusedLabel()).toBeNull();

    const [, address] = await stepper.getSteps();
    await address.focus();

    expect(await address.isFocused()).toBe(true);
    expect(await stepper.getFocusedLabel()).toBe('Address');
    // Focus moved and the wizard did not: the strip is not one roving tab stop, so
    // every reachable header is its own stop and none of them is the selection.
    expect(await stepper.getActiveLabel()).toBe('Account');
  });

  it('narrows steps by label, active, completed, disabled, reachable and optional', async () => {
    fixture.componentInstance.active.set(1);
    fixture.componentInstance.reviewDisabled.set(true);
    await fixture.whenStable();

    expect(await labels({ label: /^A/ })).toEqual(['Account', 'Address']);
    expect(await labels({ active: true })).toEqual(['Address']);
    expect(await labels({ completed: true })).toEqual(['Account']);
    expect(await labels({ disabled: true })).toEqual(['Review']);
    expect(await labels({ reachable: true })).toEqual(['Account', 'Address']);
    expect(await labels({ optional: true })).toEqual(['Review']);
  });

  it('reports the orientation it was asked for, and the responsive opt-in', async () => {
    expect(await stepper.getOrientation()).toBe('horizontal');
    expect(await stepper.isResponsive()).toBe(false);
    expect(await stepper.isLinear()).toBe(false);

    fixture.componentInstance.orientation.set('vertical');
    fixture.componentInstance.responsive.set(true);
    await fixture.whenStable();

    expect(await stepper.getOrientation()).toBe('vertical');
    // The reflow a responsive stepper does is a container query, so the class never
    // changes and nothing here could see it anyway — jsdom has no layout at all.
    expect(await stepper.isResponsive()).toBe(true);
  });

  it('still has a current step when a host writes `active` past the end', async () => {
    // This was a refusal test: `goTo()` clamped and the two-way model did not, so an
    // out-of-range index un-currented every header and hid every body. `WrStepper`
    // clamps the model as well now, which puts the wizard on the last step instead —
    // the only remaining way to have no current step is to have no steps, and that
    // is the empty-stepper block below.
    fixture.componentInstance.active.set(9);
    await fixture.whenStable();

    expect(await stepper.getActiveIndex()).toBe(2);
    expect(await stepper.getActiveLabel()).toBe('Review');
    expect(await stepper.getActiveStepText()).toBe('Review body');
    // Refused for the right reason now — there is a current step, and it is the last.
    await expect(stepper.next()).rejects.toThrow(/already on its last step/);
  });
});

describe('WrStepperHarness — a linear wizard', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let stepper: WrStepperHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.linear.set(true);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    stepper = await loader.getHarness(WrStepperHarness);
  });

  afterEach(() => fixture.destroy());

  it('holds the gate shut against a header click, while the imperative API walks past it', async () => {
    expect(await stepper.isLinear()).toBe(true);
    expect(await stepper.canGoTo(1)).toBe(false);
    // Only the CURRENT step and the ones behind it are reachable: derived completion
    // never covers the step you are standing on, so nothing ahead opens until it says
    // so itself.
    expect(await stepper.getTabStopLabels()).toEqual(['Account']);

    await expect(stepper.next()).rejects.toThrow(/`linear` and step 1 \("Account"\) has not reported itself complete/);
    expect(fixture.componentInstance.active()).toBe(0);

    // What a real wizard's Next button does — and it is NOT gated: `WrStepper.next()`
    // never consults `linear`, so the app has to do the checking the header does.
    // Worth pinning, because it is the difference between a locked wizard and a
    // decorative one, and no assertion on the header strip would notice.
    fixture.componentInstance.stepper().next();
    await fixture.whenStable();

    expect(await stepper.getActiveLabel()).toBe('Address');
    expect(await stepper.getTabStopLabels()).toEqual(['Account', 'Address']);
  });

  it('names the step holding the gate shut, not just that it is shut', async () => {
    await expect(stepper.goTo(2)).rejects.toThrow(/step 1 \("Account"\)/);

    fixture.componentInstance.active.set(1);
    await fixture.whenStable();

    // The gate has moved: step 1 is behind the wizard now, so the blocker is the step
    // it is standing on.
    await expect(stepper.goTo(2)).rejects.toThrow(/step 2 \("Address"\)/);
  });

  it('opens the gate once a step reports itself complete, and lets a user back through', async () => {
    fixture.componentInstance.active.set(1);
    fixture.componentInstance.addressDone.set(true);
    await fixture.whenStable();

    expect(await stepper.canGoTo(2)).toBe(true);

    await stepper.next();

    expect(await stepper.getActiveLabel()).toBe('Review');
    expect(fixture.componentInstance.active()).toBe(2);

    // Backwards is open in a linear wizard — every step at or before the active one is
    // reachable, which is what makes the gate a gate and not a one-way door.
    await stepper.previous();
    expect(await stepper.getActiveLabel()).toBe('Address');
  });

  it('keeps a disabled step shut even after the gate opens', async () => {
    fixture.componentInstance.active.set(1);
    fixture.componentInstance.addressDone.set(true);
    fixture.componentInstance.reviewDisabled.set(true);
    await fixture.whenStable();

    // The step's own input wins over the gate, and the refusal says so rather than
    // blaming `linear` for it.
    await expect(stepper.goTo(2)).rejects.toThrow(/carries `disabled`/);
  });
});

describe('WrStepperHarness — two wizards on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('narrows by a step label, the orientation and the linear flag', async () => {
    const matched = async (filters: Parameters<typeof WrStepperHarness.with>[0]): Promise<string[][]> => {
      const wizards = await loader.getAllHarnesses(WrStepperHarness.with(filters));
      return Promise.all(wizards.map(wizard => wizard.getStepLabels()));
    };

    const checkout = await loader.getHarness(WrStepperHarness.with({ stepLabel: 'Pay' }));
    const delivery = await loader.getHarness(WrStepperHarness.with({ stepLabel: /^Ship/ }));

    expect(await checkout.getStepLabels()).toEqual(['Plan', 'Pay']);
    expect(await delivery.getStepLabels()).toEqual(['Ship', 'Done']);

    expect(await matched({ linear: true })).toEqual([['Plan', 'Pay']]);
    expect(await matched({ orientation: 'vertical' })).toEqual([['Plan', 'Pay']]);
    expect(await matched({ orientation: 'horizontal' })).toEqual([['Ship', 'Done']]);
  });

  it('keeps one wizard from answering for the other', async () => {
    const checkout = await loader.getHarness(WrStepperHarness.with({ stepLabel: 'Plan' }));
    const delivery = await loader.getHarness(WrStepperHarness.with({ stepLabel: 'Ship' }));

    await delivery.goToLabel('Done');

    expect(await delivery.getActiveLabel()).toBe('Done');
    expect(await delivery.getActiveStepText()).toBe('Done body');
    expect(await checkout.getActiveLabel()).toBe('Plan');
    expect(await checkout.getStepTexts()).toEqual(['Plan body', 'Pay body']);
  });
});

describe('WrStepperHarness — a wizard with no steps', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<EmptyHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;
  let stepper: WrStepperHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(EmptyHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
    stepper = await loader.getHarness(WrStepperHarness);
  });

  afterEach(() => fixture.destroy());

  it('answers the shape questions and refuses the rest', async () => {
    expect(await stepper.getStepLabels()).toEqual([]);
    expect(await stepper.getStepTexts()).toEqual([]);
    expect(await stepper.getTabStopLabels()).toEqual([]);
    expect(await stepper.getCompletedLabels()).toEqual([]);
    expect(await stepper.getFocusedLabel()).toBeNull();
    // The strip renders even with nothing in it, so the list role is still an answer.
    expect(await stepper.getListRole()).toBe('list');

    await expect(stepper.getActiveIndex()).rejects.toThrow(/no <wr-step> children/);
    await expect(stepper.getActiveStepText()).rejects.toThrow(/no step body is showing/);
    await expect(stepper.goTo(0)).rejects.toThrow(/no step 0 — this wizard has 0 steps/);
  });
});

describe('WrStepHarness — on its own', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('is addressable without going through the wizard, and navigates on its own', async () => {
    const review = await loader.getHarness(WrStepHarness.with({ label: 'Review' }));

    expect(await review.isActive()).toBe(false);
    expect(await review.isCompleted()).toBe(false);

    await review.select();

    expect(await review.isActive()).toBe(true);
    expect(fixture.componentInstance.active()).toBe(2);
    expect(await loader.getAllHarnesses(WrStepHarness.with({ completed: true }))).toHaveLength(2);
  });
});
