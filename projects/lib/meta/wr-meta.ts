/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { DOCUMENT } from '@angular/common';
import { Injector, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import type { WrMetaConfig, WrMetaHandle } from './interfaces';
import { WR_META_DEFAULTS } from './tokens';

/** Deep-merge two `WrMetaConfig` layers — later wins for scalars + nested groups. */
function merge(base: WrMetaConfig, top: WrMetaConfig): WrMetaConfig {
  return {
    ...base,
    ...top,
    og: { ...base.og, ...top.og },
    twitter: { ...base.twitter, ...top.twitter },
  };
}

/**
 * Centralised `<head>` metadata manager — title, description, keywords,
 * canonical, Open Graph and Twitter Card tags.
 *
 * Stack-based: `push(config)` adds a layer (returned handle pops it),
 * `set(config)` replaces the current top, `reset()` clears all overrides.
 * Layers merge via shallow merge for scalars and a one-level deep merge
 * for `og` / `twitter` groups.
 *
 * The resolved metadata is applied diff-style — only changed tags are
 * touched in the DOM, so reads of `document.head` stay cheap.
 *
 * @example
 * ```ts
 * const meta = inject(WrMeta);
 * meta.set({ title: 'Pricing', description: 'Plans for every team.' });
 *
 * // From a route component — auto-pop on destroy via the directive:
 * <div [wrMeta]="{ title: 'Pricing' }">
 * ```
 *
 * @see https://ngwr.dev/services/meta
 */
@Service()
export class WrMeta {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly defaults = inject(WR_META_DEFAULTS);
  private readonly injector = inject(Injector);

  /** Stack of meta layers. Bottom = defaults, top = currently applied. */
  private readonly stack = signal<readonly WrMetaConfig[]>([this.defaults]);

  /** Resolved (merged) metadata at the top of the stack. */
  readonly resolved = computed(() => this.stack().reduce((acc, layer) => merge(acc, layer), {} as WrMetaConfig));

  /** Last applied snapshot — used to diff against the next resolution. */
  private applied: WrMetaConfig = {};

  constructor() {
    // Apply defaults immediately on construction.
    this.apply();
  }

  /** Snapshot of the resolved metadata currently in the DOM. */
  current(): Readonly<WrMetaConfig> {
    return this.applied;
  }

  /** Replace the top layer (or create one if only defaults are present). */
  set(config: WrMetaConfig): void {
    this.stack.update(stack => {
      if (stack.length <= 1) return [...stack, config];
      return [...stack.slice(0, -1), config];
    });
    this.apply();
  }

  /** Push a new layer. Returns a handle whose `.pop()` removes it. */
  push(config: WrMetaConfig): WrMetaHandle {
    this.stack.update(stack => [...stack, config]);
    this.apply();
    const target = config;
    return {
      pop: () => {
        this.stack.update(stack => {
          const idx = stack.lastIndexOf(target);
          if (idx <= 0) return stack;
          return [...stack.slice(0, idx), ...stack.slice(idx + 1)];
        });
        this.apply();
      },
    };
  }

  /**
   * Reactive layer. Runs `factory` inside an effect and re-applies the
   * resolved metadata whenever any signal it reads changes — so a title
   * (or any field) built from {@link WrI18n}'s `t()` updates live on
   * locale switch, with no manual re-`set()`.
   *
   * Returns a handle whose `.pop()` removes the layer and stops the effect.
   * Safe to call outside an injection context.
   *
   * @example Locale-aware title
   * ```ts
   * const meta = inject(WrMeta);
   * const i18n = inject(WrI18n);
   *
   * // `i18n.t(...)` tracks the active locale, so the title re-renders
   * // every time `i18n.use(...)` switches languages.
   * meta.bind(() => ({
   *   title: i18n.t('home.title'),
   *   description: i18n.t('home.description'),
   * }));
   * ```
   */
  bind(factory: () => WrMetaConfig): WrMetaHandle {
    let current: WrMetaConfig | null = null;

    const ref = effect(
      () => {
        const next = factory();
        // Recompute is reactive; the stack write + DOM apply are not, so
        // the effect only re-runs on `factory`'s own dependencies.
        untracked(() => {
          this.stack.update(stack => {
            if (current === null) return [...stack, next];
            const idx = stack.lastIndexOf(current);
            return idx < 0 ? [...stack, next] : [...stack.slice(0, idx), next, ...stack.slice(idx + 1)];
          });
          current = next;
          this.apply();
        });
      },
      { injector: this.injector }
    );

    return {
      pop: () => {
        ref.destroy();
        if (current === null) return;
        const target = current;
        current = null;
        this.stack.update(stack => {
          const idx = stack.lastIndexOf(target);
          if (idx <= 0) return stack;
          return [...stack.slice(0, idx), ...stack.slice(idx + 1)];
        });
        this.apply();
      },
    };
  }

  /** Pop the most recently pushed layer (defaults remain). */
  pop(): void {
    this.stack.update(stack => (stack.length <= 1 ? stack : stack.slice(0, -1)));
    this.apply();
  }

  /** Clear all overrides, restore the defaults registered via `provideWrMeta`. */
  reset(): void {
    this.stack.set([this.defaults]);
    this.apply();
  }

  // Internals

  private apply(): void {
    const next = this.resolved();
    this.diffTitle(next);
    this.diffMeta(next);
    this.diffLink(next);
    this.applied = next;
  }

  private diffTitle(next: WrMetaConfig): void {
    if (next.title === this.applied.title && next.titleTemplate === this.applied.titleTemplate) return;
    if (next.title) {
      // `{{ title }}` reads like Angular; `%s` stays for printf fans.
      const formatted = next.titleTemplate
        ? next.titleTemplate.replace(/\{\{\s*title\s*\}\}/g, next.title).replace('%s', next.title)
        : next.title;
      this.title.setTitle(formatted);
    } else if (this.applied.title) {
      this.title.setTitle('');
    }
  }

  private diffMeta(next: WrMetaConfig): void {
    this.updateName('description', next.description);
    this.updateName('keywords', next.keywords?.join(', '));
    this.updateName('theme-color', next.themeColor);

    // Open Graph.
    this.updateProp('og:title', next.og?.title ?? next.title);
    this.updateProp('og:description', next.og?.description ?? next.description);
    this.updateProp('og:image', next.og?.image);
    this.updateProp('og:url', next.og?.url ?? next.canonical);
    this.updateProp('og:type', next.og?.type);
    this.updateProp('og:site_name', next.og?.siteName);

    // Twitter.
    this.updateName('twitter:card', next.twitter?.card);
    this.updateName('twitter:title', next.twitter?.title ?? next.title);
    this.updateName('twitter:description', next.twitter?.description ?? next.description);
    this.updateName('twitter:image', next.twitter?.image ?? next.og?.image);
    this.updateName('twitter:creator', next.twitter?.creator);
  }

  private updateName(name: string, content: string | undefined): void {
    if (content) {
      this.meta.updateTag({ name, content }, `name='${name}'`);
    } else {
      this.meta.removeTag(`name='${name}'`);
    }
  }

  private updateProp(property: string, content: string | undefined): void {
    if (content) {
      this.meta.updateTag({ property, content }, `property='${property}'`);
    } else {
      this.meta.removeTag(`property='${property}'`);
    }
  }

  private diffLink(next: WrMetaConfig): void {
    if (next.canonical === this.applied.canonical) return;
    const head = this.doc.head;
    let link = head.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (next.canonical) {
      if (!link) {
        link = this.doc.createElement('link');
        link.setAttribute('rel', 'canonical');
        head.appendChild(link);
      }
      link.setAttribute('href', next.canonical);
    } else if (link) {
      link.remove();
    }
  }
}
