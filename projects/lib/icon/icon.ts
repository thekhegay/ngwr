import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, HostBinding, Inject, Input, Optional } from '@angular/core';

import { SafeAny } from 'ngwr/core/types';

import { WrIconService } from './icon-service';
import { wrIconName } from './icons';

@Directive({
  selector: 'wr-icon[name]',
  exportAs: 'wrIcon',
})
export class WrIcon {
  @Input()
  set name(value: wrIconName | string) {
    if (!this.iconService.registry.has(value)) {
      console.warn(`Icon ${value} was not found in NGWR icons`);
      return;
    }

    if (this.svg) {
      this.elRef.nativeElement.removeChild(this.svg);
    }

    const svgData = this.iconService.registry.get(value) || '';
    this.svg = this.svgElementFromString(svgData);
    this.elRef.nativeElement.appendChild(this.svg);
  }

  get svg(): SVGElement | undefined {
    return this._svg;
  }
  set svg(value: SVGElement | undefined) {
    this._svg = value;
  }
  private _svg: SVGElement | undefined;

  /** Set element classes */
  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'wr-icon': true,
    };
  }

  constructor(
    private readonly elRef: ElementRef<HTMLElement>,
    private readonly iconService: WrIconService,
    @Optional() @Inject(DOCUMENT) private readonly doc: Document
  ) {}

  private svgElementFromString(svgContent: string): SVGElement {
    const div = this.doc.createElement('div');
    div.innerHTML = svgContent;
    return div.querySelector('svg') || this.doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  }
}
