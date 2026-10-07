import { Component, inject, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import {
  WR_DRAWER_DATA,
  WrDrawerClose,
  WrDrawerContent,
  WrDrawerFooter,
  WrDrawerRef,
  WrDrawerTitle,
} from 'ngwr/drawer';
import { WrInput } from 'ngwr/input';

export interface ChatData {
  readonly thread: string;
}

@Component({
  selector: 'ngwr-chat-drawer',
  templateUrl: './chat-drawer.html',
  imports: [WrButton, WrInput, WrDrawerTitle, WrDrawerContent, WrDrawerFooter, WrDrawerClose],
})
export class ChatDrawerComponent {
  protected readonly data = inject<ChatData>(WR_DRAWER_DATA);

  // The drawer closes itself once the message is away — no click needed.
  private readonly ref = inject(WrDrawerRef);

  protected readonly draft = signal('');

  protected onDraft(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  protected send(): void {
    this.ref.close(this.draft().trim() || 'nothing');
  }
}
