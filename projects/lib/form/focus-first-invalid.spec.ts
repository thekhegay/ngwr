import { Component, type ElementRef, Injector, inject, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, required, submit } from '@angular/forms/signals';

import { WrInput } from 'ngwr/input';
import { WrOption, WrSelect } from 'ngwr/select';
import { wrFocusFirstInvalid } from 'ngwr/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrFormField } from './form-field';

/**
 * `wrFocusFirstInvalid` against the marks a real Signal Forms `form()` draws,
 * in the order an app calls it: `submit()`, then the helper with an injector,
 * with no render forced in between. Its own cases are in
 * `utils/dom/focus.spec.ts`.
 */
@Component({
  imports: [FormField, WrFormField, WrInput, WrSelect, WrOption],
  template: `
    <form #formEl>
      <wr-form-field label="Name">
        <input id="name" wrInput [formField]="profile.name" />
      </wr-form-field>
      <wr-form-field id="size-field" label="Size">
        <wr-select [formField]="profile.size">
          <wr-option value="sm">Small</wr-option>
        </wr-select>
      </wr-form-field>
      <wr-form-field label="Email">
        <input id="email" wrInput [formField]="profile.email" />
      </wr-form-field>
    </form>
  `,
})
class Host {
  private readonly injector = inject(Injector);
  private readonly formEl = viewChild.required<ElementRef<HTMLElement>>('formEl');

  readonly model = signal<{ name: string; size: string | null; email: string }>({ name: '', size: null, email: '' });
  readonly profile = form(this.model, path => {
    required(path.name, { message: 'Enter a name.' });
    required(path.size, { message: 'Pick a size.' });
    required(path.email, { message: 'Enter an email.' });
  });
  readonly sent = vi.fn(() => Promise.resolve(undefined));

  async save(): Promise<boolean> {
    await submit(this.profile, this.sent);
    return wrFocusFirstInvalid(this.formEl().nativeElement, { injector: this.injector });
  }
}

describe('wrFocusFirstInvalid after a Signal Forms submit', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  const scrolled: Element[] = [];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    // jsdom lays nothing out and has no `scrollIntoView`.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement): void {
      scrolled.push(this);
    };
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
    scrolled.length = 0;
  });

  it('draws no mark before the submit, so there is nothing to find', async () => {
    expect(await wrFocusFirstInvalid(root())).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });

  it('focuses the first invalid field once the refused submit is rendered', async () => {
    expect(await fixture.componentInstance.save()).toBe(true);

    expect(fixture.componentInstance.sent).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(root().querySelector('#name'));
    expect(scrolled).toEqual([root().querySelector('#name')!.closest('wr-form-field')]);
  });

  it('reaches the trigger of an invalid wr-select', async () => {
    fixture.componentInstance.model.update(model => ({ ...model, name: 'Ada' }));

    expect(await fixture.componentInstance.save()).toBe(true);

    const trigger = root().querySelector<HTMLElement>('#size-field [aria-haspopup="listbox"]');
    expect(trigger?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(trigger);
  });

  it('resolves to false when the submit went through', async () => {
    fixture.componentInstance.model.set({ name: 'Ada', size: 'sm', email: 'ada@example.com' });

    expect(await fixture.componentInstance.save()).toBe(false);

    expect(fixture.componentInstance.sent).toHaveBeenCalledOnce();
    expect(scrolled).toEqual([]);
  });
});
