import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, inject, Input, Renderer2, ViewEncapsulation } from '@angular/core';

import { SafeAny } from 'ngwr/core/types';

import { WrIconPatchService, WrIconService } from './icon.service';
import { wrIconName } from './icons';

@Component({
  standalone: true,
  selector: 'wr-icon',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrIconComponent {
  @Input({ required: true })
  set name(value: wrIconName) {
    this.setIcon(value);
  }

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-icon': true,
    };
  }

  private readonly r2 = inject(Renderer2);
  private readonly patchService = inject(WrIconPatchService, { optional: true });
  private readonly iconService = inject(WrIconService);
  private readonly elRef = inject(ElementRef);
  private readonly doc = inject(DOCUMENT);

  private setIcon(name: wrIconName): void {
    if (!this.iconService.registry.has(name)) {
      return console.warn(`[NGWR]\nNo icon named ${name} was found.\nYou may need to import it using provideWrIcons()`);
    }

    const iconData = this.iconService.registry.get(name);

    if (iconData) {
      this.setElement(this.svgElementFromString(iconData));
    }
  }

  private svgElementFromString(svgContent: string): SVGElement {
    const div = this.doc.createElement('div');
    div.innerHTML = svgContent;
    const svg: SVGElement | null = div.querySelector('svg');
    if (!svg) {
      throw new Error('<svg> tag not found');
    }
    return svg;
  }

  private setElement(svg: SVGElement): void {
    this.clearElement();
    this.r2.appendChild(this.elRef.nativeElement, svg);
  }

  private clearElement(): void {
    const el: HTMLElement = this.elRef.nativeElement;
    const children = el.childNodes;
    const length = children.length;
    for (let i = length - 1; i >= 0; i--) {
      const child = children[i] as SafeAny;
      if (child.tagName?.toLowerCase() === 'svg') {
        this.r2.removeChild(el, child);
      }
    }
  }

  constructor() {
    if (this.patchService) {
      this.patchService.addIcons();
    }
  }
}
