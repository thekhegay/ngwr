/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  Input,
  ContentChildren,
  QueryList,
  AfterContentInit,
  forwardRef,
  HostBinding,
  inject,
  signal,
  computed,
  ChangeDetectorRef,
  booleanAttribute,
  ElementRef,
  ViewChild,
  HostListener,
  numberAttribute,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { noop } from 'rxjs';

import { WrAbstractBase } from 'ngwr/cdk';
import { SafeAny } from 'ngwr/cdk/types';
import { provideWrIcons, chevronDown, WrIconComponent, close } from 'ngwr/icon';

import { WrTagComponent } from '../tag';

import { WrOptionGroupComponent } from './select-option-group.component';
import { WrOptionComponent } from './select-option.component';

/**
 * NGWR select component.
 *
 * {@tutorial} [How to use wr-select]{@link http://ngwr.dev/docs/components/select}
 */
@Component({
  standalone: true,
  selector: 'wr-select',
  templateUrl: './select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    provideWrIcons([chevronDown, close]),
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrSelectComponent),
      multi: true,
    },
  ],
  imports: [WrIconComponent, WrTagComponent, NgTemplateOutlet],
})
export class WrSelectComponent extends WrAbstractBase implements ControlValueAccessor, AfterContentInit {
  @Input()
  placeholder = '';

  @Input()
  noItemsLabel = 'No Items';

  @Input({ transform: booleanAttribute })
  multiple = false;

  @Input({ transform: booleanAttribute })
  searchable = false;

  @Input({ transform: booleanAttribute })
  clearable = false;

  @Input({ transform: numberAttribute })
  maxMultipleCount?: number;

  @Input({ transform: booleanAttribute })
  set disabled(value: boolean) {
    this.isDisabled.set(value);
  }
  get disabled(): boolean {
    return this.isDisabled();
  }

  @ViewChild('searchInput')
  searchInput?: ElementRef<HTMLInputElement>;

  @ContentChildren(WrOptionComponent, { descendants: true })
  options!: QueryList<WrOptionComponent>;

  @ContentChildren(WrOptionGroupComponent)
  optionGroups!: QueryList<WrOptionGroupComponent>;

  @HostBinding('class')
  get hostClasses(): Record<string, boolean> {
    return {
      'wr-select': true,
      'wr-select--open': this.isOpen(),
      'wr-select--multiple': this.multiple,
      'wr-select--disabled': this.isDisabled(),
      'wr-select--focused': this.isFocused(),
    };
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isOpen()) {
      return;
    }

    const filteredOpts = this.filteredOptions();
    const currentIndex = this.highlightedOptionIndex();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedOptionIndex.set(currentIndex < filteredOpts.length - 1 ? currentIndex + 1 : 0);
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.highlightedOptionIndex.set(currentIndex > 0 ? currentIndex - 1 : filteredOpts.length - 1);
        break;

      case 'Enter':
        event.preventDefault();
        if (currentIndex >= 0 && filteredOpts[currentIndex]) {
          this.onOptionSelect(filteredOpts[currentIndex]);
        }
        break;

      case 'Backspace':
        if (this.multiple && !this.searchValue() && this.selectedOptions().length) {
          const selectedOptionsArray = this.selectedOptions();
          const lastSelected = selectedOptionsArray[selectedOptionsArray.length - 1];
          this.onOptionSelect(lastSelected);
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  protected readonly value = signal<SafeAny>(null);
  protected readonly isOpen = signal(false);
  protected readonly isFocused = signal(false);
  protected readonly isDisabled = signal(false);
  protected readonly searchValue = signal('');
  protected readonly highlightedOptionIndex = signal(-1);

  protected readonly selectedOptions = computed(() => {
    const currentValue = this.value();
    const optionsArray = this.options?.toArray() || [];

    if (this.multiple) {
      return optionsArray.filter(option => Array.isArray(currentValue) && currentValue.includes(option.value));
    }
    return optionsArray.filter(option => option.value === currentValue);
  });

  protected readonly selectedLabel = computed(() => {
    const selected = this.selectedOptions();
    return selected.length ? selected[0].label || selected[0].value : '';
  });

  protected readonly filteredOptions = computed(() => {
    const search = this.searchValue().toLowerCase();
    const optionsArray = this.options?.toArray() || [];

    let filteredArray = optionsArray;
    if (this.multiple) {
      const currentValue = this.value();
      filteredArray = optionsArray.filter(
        option => !Array.isArray(currentValue) || !currentValue.includes(option.value)
      );
    }

    if (!search) {
      return filteredArray;
    }

    return filteredArray.filter(option => (option.label || option.value.toString()).toLowerCase().includes(search));
  });

  private readonly elementRef = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  get currentValue(): SafeAny {
    return this.value();
  }

  get isMultiple(): boolean {
    return this.multiple;
  }

  ngAfterContentInit(): void {
    this.options.changes.pipe(takeUntilDestroyed(this.destroyRef$)).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  onChange: (value: string) => void = noop;
  onTouch: () => void = noop;

  onOptionSelect(option: WrOptionComponent): void {
    if (this.isDisabled()) return;

    if (this.multiple) {
      const currentValue = Array.isArray(this.value()) ? this.value() : [];

      if (this.maxMultipleCount && !this.isSelectedOption(option) && currentValue.length >= this.maxMultipleCount) {
        return;
      }

      const newValue = this.isSelectedOption(option)
        ? currentValue.filter((v: SafeAny) => v !== option.value)
        : [...currentValue, option.value];

      this.writeValue(newValue);
      this.searchValue.set('');
    } else {
      this.writeValue(option.value);
      this.close();
    }
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchValue.set(value);
  }

  isHighlightedOption(option: WrOptionComponent): boolean {
    if (this.highlightedOptionIndex() === -1) {
      return false;
    }

    const filteredOpts = this.filteredOptions();
    const optionIndex = filteredOpts.findIndex(item => item.value === option.value);

    return optionIndex !== -1 && optionIndex === this.highlightedOptionIndex();
  }

  isFilteredOption(option: WrOptionComponent): boolean {
    if (this.multiple) {
      const currentValue = this.value();
      if (Array.isArray(currentValue) && currentValue.includes(option.value)) {
        return true;
      }
    }

    const search = this.searchValue().toLowerCase();
    if (search) {
      return !(option.label || option.value.toString()).toLowerCase().includes(search);
    }

    return false;
  }

  writeValue(value: SafeAny): void {
    this.value.set(value);
    this.onChange(value);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: SafeAny) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  clear(event: Event): void {
    event.stopPropagation();
    if (this.isDisabled()) return;

    if (this.multiple) {
      this.writeValue([]);
    } else {
      this.writeValue(null);
    }
  }

  toggle(): void {
    if (this.isDisabled()) {
      return;
    }

    this.isOpen.update(value => !value);
    this.isFocused.update(value => !value);

    if (this.isOpen() && this.searchable) {
      // TODO Разобраться с этим хаком
      setTimeout(() => {
        this.searchInput?.nativeElement.focus();
      }, 10);
    }
  }

  private close(): void {
    this.isOpen.set(false);
    this.isFocused.set(false);
    this.searchValue.set('');
    this.highlightedOptionIndex.set(-1);
  }

  private isSelectedOption(option: WrOptionComponent): boolean {
    const currentValue = this.value();
    if (this.multiple) {
      return Array.isArray(currentValue) && currentValue.includes(option.value);
    }

    return currentValue === option.value;
  }
}
