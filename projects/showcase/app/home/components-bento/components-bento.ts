/**
 * Components bento — zardui-style masonry of mini-UI tiles, each a live
 * composed scene built from real ngwr components. Every field is
 * editable, every toggle responds, the theme segmented actually drives
 * `WrTheme`, and the tabs / pagination switch state.
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
import { WrTheme, type WrThemeMode } from 'ngwr/theme';
import { WrToast } from 'ngwr/toast';
import { WrTypography } from 'ngwr/typography';

@Component({
  selector: 'ngwr-components-bento',
  templateUrl: './components-bento.html',
  styleUrl: './components-bento.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
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
  private readonly toast = inject(WrToast);
  protected readonly theme = inject(WrTheme);

  // ─── Sign-up form (tile 1) ────────────────────────────────────────────
  protected readonly fullName = signal('Alice Kim');
  protected readonly signupEmail = signal('alice@ngwr.dev');
  protected readonly signupPassword = signal('correct-horse-battery');
  protected readonly signupConfirm = signal('correct-horse-battery');
  protected readonly agreeTerms = signal(true);

  // ─── Payment (tile 3) ─────────────────────────────────────────────────
  protected readonly payAmount = signal('129.99');
  protected readonly payHolder = signal('Roman K.');

  // ─── Notifications (tile 4) ───────────────────────────────────────────
  protected readonly notifPush = signal(true);
  protected readonly notifDigest = signal(false);
  protected readonly notifBeta = signal(true);

  // ─── Tabs (tile 9) ────────────────────────────────────────────────────
  protected readonly activeTab = signal<string>('overview');

  // ─── Pagination (tile 10) ─────────────────────────────────────────────
  protected readonly currentPage = signal(2);

  // ─── Profile validation (tile 11) ─────────────────────────────────────
  protected readonly username = signal('alice_kim');
  protected readonly workspace = signal('acme-team');

  // ─── Theme switcher (tile 12) ─────────────────────────────────────────
  protected readonly themeOptions: readonly WrSegmentedOption<WrThemeMode>[] = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'Auto', value: 'auto' },
  ];

  // ─── Search (tile 13) ─────────────────────────────────────────────────
  protected readonly searchQuery = signal('');

  // ─── Static content ───────────────────────────────────────────────────
  protected readonly emptyTitle = 'No projects yet';
  protected readonly emptyHint = 'Create your first project to get started.';
  protected readonly codeSnippet = `import { WrBtn } from 'ngwr/button';

@Component({
  imports: [WrBtn],
  template: \`<wr-btn color="primary">Save</wr-btn>\`,
})
export class Demo {}`;

  // ─── Action handlers ──────────────────────────────────────────────────
  protected onCreateAccount(): void {
    this.toast.show({
      type: 'success',
      title: 'Welcome to ngwr!',
      message: `Account ready for ${this.fullName() || 'you'}.`,
    });
  }

  protected onPay(): void {
    this.toast.show({
      type: 'success',
      title: 'Payment received',
      message: `$${this.payAmount()} from ${this.payHolder() || 'card'}.`,
    });
  }

  protected onNewProject(): void {
    this.toast.show({ type: 'info', message: 'Project wizard would open here.' });
  }

  protected onFollow(): void {
    this.toast.show({ type: 'success', message: 'Now following Roman Kim.' });
  }

  protected onThemeChange(mode: WrThemeMode): void {
    this.theme.set(mode);
  }
}
