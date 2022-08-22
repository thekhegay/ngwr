import {
  ChangeDetectionStrategy,
  Component,
  ElementRef, HostBinding,
  Inject,
  Input,
  Optional,
  ViewEncapsulation
} from '@angular/core';
import { WalrusIconsRegistry } from './walrus-icons-registry.service';
import { DOCUMENT } from '@angular/common';
import { walrusIcon } from './icons';

@Component({
  selector: 'wr-icon[name]',
  template: '<ng-content></ng-content>',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalrusIconComponent {
  @HostBinding('class') class = 'wr-icon';
  private svgIcon: SVGElement | undefined;

  @Input()
  set name(iconName: walrusIcon) {
    if (this.svgIcon) {
      this.elRef.nativeElement.removeChild(this.svgIcon);
    }
    const svgData = this.r.getIcon(iconName) || '';
    this.svgIcon = this.svgElementFromString(svgData);
    this.elRef.nativeElement.appendChild(this.svgIcon);
  }

  constructor(
    private readonly elRef: ElementRef,
    private readonly r: WalrusIconsRegistry,
    @Optional() @Inject(DOCUMENT) private readonly doc: any
  ) {}

  private svgElementFromString(svgContent: string): SVGElement {
    const div = this.doc.createElement('div');
    div.innerHTML = svgContent;
    return div.querySelector('svg') || this.doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  }
}
