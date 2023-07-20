import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostBinding,
  Inject,
  Input,
  OnChanges,
  OnInit,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

import { WrAbstractBase } from 'ngwr/core/abstract';
import { wrIconName, WrIconService } from 'ngwr/icon';

import { drawCanvas, ERROR_LEVEL_MAP, plotQRCodeData } from './generator';

@Component({
  selector: 'wr-qrcode',
  exportAs: 'wrQrCode',
  templateUrl: './qrcode.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class WrQRCode extends WrAbstractBase implements OnInit, AfterViewInit, OnChanges {
  @HostBinding('class') class = 'wr-qrcode';

  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;

  @Input()
  get value(): string {
    return this._value;
  }
  set value(value: string) {
    this._value = value;
    this.cdr.markForCheck();
  }
  private _value: string = '';

  @Input()
  get level(): keyof typeof ERROR_LEVEL_MAP {
    return this._level;
  }
  set level(level: keyof typeof ERROR_LEVEL_MAP) {
    this._level = level;
    this.cdr.markForCheck();
  }
  private _level: keyof typeof ERROR_LEVEL_MAP = 'M';

  @Input()
  get padding(): number {
    return this._padding;
  }
  set padding(padding: number) {
    this._padding = padding;
    this.cdr.markForCheck();
  }
  private _padding: number = 10;

  @Input()
  get color(): string {
    return this._color;
  }
  set color(color: string) {
    this._color = color;
    this.cdr.markForCheck();
  }
  private _color: string = '#000000';

  @Input()
  get bgColor(): string {
    return this._bgColor;
  }
  set bgColor(color: string) {
    this._bgColor = color;
    this.cdr.markForCheck();
  }
  private _bgColor: string = '#ffffff';

  @Input()
  get size(): number {
    return this._size;
  }
  set size(size: number) {
    this._size = size;
    this.cdr.markForCheck();
  }
  private _size: number = 150;

  @Input()
  get icon(): string | wrIconName {
    return this._icon;
  }
  set icon(icon: string | wrIconName) {
    this._icon = icon;
    this.cdr.markForCheck();
  }
  private _icon: string | wrIconName = '';

  @Input()
  get iconSize(): number {
    return this._iconSize;
  }
  set iconSize(size: number) {
    this._iconSize = size;
    this.cdr.markForCheck();
  }
  private _iconSize: number = 42;

  isBrowser = true;

  constructor(
    @Inject(PLATFORM_ID) private pid: Object,
    private readonly cdr: ChangeDetectorRef,
    private readonly el: ElementRef,
    private readonly wrIconService: WrIconService,
  ) {
    super();
    this.isBrowser = isPlatformBrowser(this.pid);
  }

  ngOnInit(): void {
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
    this.el.nativeElement.style.backgroundColor = this.bgColor;
  }

  drawCanvas(): void {
    if (this.canvas) {
      let icon = this.wrIconService.registry.get(this.icon) || this.icon;

      if (this.wrIconService.registry.has(this.icon)) {
        icon = `data:image/svg+xml;base64,${btoa(icon)}`;
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
