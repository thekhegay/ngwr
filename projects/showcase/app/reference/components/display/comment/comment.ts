import { Component, signal } from '@angular/core';

import { WrAvatar } from 'ngwr/avatar';
import { WrButton } from 'ngwr/button';
import { WrComment, WrCommentComposer } from 'ngwr/comment';
import { WrDate } from 'ngwr/pipes';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

interface ChatMessage {
  readonly id: number;
  readonly own: boolean;
  readonly text: string;
  readonly at: Date;
}

@Component({
  selector: 'ngwr-comment-page',
  templateUrl: './comment.html',
  imports: [
    WrAvatar,
    WrButton,
    WrComment,
    WrCommentComposer,
    WrDate,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class CommentPageComponent {
  protected readonly messages = signal<ChatMessage[]>([
    { id: 1, own: false, text: 'Are the review notes in?', at: new Date(2026, 10, 5, 9, 40) },
    {
      id: 2,
      own: true,
      text: 'Pushed a minute ago. Two small ones on the composer.',
      at: new Date(2026, 10, 5, 9, 41),
    },
    { id: 3, own: false, text: 'On it.', at: new Date(2026, 10, 5, 9, 42) },
  ]);

  protected readonly draft = signal('');
  protected readonly posting = signal(false);
  protected readonly slowDraft = signal('');
  protected readonly slowSent = signal<string[]>([]);

  protected post(text: string): void {
    this.messages.update(list => [...list, { id: list.length + 1, own: true, text, at: new Date() }]);
  }

  /** A request that takes a moment: `sending` holds the button until it lands. */
  protected postSlowly(text: string): void {
    this.posting.set(true);
    setTimeout(() => {
      this.slowSent.update(list => [...list, text]);
      this.slowDraft.set('');
      this.posting.set(false);
    }, 800);
  }

  protected readonly snippets = {
    thread: `<wr-comment author="Ann Lee" time="2 hours ago" [datetime]="posted">
  <wr-avatar size="2.5rem" alt="">AL</wr-avatar>
  Looks good. One question on the empty state below.
  <div wrCommentActions>
    <button wr-btn size="sm" outlined>Reply</button>
  </div>
  <wr-comment author="Bob Ray" time="an hour ago">
    <wr-avatar size="2rem" alt="">BR</wr-avatar>
    It falls back to the placeholder, same as the input.
  </wr-comment>
</wr-comment>`,
    chat: `<div role="log" aria-label="Chat">
  @for (m of messages(); track m.id) {
    <wr-comment variant="bubble" [side]="m.own ? 'end' : 'start'" [time]="m.at | wrDate: 'time'" [datetime]="m.at">
      {{ m.text }}
    </wr-comment>
  }
</div>
<wr-comment-composer placeholder="Message" [(value)]="draft" (send)="post($event)" />`,
    composer: `<wr-comment-composer
  placeholder="Reply"
  [sending]="posting()"
  [clearOnSend]="false"
  [(value)]="draft"
  (send)="postSlowly($event)"
/>`,
    form: `<wr-comment-composer placeholder="Message" [formField]="form.draft" (send)="post($event)" />`,
  };

  protected readonly commentApi = API.WrComment;
  protected readonly composerApi = API.WrCommentComposer;
}
