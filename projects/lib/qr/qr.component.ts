/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  inject,
  Input,
  numberAttribute,
  OnChanges,
  OnInit,
  PLATFORM_ID,
  signal,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

import { WrAbstractBase } from 'ngwr/cdk';
import { wrIconName, WrIconService } from 'ngwr/icon';

import { drawCanvas, ERROR_LEVEL_MAP, plotQRCodeData } from './generator';

@Component({
  standalone: true,
  selector: 'wr-qr',
  templateUrl: './qr.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrQrComponent extends WrAbstractBase implements OnInit, AfterViewInit, OnChanges {
  @HostBinding() class = 'wr-qrcode';
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;

  @Input({ required: true }) value!: string;
  @Input() level: keyof typeof ERROR_LEVEL_MAP = 'M';
  @Input({ transform: numberAttribute }) padding: number = 10;
  @Input() color: string = '#000000';
  @Input() bgColor: string = '#ffffff';
  @Input({ transform: numberAttribute }) size: number = 150;
  @Input() icon: wrIconName | null = null;
  @Input({ transform: numberAttribute }) iconSize: number = 42;

  private readonly pid = inject(PLATFORM_ID);
  private readonly elRef = inject(ElementRef);
  private readonly wrIconService = inject(WrIconService);
  protected readonly isBrowser = signal(true);

  ngOnInit(): void {
    this.isBrowser.set(isPlatformBrowser(this.pid));
    this.setElBg();
  }

  ngAfterViewInit(): void {
    this.drawCanvas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const { value, level, padding, color, bgColor, size, icon, iconSize } = changes;

    if ((value || level || padding || color || bgColor || size || icon || iconSize) && this.canvas) {
      this.drawCanvas();
    }

    if (bgColor) {
      this.setElBg();
    }
  }

  setElBg(): void {
    this.elRef.nativeElement.style.backgroundColor = this.bgColor;
  }

  drawCanvas(): void {
    if (this.canvas) {
      let icon = '';

      if (this.icon && this.wrIconService.registry.has(this.icon)) {
        const iconData = this.wrIconService.registry.get(this.icon) || '';
        icon = `data:image/svg+xml;base64,${btoa(iconData)}`;
      }

      drawCanvas(
        this.canvas.nativeElement,
        plotQRCodeData(this.value, this.level),
        this.size,
        10,
        this.padding,
        this.color,
        this.bgColor,
        this.iconSize,
        icon
      );
    }
  }
}
