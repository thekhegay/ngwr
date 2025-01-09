import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  inject,
  InjectionToken,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { BehaviorSubject, takeUntil } from 'rxjs';

import { WrAbstractBase } from 'ngwr/cdk';
import { SafeAny } from 'ngwr/cdk/types';

import { HEADER_HEIGHT } from '#core/components';
import { routes } from '#routing';

interface SidebarItem {
  title: string;
  url?: string[];
  isCategory?: boolean;
  children?: SidebarItem[];
}

export const SIDEBAR_OPENED = new InjectionToken<BehaviorSubject<boolean>>('ngwr_showcase_sidebar_opened');

@Component({
  selector: 'ngwr-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, RouterLinkActive],
})
export class SidebarComponent extends WrAbstractBase implements OnInit {
  @HostBinding('style.height') height = 'calc(100vh - 0)';
  @HostBinding('style.top') styleTop = '0px';

  private readonly sidebarOpened$ = inject(SIDEBAR_OPENED);
  private readonly headerHeight$ = inject(HEADER_HEIGHT);

  protected readonly isSidebarOpened = toSignal(this.sidebarOpened$);

  protected readonly items: SidebarItem[] = [
    {
      title: 'Getting started',
      isCategory: true,
      children: [
        { title: 'Installation', url: [routes.docs.gettingStarted.index, routes.docs.gettingStarted.installation] },
      ],
    },
    {
      title: 'Components',
      isCategory: true,
      children: [
        { title: 'Alert', url: [routes.docs.components.index, routes.docs.components.alert] },
        { title: 'Avatar', url: [routes.docs.components.index, routes.docs.components.avatar] },
        { title: 'Button', url: [routes.docs.components.index, routes.docs.components.button] },
        { title: 'Button Group', url: [routes.docs.components.index, routes.docs.components.buttonGroup] },
        { title: 'Checkbox', url: [routes.docs.components.index, routes.docs.components.checkbox] },
        { title: 'Dialog', url: [routes.docs.components.index, routes.docs.components.dialog] },
        { title: 'Divider', url: [routes.docs.components.index, routes.docs.components.divider] },
        { title: 'Form', url: [routes.docs.components.index, routes.docs.components.form] },
        { title: 'Icon', url: [routes.docs.components.index, routes.docs.components.icon] },
        { title: 'Input', url: [routes.docs.components.index, routes.docs.components.input] },
        { title: 'Progress', url: [routes.docs.components.index, routes.docs.components.progress] },
        { title: 'QR', url: [routes.docs.components.index, routes.docs.components.qrCode] },
        { title: 'Skeleton', url: [routes.docs.components.index, routes.docs.components.skeleton] },
        { title: 'Spinner', url: [routes.docs.components.index, routes.docs.components.spinner] },
        { title: 'Tag', url: [routes.docs.components.index, routes.docs.components.tag] },
      ],
    },
  ];

  @HostBinding('class')
  get elClasses(): SafeAny {
    return {
      'ngwr-sidebar': true,
      'ngwr-sidebar--opened': this.isSidebarOpened(),
    };
  }

  ngOnInit(): void {
    this.headerHeight$.pipe(takeUntil(this.destroyed$)).subscribe(h => {
      this.height = `calc(100vh - ${h}px`;
      this.styleTop = `${h}px`;
    });
  }
}
