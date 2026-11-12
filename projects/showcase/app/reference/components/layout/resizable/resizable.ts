import { Component, signal } from '@angular/core';

import { WrButton } from 'ngwr/button';
import { WrResizable } from 'ngwr/resizable';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-resizable-page',
  templateUrl: './resizable.html',
  imports: [
    WrResizable,
    WrButton,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ResizablePageComponent {
  protected readonly width = signal<number | null>(null);
  protected readonly live = signal<number | null>(null);
  protected readonly open = signal(true);

  protected readonly snippets = {
    basic: `<div class="map">
  <aside wrResizable [(size)]="width" (resizing)="live.set($event)">Layers</aside>
</div>`,
    basicStyles: `.map {
  position: relative;
}

aside {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 16rem;
}`,
    limits: `<aside wrResizable [minSize]="160" maxSize="60%">Layers</aside>`,
    edges: `<footer wrResizable edge="top" [minSize]="48" maxSize="80%">Timeline</footer>`,
    persist: `<aside wrResizable persistKey="layers-panel" [defaultSize]="256">Layers</aside>`,
    collapsed: `<aside wrResizable [collapsed]="!open()">
  <div class="body">Layers</div>
</aside>`,
    label: `<aside wrResizable resizeLabel="Resize the layers panel">Layers</aside>`,
    i18n: `provideWrI18nStaticLoader({
  en: { resizable: { handle: 'Resize' } },
});`,
  };

  protected readonly api = API.WrResizable;
}
