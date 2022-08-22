import {
  ChangeDetectionStrategy,
  Component,
  ElementRef, HostBinding,
  Inject,
  Input,
  Optional,
  ViewEncapsulation
} from '@angular/core';
import { WrIconService } from './wr-icon.service';
import { DOCUMENT } from '@angular/common';
import { wrIconName } from './wr-icons';

@Component({
  selector: 'wr-icon[name]',
  template: '',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WrIconComponent {
  @HostBinding('class') class = 'wr-icon';

  private svgIcon: SVGElement | undefined;

  @Input() set name(name: wrIconName | string) {
    if (!this.iconService.registry.has(name)) {
      console.warn(`Icon ${name} was not found`);
      return;
    }

    if (this.svgIcon) {
      this.elRef.nativeElement.removeChild(this.svgIcon);
    }

    const svgData = this.iconService.registry.get(name) || '';
    this.svgIcon = this.svgElementFromString(svgData);
    this.elRef.nativeElement.appendChild(this.svgIcon);
  }

  constructor(
    private readonly elRef: ElementRef,
    private readonly iconService: WrIconService,
    @Optional() @Inject(DOCUMENT) private readonly doc: any
  ) {
  }

  private svgElementFromString(svgContent: string): SVGElement {
    const div = this.doc.createElement('div');
    div.innerHTML = svgContent;
    return div.querySelector('svg') || this.doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  }
}
