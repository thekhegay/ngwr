import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import { filter, map } from 'rxjs';

import { WrBreadcrumbItemComponent, WrBreadcrumbsComponent } from 'ngwr/breadcrumbs';

type Crumb = { readonly label: string; readonly url: string | null };

/** "button-group" → "Button Group" */
function titleize(segment: string): string {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * URL-driven docs breadcrumbs. Reads the current router URL on every
 * `NavigationEnd` and renders a "Home › Docs › Section › Page" trail.
 */
@Component({
  selector: 'ngwr-docs-breadcrumbs',
  templateUrl: './docs-breadcrumbs.component.html',
  styleUrl: './docs-breadcrumbs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ngwr-docs-breadcrumbs' },
  imports: [WrBreadcrumbsComponent, WrBreadcrumbItemComponent],
})
export class DocsBreadcrumbsComponent {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  /**
   * Build the trail from the current URL. "Home" is prepended for any
   * non-root path; the final segment renders as the current page (no link).
   */
  protected readonly crumbs = computed<readonly Crumb[]>(() => {
    const path = this.url().split('?')[0].split('#')[0];
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return [];

    const items: Crumb[] = [{ label: 'Home', url: '/' }];

    let acc = '';
    parts.forEach((part, i) => {
      acc += `/${part}`;
      const isLast = i === parts.length - 1;
      items.push({ label: titleize(part), url: isLast ? null : acc });
    });

    return items;
  });
}
