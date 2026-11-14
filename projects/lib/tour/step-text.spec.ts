import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrTour } from './tour';
import type { WrTourStep } from './types';

@Component({
  template: `<div id="one">one</div>
    <div id="two">two</div>
    <button type="button" id="opener">Tour</button>`,
})
class Host {}

/**
 * A screen reader reads a dialog's name and its description when focus enters
 * it, and nothing else inside: a step whose text is tied to neither is a card
 * that announces "Step 1 of 2" and leaves out what the step says. The focus
 * trap is the real one here, since where focus lands is half of the contract.
 */
describe('WrTour step text', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let tour: WrTour;
  let rects: MockInstance;

  const STEPS: readonly WrTourStep[] = [
    { target: '#one', title: 'First', content: 'Look here' },
    { target: '#two', content: 'Then here' },
  ];

  const popup = (): HTMLElement => document.querySelector<HTMLElement>('.wr-tour-popup')!;
  /** The text of the elements an id-list attribute of the card names. */
  const referenced = (attribute: string): string[] =>
    (popup().getAttribute(attribute) ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map(id => popup().querySelector(`[id="${id}"]`)?.textContent?.trim() ?? `missing #${id}`);
  const settle = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    // jsdom implements no `scrollIntoView`, and the tour calls it on every step's target.
    Element.prototype.scrollIntoView = (): undefined => undefined;
    // jsdom lays nothing out, and the CDK calls an element with no box unfocusable:
    // declare one, so the trap decides where focus goes the way it does in a browser.
    rects = vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    TestBed.resetTestingModule();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    tour = TestBed.inject(WrTour);
  });

  afterEach(() => {
    tour.stop();
    fixture.destroy();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    rects.mockRestore();
  });

  it('names the dialog by its title and the progress line', async () => {
    tour.start(STEPS);
    await settle();

    expect(popup().getAttribute('role')).toBe('dialog');
    expect(referenced('aria-labelledby')).toEqual(['First', 'Step 1 of 2']);
    // One name, not two: `aria-label` would win over the elements and hide them.
    expect(popup().hasAttribute('aria-label')).toBe(false);
  });

  it('describes the dialog by the text of the step', async () => {
    tour.start(STEPS);
    await settle();

    expect(referenced('aria-describedby')).toEqual(['Look here']);
  });

  it('names an untitled step by the progress line alone, and still describes it', async () => {
    tour.start(STEPS);
    tour.next();
    await settle();

    expect(popup().querySelector('.wr-tour-popup__title')).toBeNull();
    // No id of an element that is not there: a dangling reference names nothing.
    expect(referenced('aria-labelledby')).toEqual(['Step 2 of 2']);
    expect(referenced('aria-describedby')).toEqual(['Then here']);
  });

  it('gives two cards on one page ids of their own', async () => {
    tour.start(STEPS);
    await settle();
    const first = popup().getAttribute('aria-describedby');

    tour.next();
    await settle();

    expect(popup().getAttribute('aria-describedby')).not.toBe(first);
  });

  it('opens each step with focus on the button that walks the tour', async () => {
    tour.start(STEPS);
    await settle();

    const next = popup().querySelector<HTMLElement>('.wr-tour-popup__action--next')!;
    expect(document.activeElement).toBe(next);
    // Not Skip, the first button in the row: Enter there would end the tour.
    expect(popup().querySelector('.wr-tour-popup__action--skip')).not.toBe(document.activeElement);

    tour.next();
    await settle();

    expect(document.activeElement).toBe(popup().querySelector('.wr-tour-popup__action--next'));
    expect(document.activeElement?.textContent?.trim()).toBe('Done');
  });

  it('gives the counter and every button a name', async () => {
    tour.start(STEPS);
    tour.next();
    await settle();

    expect(popup().querySelector('.wr-tour-popup__progress')!.textContent.trim()).toBe('Step 2 of 2');
    const buttons = [...popup().querySelectorAll<HTMLButtonElement>('.wr-tour-popup__actions button')];
    expect(buttons.map(button => button.textContent.trim())).toEqual(['Skip tour', 'Back', 'Done']);
  });
});
