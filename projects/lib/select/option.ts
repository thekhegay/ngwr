/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  type Signal,
  type TemplateRef,
  ViewEncapsulation,
  afterEveryRender,
  computed,
  contentChild,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import type { WrOptionLeadingContext } from './interfaces';
import { WrOptionLeading } from './option-leading';
import { WR_SELECT } from './tokens';

let uid = 0;

/** `Node.TEXT_NODE` / `Node.ELEMENT_NODE`, spelled out: `Node` is not a global on the server. */
const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/**
 * Single option inside a `<wr-select>`.
 *
 * The option's display label is taken from its projected text content — or
 * from `label`, when that is set — and the form value is its `value` input. A
 * leading visual goes in an `<ng-template wrOptionLeading>`, which keeps it out
 * of the label and uninstantiated while the panel is closed.
 *
 * @example
 * ```html
 * <wr-option value="sm">Small</wr-option>
 * <wr-option [value]="42">Forty-two</wr-option>
 * <wr-option [value]="p.id" [label]="p.name">
 *   <ng-template wrOptionLeading><wr-avatar shape="circle" size="1.5rem">{{ p.initials }}</wr-avatar></ng-template>
 *   {{ p.name }}
 * </wr-option>
 * ```
 */
@Component({
  selector: 'wr-option',
  templateUrl: './option.html',
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  host: {
    role: 'option',
    '[attr.id]': 'id',
    '[class]': 'classes()',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-disabled]': 'disabled() ? true : null',
    '(click)': 'onClick()',
  },
})
export class WrOption {
  /** The value contributed when this option is chosen. Required. */
  readonly value = input.required<unknown>();

  /** Disable this option. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * The text the select reports for this option — the trigger label, the chip,
   * the chip's remove label and the search filter all read it. Unset (or empty),
   * the option's own text is used, as it always was.
   *
   * Set it when the row shows more than the name: a projected email under a
   * person, a count beside a category. It does NOT rename the row itself — the
   * option's accessible name stays the text it draws, since a screen reader user
   * browsing the list should hear what a sighted one reads there.
   *
   * @default null
   */
  readonly label = input<string | null>(null);

  /** Stable id used for `aria-activedescendant`. */
  readonly id = `wr-option-${++uid}`;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly parent = inject(WR_SELECT, { optional: true });

  /** This option's own `<ng-template wrOptionLeading>`, if it declares one. */
  private readonly ownLeading = contentChild(WrOptionLeading);

  /**
   * The leading template that applies to this option: its own, else the
   * select-wide default. Registered with the parent so a chip can draw it.
   */
  private readonly leading: Signal<TemplateRef<WrOptionLeadingContext> | null> = computed(
    () => this.ownLeading()?.template ?? this.parent?.optionLeading() ?? null
  );

  /**
   * The leading template to draw in THIS row right now — `null` while the panel
   * is closed. A projected option is created with the page and lives, detached,
   * for as long as the select does, so gating on the template alone would
   * instantiate every row's avatar the moment the page renders. An option with
   * no parent select has no panel to wait for.
   */
  protected readonly rowLeading = computed(() => {
    if (this.parent && !this.parent.panelOpen()) return null;
    return this.leading();
  });

  /** The wrapper the leading visual renders into — skipped when reading the text. */
  private readonly leadingSlot = viewChild<ElementRef<HTMLElement>>('leadingSlot');

  /**
   * The option's own text, as a signal — the parent's trigger label and the
   * client-side filter both read it from here.
   *
   * It has to be a signal, and a plain `textContent` read cannot be one. The
   * label is PROJECTED content: the host template decides it, and the ordinary
   * way it changes is that a `WrI18n` catalog lands a microtask after the first
   * change-detection pass (`i18n/i18n.ts` writes every loader-backed catalog
   * from `firstValueFrom(...).then(...)`). Read once and cached, a trigger sat
   * on the English fallback while the open panel beside it showed the
   * translation — visible in `wr-pagination`'s size changer, which prints
   * `pagination.perPage` into each `<wr-option>`.
   *
   * Kept in step the way `wr-divider` keeps its own projected label: an
   * `effect` and an `afterEveryRender`, and both are needed. The render hook is
   * a hard no-op under SSR, so on its own the server would emit a trigger with
   * no label at all; the effect is not gated that way and runs after the
   * content has been projected. The effect on its own cannot follow text that
   * moves later, because it reads nothing reactive to be re-run by.
   *
   * @internal
   */
  private readonly labelText = signal('');

  /**
   * `label` when set, otherwise the option's own text. What the parent reads.
   * Not `??`: an EMPTY label falls back too, since a blank trigger or a nameless
   * chip is never what a `[label]="person.name"` on a missing name meant.
   */
  private readonly resolvedLabel: Signal<string> = computed(() => {
    const explicit = this.label();
    return explicit !== null && explicit !== '' ? explicit : this.labelText();
  });

  /**
   * @internal — true when this option is currently selected. Works for
   * both single and multi-select parents via `WrSelectContext.isSelected`.
   */
  protected readonly selected = computed(() => {
    const parent = this.parent;
    if (!parent) return false;
    // Re-read parent's value signal so the computed recomputes on change.
    parent.value();
    return parent.isSelected(this.value());
  });

  /** @internal — true when this option is the keyboard cursor target. */
  protected readonly active = computed(() => this.parent?.activeOptionId() === this.id);

  /**
   * @internal — searchable selects only. True when the parent has a query that
   * the option's label does not match (case-insensitive substring) — `label`
   * when set, the option's text otherwise, and never its leading visual.
   * Hidden options stay in the DOM so registration order survives but
   * collapse via CSS.
   */
  protected readonly hidden = computed(() => {
    const parent = this.parent;
    if (!parent?.isSearchable() || !parent.clientFilter()) return false;
    const q = parent.searchQuery().trim().toLowerCase();
    if (!q) return false;
    return !this.resolvedLabel().toLowerCase().includes(q);
  });

  protected readonly classes = computed(() => {
    const parts = ['wr-option'];
    if (this.selected()) parts.push('wr-option--selected');
    if (this.active()) parts.push('wr-option--active');
    if (this.disabled()) parts.push('wr-option--disabled');
    if (this.hidden()) parts.push('wr-option--hidden');
    return parts.join(' ');
  });

  constructor() {
    if (this.parent) {
      const parent = this.parent;
      // Re-register when disabled or value changes so the parent has fresh metadata.
      // The label is seeded here as well, which is the read the server takes.
      effect(onCleanup => {
        // Untracked: the read goes through the `leadingSlot` query, which moves
        // every time the panel opens or closes, and a registration keyed on it
        // would unregister and re-register every option on each of those — a
        // registry write per option, and a recompute of everything the select
        // derives from the registry, for a change the registration does not
        // carry. The label itself still follows through `afterEveryRender`.
        untracked(() => this.syncLabel());
        const unreg = parent.registerOption({
          id: this.id,
          value: this.value(),
          disabled: this.disabled(),
          label: this.resolvedLabel,
          host: this.host.nativeElement,
          leading: this.leading,
        });
        onCleanup(() => unreg());
      });

      afterEveryRender(() => this.syncLabel());
    }
  }

  /**
   * Read the projected text back off the DOM. Setting the same string again is
   * a signal no-op, so the render hook costs a short walk over the host's
   * children and nothing else on the passes where nothing moved.
   *
   * A walk rather than the host's `textContent`, because the leading visual
   * renders INSIDE the host while the panel is open: a `textContent` read turned
   * an avatar's initials into the first word of the label, so the chip and the
   * search filter read "ХР Хегай Роман". Only text and element children count —
   * a comment's `textContent` is its data, and Angular anchors every
   * `<ng-template>` with one.
   */
  private syncLabel(): void {
    const slot = this.leadingSlot()?.nativeElement;
    let text = '';
    for (const node of Array.from(this.host.nativeElement.childNodes)) {
      if (node === slot) continue;
      if (node.nodeType === TEXT_NODE || node.nodeType === ELEMENT_NODE) text += node.textContent ?? '';
    }
    this.labelText.set(text.trim());
  }

  protected onClick(): void {
    if (this.disabled() || !this.parent) return;
    this.parent.selectOption(this.value());
  }
}
