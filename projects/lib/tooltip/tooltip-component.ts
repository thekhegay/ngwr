import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { CdkConnectedOverlay, ConnectedOverlayPositionChange, ConnectionPositionPair } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { Subject } from 'rxjs';

import { getPlacementName } from 'ngwr/core/overlay';
import { NgStyleInterface, SafeAny } from 'ngwr/core/types';

import { WR_TOOLTIP_DEFAULT_POSITIONS } from './tooltip-default-positions';
import { WrTooltipTrigger } from './tooltip-trigger';

@Component({
  selector: 'wr-tooltip',
  templateUrl: './tooltip.html',
  styleUrls: ['./tooltip.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false,
})
export class WrTooltipComponent {
  @ViewChild('overlay', { static: false }) overlay!: CdkConnectedOverlay;

  @Input()
  get message(): string | null {
    return this._message;
  }
  set message(value: string | null) {
    this._message = String(value);
    this.cdr.markForCheck();
  }
  private _message: string | null = null;

  @Input()
  get trigger(): WrTooltipTrigger {
    return this._trigger;
  }
  set trigger(value: WrTooltipTrigger) {
    this._trigger = value;
    this.cdr.markForCheck();
  }
  private _trigger: WrTooltipTrigger = 'hover';

  @Input()
  get visible(): boolean {
    return this._visible;
  }
  set visible(value: boolean) {
    const visible = coerceBooleanProperty(value);

    if (this._visible !== visible) {
      this._visible = visible;
      this.cdr.markForCheck();
    }
  }
  private _visible: boolean = false;

  @Input()
  get origin(): ElementRef {
    return this._origin;
  }
  set origin(value: ElementRef) {
    this._origin = value;
    this.cdr.markForCheck();
  }
  private _origin!: ElementRef;

  @Input()
  get position(): string {
    return this._position;
  }
  set position(value: string) {
    this._position = value;
    this.cdr.markForCheck();
  }
  private _position: string = 'top';

  readonly positions: ConnectionPositionPair[] = WR_TOOLTIP_DEFAULT_POSITIONS;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  show(): void {
    if (!this.visible && this.message) {
      this.visible = true;
    }
  }

  hide(): void {
    if (this.visible) {
      this.visible = false;
    }
  }

  onPositionChange(position: ConnectedOverlayPositionChange): void {
    this.position = getPlacementName(position)!;
  }

  onClickOutside(event: MouseEvent): void {
    if (!this.origin.nativeElement.contains(event.target)) {
      this.hide();
    }
  }
}
