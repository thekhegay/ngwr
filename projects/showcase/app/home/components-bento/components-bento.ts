/**
 * Components bento — zardui-style 4-column responsive grid of mini-UI
 * tiles, each showing a small composed scene built from real ngwr
 * components (not just a single primitive). Sits between the hero and the
 * "Zero config" section as the homepage's main "see what you can build"
 * surface.
 */

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Check, CreditCard, Folder, House, Settings } from 'lucide';

import { WrAvatar } from 'ngwr/avatar';
import { WrBadge, WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { WrCheckbox } from 'ngwr/checkbox';
import { WrCounter } from 'ngwr/counter';
import { WrEmpty } from 'ngwr/empty';
import { WrFormField } from 'ngwr/form-field';
import { provideWrIcons, WrIcon } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrInput, WrInputGroup, WrInputPrefix } from 'ngwr/input';
import { WrPagination } from 'ngwr/pagination';
import { WrSegmented, type WrSegmentedOption } from 'ngwr/segmented';
import { WrSwitch } from 'ngwr/switch';
import { WrTab, WrTabs } from 'ngwr/tabs';
import { WrTypography } from 'ngwr/typography';

import { routes } from '#routing';

@Component({
  selector: 'ngwr-components-bento',
  templateUrl: './components-bento.html',
  styleUrl: './components-bento.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    WrAvatar,
    WrBadge,
    WrButton,
    WrCheckbox,
    WrCounter,
    WrEmpty,
    WrFormField,
    WrIcon,
    WrInput,
    WrInputGroup,
    WrInputPrefix,
    WrPagination,
    WrSegmented,
    WrSwitch,
    WrTab,
    WrTabs,
    WrTag,
    WrTypography,
  ],
  providers: [
    provideWrIcons(
      lucideIcons({
        checkmark: Check,
        'credit-card': CreditCard,
        folder: Folder,
        home: House,
        cog: Settings,
      })
    ),
  ],
  host: { class: 'ngwr-cbento' },
})
export class ComponentsBento {
  protected readonly routes = routes;
  protected readonly today = new Date();

  // Decorative state — wired via [ngModel] so components render in their
  // engaged variants instead of the empty defaults.
  protected readonly themeOptions: readonly WrSegmentedOption<string>[] = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'Auto', value: 'auto' },
  ];
  protected readonly themeValue = signal<string>('dark');

  protected readonly notifSwitch = signal(true);
  protected readonly digestSwitch = signal(false);
  protected readonly betaSwitch = signal(true);

  protected readonly remember = signal(true);
  protected readonly currentPage = signal(2);

  protected readonly emptyTitle = 'No projects yet';
  protected readonly emptyHint = 'Create your first project to get started.';

  // Tabs demo state
  protected readonly activeTab = signal<string>('overview');

  protected readonly codeSnippet = `import { WrBtn } from 'ngwr/button';

@Component({
  imports: [WrBtn],
  template: \`<wr-btn color="primary">Save</wr-btn>\`,
})
export class Demo {}`;
}
