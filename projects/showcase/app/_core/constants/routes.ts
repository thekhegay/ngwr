/**
 * Every route the site has: the segment it contributes, and the title it is
 * shown under.
 *
 * One tree instead of two sources. The slugs lived here and the titles lived
 * in the sidebar configs, which repeated the URL beside each one — 209 rows of
 * `{ title: 'Bar Chart', url: ['/charts', 'bar-chart'] }` that nothing held to
 * the route tree, so a renamed slug left a nav row pointing at a 404. A config
 * REFERENCES a node now and takes both from it.
 *
 * A node carries its OWN segment and nothing else: no absolute `url`, no
 * leading slash. A caller that needs a path builds one from the nodes it is
 * already holding — `[ROUTES.docs.path, ROUTES.docs.introduction.path]` — which
 * is one array where storing the answer was 239 strings with the prefix baked
 * into each.
 *
 * Imported as `#routes`.
 */

/** One route: its own segment, and its title. */
export interface WrRoute {
  readonly path: string;
  readonly title: string;
}

/**
 * `wrPath(ROUTES.docs, ROUTES.docs.introduction)` → `'/docs/introduction'`.
 *
 * The one place a leading slash is written. A node carries its own segment and
 * nothing else, so the caller names the chain it wants — which is also what
 * makes a moved cluster a compile error at every call site rather than a
 * silently wrong string.
 */
export function wrPath(...nodes: readonly WrRoute[]): string {
  return `/${nodes
    .map(n => n.path)
    .filter(Boolean)
    .join('/')}`;
}

/** `wrLink(ROUTES.bits, ROUTES.bits.aurora)` → `{ title: 'Aurora', url: '/bits/aurora' }`. */
export function wrLink(...nodes: readonly WrRoute[]): { readonly title: string; readonly url: string } {
  return { title: nodes[nodes.length - 1].title, url: wrPath(...nodes) };
}

export const ROUTES = {
  /** The site root. */
  home: { path: '', title: 'ngwr' },
  icons: {
    path: 'icons',
    title: 'Icons',
    overview: { path: 'overview', title: 'Overview' },
    lucide: { path: 'lucide', title: 'Lucide' },
    feather: { path: 'feather', title: 'Feather' },
    tabler: { path: 'tabler', title: 'Tabler' },
    phosphor: { path: 'phosphor', title: 'Phosphor' },
    heroicons: { path: 'heroicons', title: 'Heroicons' },
    iconoir: { path: 'iconoir', title: 'Iconoir' },
    radix: { path: 'radix', title: 'Radix' },
    bootstrap: { path: 'bootstrap', title: 'Bootstrap' },
  },
  docs: {
    path: 'docs',
    title: 'Docs',
    introduction: { path: 'introduction', title: 'Introduction' },
    installation: { path: 'installation', title: 'Installation' },
    configuration: { path: 'configuration', title: 'Configuration' },
    migration: { path: 'migration', title: 'Migration' },
    skills: { path: 'skills', title: 'Skills' },
    mcp: { path: 'mcp-server', title: 'MCP Server' },
  },
  charts: {
    path: 'charts',
    title: 'Charts',
    barChart: { path: 'bar-chart', title: 'Bar Chart' },
    calendarHeatmap: { path: 'calendar-heatmap', title: 'Calendar Heatmap' },
    donutChart: { path: 'donut-chart', title: 'Donut Chart' },
    gauge: { path: 'gauge', title: 'Gauge' },
    lineChart: { path: 'line-chart', title: 'Line Chart' },
    meterGroup: { path: 'meter-group', title: 'Meter Group' },
    sparkline: { path: 'sparkline', title: 'Sparkline' },
  },
  guides: {
    path: 'guides',
    title: 'Guides',
    theming: { path: 'theming', title: 'Theming' },
    grid: { path: 'grid', title: 'Grid' },
    forms: { path: 'forms', title: 'Reactive forms' },
    overlay: { path: 'overlay', title: 'Overlay' },
    mobile: { path: 'mobile', title: 'Mobile & responsive' },
    keyboard: { path: 'keyboard', title: 'Keyboard' },
    ssr: { path: 'ssr', title: 'Server-side rendering' },
    testing: { path: 'testing', title: 'Testing' },
    csp: { path: 'csp', title: 'Content Security Policy' },
    tokens: {
      path: 'tokens',
      title: 'Design tokens',
      colors: { path: 'colors', title: 'Colors' },
      sizing: { path: 'sizing', title: 'Sizing' },
      typography: { path: 'typography', title: 'Typography' },
      density: { path: 'density', title: 'Density' },
      motion: { path: 'motion', title: 'Motion' },
      builder: { path: 'builder', title: 'Theme builder' },
    },
    color: { path: 'color', title: 'Colour' },
    typography: {
      path: 'typography',
      title: 'Typography',
      overview: { path: 'overview', title: 'Overview' },
      styles: { path: 'styles', title: 'Styles' },
      headings: { path: 'headings', title: 'Headings' },
      paragraphs: { path: 'paragraphs', title: 'Paragraphs' },
      lists: { path: 'lists', title: 'Lists' },
      links: { path: 'links', title: 'Links' },
      text: { path: 'text', title: 'Text' },
      code: { path: 'code', title: 'Code' },
      keyboard: { path: 'keyboard', title: 'Keyboard' },
    },
    translations: {
      path: 'translations',
      title: 'Translations',
      overview: { path: 'overview', title: 'Overview' },
      setup: { path: 'setup', title: 'Setup & loaders' },
      usage: { path: 'usage', title: 'Usage in templates' },
      scopes: { path: 'scopes', title: 'Scopes' },
      interpolation: { path: 'interpolation', title: 'Interpolation' },
      api: { path: 'api', title: 'API' },
    },
  },
  reference: {
    path: 'reference',
    title: 'Reference',
    components: {
      path: 'components',
      title: 'Components',
      alert: { path: 'alert', title: 'Alert' },
      anchor: { path: 'anchor', title: 'Anchor' },
      avatar: { path: 'avatar', title: 'Avatar' },
      backTop: { path: 'back-top', title: 'Back to Top' },
      badge: { path: 'badge', title: 'Badge' },
      breadcrumbs: { path: 'breadcrumbs', title: 'Breadcrumbs' },
      burger: { path: 'burger', title: 'Burger' },
      button: { path: 'button', title: 'Button' },
      buttonGroup: { path: 'button-group', title: 'Button Group' },
      calendar: { path: 'calendar', title: 'Calendar' },
      card: { path: 'card', title: 'Card' },
      carousel: { path: 'carousel', title: 'Carousel' },
      cascader: { path: 'cascader', title: 'Cascader' },
      checkbox: { path: 'checkbox', title: 'Checkbox' },
      collapse: { path: 'collapse', title: 'Collapse' },
      colorPicker: { path: 'color-picker', title: 'Color Picker' },
      commandPalette: {
        path: 'command-palette',
        title: 'Command Palette',
      },
      compare: { path: 'compare', title: 'Compare' },
      contextMenu: { path: 'context-menu', title: 'Context Menu' },
      counter: { path: 'counter', title: 'Counter' },
      datePicker: { path: 'date-picker', title: 'Date Picker' },
      dialog: { path: 'dialog', title: 'Dialog' },
      divider: { path: 'divider', title: 'Divider' },
      drawer: { path: 'drawer', title: 'Drawer' },
      editor: { path: 'editor', title: 'Editor' },
      eventCalendar: { path: 'event-calendar', title: 'Event Calendar' },
      empty: { path: 'empty', title: 'Empty' },
      form: { path: 'form', title: 'Form' },
      formField: { path: 'form-field', title: 'Form Field' },
      icon: { path: 'icon', title: 'Icon' },
      lightbox: { path: 'lightbox', title: 'Lightbox' },
      imageCropper: { path: 'image-cropper', title: 'Image Cropper' },
      input: { path: 'input', title: 'Input' },
      inputNumber: { path: 'input-number', title: 'Input Number' },
      layout: { path: 'layout', title: 'Layout' },
      list: { path: 'list', title: 'List' },
      inputOtp: { path: 'input-otp', title: 'Input OTP' },
      keyboard: { path: 'keyboard', title: 'Keyboard' },
      knob: { path: 'knob', title: 'Knob' },
      markdown: { path: 'markdown', title: 'Markdown' },
      mention: { path: 'mention', title: 'Mention' },
      pageHeader: { path: 'page-header', title: 'Page Header' },
      result: { path: 'result', title: 'Result' },
      speedDial: { path: 'speed-dial', title: 'Speed Dial' },
      splitter: { path: 'splitter', title: 'Splitter' },
      statistic: { path: 'statistic', title: 'Statistic' },
      timeline: { path: 'timeline', title: 'Timeline' },
      toolbar: { path: 'toolbar', title: 'Toolbar' },
      descriptions: { path: 'descriptions', title: 'Descriptions' },
      popconfirm: { path: 'popconfirm', title: 'Popconfirm' },
      popover: { path: 'popover', title: 'Popover' },
      progress: { path: 'progress', title: 'Progress' },
      qrCode: { path: 'qrcode', title: 'QR' },
      radio: { path: 'radio', title: 'Radio' },
      rating: { path: 'rating', title: 'Rating' },
      schemaForm: { path: 'schema-form', title: 'Schema Form' },
      segmented: { path: 'segmented', title: 'Segmented' },
      skeleton: { path: 'skeleton', title: 'Skeleton' },
      slider: { path: 'slider', title: 'Slider' },
      spinner: { path: 'spinner', title: 'Spinner' },
      stepper: { path: 'stepper', title: 'Stepper' },
      switch: { path: 'switch', title: 'Switch' },
      tabs: { path: 'tabs', title: 'Tabs' },
      typography: { path: 'typography', title: 'Typography' },
      textarea: { path: 'textarea', title: 'Textarea' },
      transfer: { path: 'transfer', title: 'Transfer' },
      toast: { path: 'toast', title: 'Toast' },
      tree: { path: 'tree', title: 'Tree' },
      graph: { path: 'graph', title: 'Graph' },
      select: { path: 'select', title: 'Select' },
      sidebar: { path: 'sidebar', title: 'Sidebar' },
      dropdown: { path: 'dropdown', title: 'Dropdown' },
      fileUpload: { path: 'file-upload', title: 'File Upload' },
      pagination: { path: 'pagination', title: 'Pagination' },
      pullToRefresh: {
        path: 'pull-to-refresh',
        title: 'Pull to Refresh',
      },
      table: { path: 'table', title: 'Table' },
      virtualScroll: { path: 'virtual-scroll', title: 'Virtual Scroll' },
      sortableList: { path: 'sortable-list', title: 'Sortable List' },
      window: { path: 'window', title: 'Window' },
    },
    directives: {
      path: 'directives',
      title: 'Directives',
      affix: { path: 'affix', title: 'wrAffix' },
      autofocus: { path: 'autofocus', title: 'wrAutofocus' },
      autosize: { path: 'autosize', title: 'wrAutosize' },
      clickOutside: { path: 'click-outside', title: 'wrClickOutside' },
      copyToClipboard: {
        path: 'copy-to-clipboard',
        title: 'wrCopyToClipboard',
      },
      typography: { path: 'typography', title: 'wrTypography API' },
    },
    pipes: {
      path: 'pipes',
      title: 'Pipes',
      wrNumber: { path: 'wr-number', title: 'wrNumber' },
      wrBytes: { path: 'wr-bytes', title: 'wrBytes' },
      wrDate: { path: 'wr-date', title: 'wrDate' },
      wrTruncate: { path: 'wr-truncate', title: 'wrTruncate' },
      wrMark: { path: 'wr-mark', title: 'wrMark' },
      wrPlural: { path: 'wr-plural', title: 'wrPlural' },
      wrRange: { path: 'wr-range', title: 'wrRange' },
    },
    services: {
      path: 'services',
      title: 'Services',
      theme: { path: 'theme', title: 'WrTheme' },
      scroll: { path: 'scroll', title: 'WrScroll' },
      hotkey: { path: 'hotkey', title: 'WrHotkey' },
      media: { path: 'media', title: 'WrMedia' },
      platform: { path: 'platform', title: 'WrPlatform' },
      meta: { path: 'meta', title: 'WrMeta' },
      storage: { path: 'storage', title: 'WrStorage' },
      i18n: { path: 'i18n', title: 'WrI18n' },
      density: { path: 'density', title: 'WrDensity' },
      clipboard: { path: 'clipboard', title: 'WrClipboard' },
      cookie: { path: 'cookie', title: 'WrCookie' },
      loadingBar: { path: 'loading-bar', title: 'WrLoadingBar' },
      tour: { path: 'tour', title: 'WrTour' },
    },
    utils: {
      path: 'utils',
      title: 'Utils',
      types: { path: 'types', title: 'Types' },
      clamp: { path: 'clamp', title: 'clamp' },
      round: { path: 'round', title: 'round' },
      numAttr: { path: 'num-attr', title: 'numAttr' },
      toClassList: { path: 'to-class-list', title: 'toClassList' },
      resolveCssSize: { path: 'resolve-css-size', title: 'resolveCssSize' },
      getRootFontSize: {
        path: 'get-root-font-size',
        title: 'getRootFontSize',
      },
      randomId: { path: 'random-id', title: 'randomId' },
      isDefined: { path: 'is-defined', title: 'isDefined' },
      isNonEmptyArray: {
        path: 'is-non-empty-array',
        title: 'isNonEmptyArray',
      },
      isObservable: { path: 'is-observable', title: 'isObservable' },
      keys: { path: 'keys', title: 'KEYS' },
      hasModifier: { path: 'has-modifier', title: 'hasModifier' },
      isComposing: { path: 'is-composing', title: 'isComposing' },
      isPrintableKey: { path: 'is-printable-key', title: 'isPrintableKey' },
      noop: { path: 'noop', title: 'noop' },
      badgeLog: { path: 'badge-log', title: 'badgeLog' },
      debounce: { path: 'debounce', title: 'debounce' },
      throttle: { path: 'throttle', title: 'throttle' },
      getFocusableElements: {
        path: 'get-focusable-elements',
        title: 'getFocusableElements',
      },
      trapFocus: { path: 'trap-focus', title: 'trapFocus' },
    },
    validators: {
      path: 'validators',
      title: 'Validators',
      // `urlValidator`, not `url`: a child key named `url` shadows the node's
      // own field, and the three field names are reserved for that reason.
      urlValidator: { path: 'url', title: 'url' },
      noWhitespace: { path: 'no-whitespace', title: 'noWhitespace' },
      hexColor: { path: 'hex-color', title: 'hexColor' },
      cardNumber: { path: 'card-number', title: 'cardNumber' },
      cvc: { path: 'cvc', title: 'cvc' },
      iban: { path: 'iban', title: 'iban' },
      match: { path: 'match', title: 'match' },
      matchFields: { path: 'match-fields', title: 'matchFields' },
      oneOf: { path: 'one-of', title: 'oneOf' },
      minDate: { path: 'min-date', title: 'minDate' },
      maxDate: { path: 'max-date', title: 'maxDate' },
    },
    interfaces: {
      path: 'interfaces',
      title: 'Interfaces',
      overview: { path: 'overview', title: 'Overview' },
      common: { path: 'common', title: 'Common' },
      theme: { path: 'theme', title: 'Theme' },
      catalog: { path: 'catalog', title: 'Catalog' },
    },
  },
  bits: {
    path: 'bits',
    title: 'Bits',
    borderGlow: { path: 'border-glow', title: 'Border Glow' },
    aurora: { path: 'aurora', title: 'Aurora' },
    marquee: { path: 'marquee', title: 'Marquee' },
    confetti: { path: 'confetti', title: 'Confetti' },
    spotlightCard: { path: 'spotlight-card', title: 'Spotlight Card' },
    tiltCard: { path: 'tilt-card', title: 'Tilt Card' },
    clickSpark: { path: 'click-spark', title: 'Click Spark' },
    waves: { path: 'waves', title: 'Waves' },
    starBorder: { path: 'star-border', title: 'Star Border' },
    splashCursor: { path: 'splash-cursor', title: 'Splash Cursor' },
    splitText: { path: 'split-text', title: 'Split Text' },
    blurText: { path: 'blur-text', title: 'Blur Text' },
    shinyText: { path: 'shiny-text', title: 'Shiny Text' },
    gradientText: { path: 'gradient-text', title: 'Gradient Text' },
    rotatingText: { path: 'rotating-text', title: 'Rotating Text' },
    typewriter: { path: 'typewriter', title: 'Typewriter' },
    decryptText: { path: 'decrypt-text', title: 'Decrypt Text' },
    glitchText: { path: 'glitch-text', title: 'Glitch Text' },
    fuzzyText: { path: 'fuzzy-text', title: 'Fuzzy Text' },
    fallingText: { path: 'falling-text', title: 'Falling Text' },
    circularText: { path: 'circular-text', title: 'Circular Text' },
  },
} as const;
