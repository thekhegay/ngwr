import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DocPageComponent, DocSectionComponent } from '#core/components';

interface TypeEntry {
  readonly name: string;
  readonly description: string;
  readonly url: readonly string[];
}

interface TypeGroup {
  readonly title: string;
  readonly items: readonly TypeEntry[];
}

@Component({
  selector: 'ngwr-interfaces-catalog-page',
  templateUrl: './catalog.html',
  imports: [RouterLink, DocPageComponent, DocSectionComponent],
})
export default class TypesCatalogPage {
  protected readonly groups: readonly TypeGroup[] = [
    {
      title: 'Core',
      items: [
        { name: 'Maybe<T>', description: 'Optional value — T | null | undefined.', url: ['/interfaces', 'common'] },
        { name: 'SafeAny', description: 'Greppable, deliberate any.', url: ['/interfaces', 'common'] },
        { name: 'WrColor', description: 'Palette union behind every [color] input.', url: ['/interfaces', 'theme'] },
        { name: 'WrThemeMode', description: 'light / dark / auto.', url: ['/interfaces', 'theme'] },
        { name: 'WrIconName', description: 'Registered icon name.', url: ['/icons', 'overview'] },
      ],
    },
    {
      title: 'Forms',
      items: [
        {
          name: 'WrSegmentedOption',
          description: 'One entry in a segmented track.',
          url: ['/components', 'segmented'],
        },
        { name: 'WrSelectMode', description: 'single / multi / search / tag.', url: ['/components', 'select'] },
        { name: 'WrCascaderOption', description: 'Node in a cascader tree.', url: ['/components', 'cascader'] },
        {
          name: 'WrCalendarRange',
          description: '[start, end] tuple for range mode.',
          url: ['/components', 'calendar'],
        },
        {
          name: 'WrFileUploadRejection',
          description: 'Rejected file + reason.',
          url: ['/components', 'file-upload'],
        },
        { name: 'WrMentionItem', description: 'Mentionable entry.', url: ['/components', 'mention'] },
      ],
    },
    {
      title: 'Data display',
      items: [
        { name: 'WrTableColumns', description: 'Column map keyed by row property.', url: ['/components', 'table'] },
        { name: 'WrTableColumn', description: 'Single column definition.', url: ['/components', 'table'] },
        { name: 'WrTableSortState', description: 'Emitted by (sortChange).', url: ['/components', 'table'] },
        { name: 'WrTreeNode', description: 'Immutable tree node.', url: ['/components', 'tree'] },
        { name: 'WrMarqueeItem', description: 'Image or template marquee entry.', url: ['/animations', 'marquee'] },
        { name: 'WrTimelineColor', description: 'Dot color union.', url: ['/components', 'timeline'] },
      ],
    },
    {
      title: 'Charts',
      items: [
        { name: 'WrBarChartDatum', description: 'One bar of data.', url: ['/components', 'bar-chart'] },
        { name: 'WrLineSeries', description: 'One plotted line.', url: ['/components', 'line-chart'] },
        { name: 'WrDonutSegment', description: 'One slice of the ring.', url: ['/components', 'donut-chart'] },
        {
          name: 'WrHeatmapDatum',
          description: 'One contribution cell.',
          url: ['/components', 'calendar-heatmap'],
        },
        { name: 'WrMeterSegment', description: 'One meter-group segment.', url: ['/components', 'meter-group'] },
      ],
    },
    {
      title: 'Navigation',
      items: [
        { name: 'WrSidebarItem', description: 'Navigable sidebar entry.', url: ['/components', 'sidebar'] },
        { name: 'WrSidebarGroup', description: 'Expandable group of items.', url: ['/components', 'sidebar'] },
        { name: 'WrAnchorLink', description: 'Entry in the anchor rail.', url: ['/components', 'anchor'] },
        {
          name: 'WrCommandItem',
          description: 'Command palette action.',
          url: ['/components', 'command-palette'],
        },
        { name: 'WrSpeedDialAction', description: 'Expanded dial button.', url: ['/components', 'speed-dial'] },
      ],
    },
    {
      title: 'Overlays & feedback',
      items: [
        { name: 'WrToastOptions', description: 'Per-toast configuration.', url: ['/components', 'toast'] },
        { name: 'WrDialogOptions', description: 'Programmatic dialog config.', url: ['/components', 'dialog'] },
        { name: 'WrWindowConfig', description: 'Floating window config.', url: ['/components', 'window'] },
        { name: 'WrPopoverPosition', description: 'Anchor side union.', url: ['/components', 'popover'] },
        { name: 'WrResultStatus', description: 'Result preset union.', url: ['/components', 'result'] },
      ],
    },
    {
      title: 'Services & config',
      items: [
        { name: 'WrThemeConfig', description: 'provideWrTheme options.', url: ['/services', 'theme'] },
        { name: 'WrScrollOptions', description: 'Scroll target + behavior.', url: ['/services', 'scroll'] },
        { name: 'WrHotkeySpec', description: 'Key combo descriptor.', url: ['/services', 'hotkey'] },
        { name: 'WrMetaConfig', description: 'Title template + tag defaults.', url: ['/services', 'meta'] },
        { name: 'WrStorageConfig', description: 'Prefix + engine selection.', url: ['/services', 'storage'] },
        { name: 'WrCookieOptions', description: 'Expiry / path / SameSite.', url: ['/services', 'cookie'] },
        { name: 'WrBreakpoint', description: 'Named responsive breakpoint.', url: ['/services', 'media'] },
        { name: 'WrPluralForms', description: 'CLDR plural category map.', url: ['/pipes', 'wr-plural'] },
      ],
    },
  ];
}
