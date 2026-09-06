import { type WrI18nCatalog } from 'ngwr/i18n';

/** Base Dutch catalog for ngwr built-in component strings. */
export const wrNl: WrI18nCatalog = {
  common: {
    ok: 'OK',
    cancel: 'Annuleren',
    close: 'Sluiten',
    confirm: 'Bevestigen',
    delete: 'Verwijderen',
    save: 'Opslaan',
    edit: 'Bewerken',
    add: 'Toevoegen',
    remove: 'Verwijderen',
    clear: 'Wissen',
    search: 'Zoeken',
    loading: 'Laden…',
    select: 'Selecteren',
    next: 'Volgende',
    previous: 'Vorige',
    back: 'Terug',
    today: 'Vandaag',
    yesterday: 'Gisteren',
    tomorrow: 'Morgen',
    of: 'van',
  },
  pagination: {
    prev: 'Vorige pagina',
    next: 'Volgende pagina',
    itemsPerPage: 'Items per pagina',
    perPage: '{{size}} / pagina',
    goToPage: 'Ga naar pagina {{page}}',
    label: 'Paginering',
    pageOf: 'Pagina {{current}} van {{total}}',
    range: '{{from}}–{{to}} van {{total}}',
    compact: '{{current}} / {{total}}',
  },
  table: {
    empty: 'Geen gegevens',
    loading: 'Laden…',
    sort: 'Kolom sorteren',
    filter: 'Kolom filteren',
    selectAll: 'Alle rijen selecteren',
    selectRow: 'Rij selecteren',
    expandRow: 'Rijdetails tonen of verbergen',
    toggleRow: 'Onderliggende rijen tonen of verbergen',
    selectGroup: 'Groep selecteren',
    toggleGroup: 'Groep in- of uitklappen',
    noMatches: 'Geen resultaten',
    search: 'Zoeken',
    reset: 'Wissen',
  },
  eventCalendar: {
    today: 'Vandaag',
    previous: 'Vorige',
    next: 'Volgende',
    month: 'Maand',
    week: 'Week',
    day: 'Dag',
    time: 'Tijd',
    allDay: 'Hele dag',
    label: 'Agenda',
    more: '+{{count}} meer',
    header: '{{month}} {{year}}',
    range: '{{from}} – {{to}}',
    chipLabel: '{{title}}, {{time}}',
    slotLabel: '{{time}} — {{date}}',
    allDayCellLabel: '{{label}} — {{date}}',
  },
  tour: {
    next: 'Volgende',
    back: 'Terug',
    done: 'Klaar',
    skip: 'Rondleiding overslaan',
    progress: 'Stap {{current}} van {{total}}',
  },
  splitter: {
    divider: 'Deelvensters vergroten of verkleinen',
  },
  stepper: {
    optional: 'optioneel',
  },
  transfer: {
    source: 'Beschikbaar',
    target: 'Geselecteerd',
    search: 'Zoeken',
    empty: 'Geen items',
    selectAll: 'Alles selecteren',
    toTarget: 'Toevoegen aan selectie',
    toSource: 'Verwijderen uit selectie',
    count: '{{checked}} / {{total}}',
  },
  form: {
    optional: 'optioneel',
  },
  validation: {
    required: 'Dit veld is verplicht.',
    requiredTrue: 'Dit veld moet aangevinkt zijn.',
    email: 'Voer een geldig e-mailadres in.',
    // Count last, because the interpolator has no plural machinery and
    // "minimaal 1 tekens" would be wrong at one.
    minlength: 'Minimaal aantal tekens: {{requiredLength}}.',
    maxlength: 'Maximaal aantal tekens: {{requiredLength}}.',
    min: 'Voer {{min}} of meer in.',
    max: 'Voer {{max}} of minder in.',
    pattern: 'Deze waarde heeft niet de verwachte indeling.',
    noWhitespace: 'Deze waarde mag geen spaties bevatten.',
    hexColor: 'Voer een hexadecimale kleurcode in, bijv. #1a2b3c.',
    url: 'Voer een geldige URL in.',
    cardNumber: 'Voer een geldig kaartnummer in.',
    cvc: 'Voer de {{length}}-cijferige beveiligingscode in.',
    iban: 'Voer een geldig IBAN in.',
    match: 'De twee waarden komen niet overeen.',
    matchFields: 'Deze velden komen niet overeen.',
    oneOf: 'Kies een van de toegestane waarden.',
    minDate: 'Kies een latere datum.',
    maxDate: 'Kies een eerdere datum.',
  },
  select: {
    label: 'Selecteren',
    placeholder: 'Selecteer…',
    empty: 'Geen opties',
    clearSelection: 'Selectie wissen',
    removeItem: '{{label}} verwijderen',
    noResults: 'Geen resultaten',
    loading: 'Laden…',
    more: '+{{count}} meer',
  },
  // `tree` covers both inline display and combobox-mode pickers
  // (replaces the dropped `treeSelect` namespace).
  tree: {
    expand: 'Uitklappen',
    collapse: 'Inklappen',
    placeholder: 'Selecteer…',
    clearSelection: 'Selectie wissen',
    removeItem: '{{label}} verwijderen',
    more: '+{{count}} meer',
  },
  commandPalette: {
    label: 'Opdrachtenpalet',
    placeholder: 'Typ een opdracht of zoekterm…',
    noResults: 'Geen resultaten',
    loading: 'Bezig met zoeken…',
    escHint: 'esc',
  },
  empty: {
    noData: 'Geen gegevens',
  },
  fileUpload: {
    browse: 'Klik om te bladeren',
    dropZone: 'of sleep bestanden hierheen',
    dropZoneLabel: 'Uploadzone — klik of sleep bestanden hierheen',
    removeFile: 'Bestand verwijderen',
    invalid: 'Niet-ondersteund bestandstype',
    tooBig: 'Bestand is te groot',
    size: '{{value}} {{unit}}',
    unitByte: 'B',
    unitKb: 'KB',
    unitMb: 'MB',
    unitGb: 'GB',
    unitTb: 'TB',
  },
  popconfirm: {
    label: 'Actie bevestigen',
    confirm: 'Bevestigen',
    cancel: 'Annuleren',
  },
  toast: {
    region: 'Meldingen',
    close: 'Sluiten',
    copy: 'Kopiëren',
    copied: 'Gekopieerd',
    closeAll: 'Alles sluiten',
  },
  input: {
    showPassword: 'Wachtwoord tonen',
    hidePassword: 'Wachtwoord verbergen',
  },
  inputNumber: {
    increment: 'Verhogen',
    decrement: 'Verlagen',
  },
  inputOtp: {
    label: 'Verificatiecode',
    digit: 'Cijfer {{index}}',
    character: 'Teken {{index}}',
  },
  anchor: {
    label: 'Inhoudsopgave',
  },
  avatar: {
    alt: 'Avatar',
  },
  backTop: {
    label: 'Terug naar boven',
  },
  breadcrumbs: {
    label: 'Kruimelpad',
  },
  burger: {
    label: 'Menu openen of sluiten',
  },
  calendar: {
    prevMonth: 'Vorige maand',
    nextMonth: 'Volgende maand',
    prevYear: 'Vorig jaar',
    nextYear: 'Volgend jaar',
    // The month / year pickers are `role="listbox"`, and a listbox owes a
    // name — without one a screen reader announces the control as nothing at
    // all. Caught by `check:state-a11y` once a state finally opened the view.
    monthList: 'Maanden',
    yearList: 'Jaren',
    prevYears: 'Vorige 12 jaar',
    nextYears: 'Volgende 12 jaar',
    header: '{{month}} {{year}}',
    yearRange: '{{from}} – {{to}}',
    dayLabel: '{{weekday}}, {{date}}',
  },
  imageCropper: {
    empty: 'Geen afbeelding',
    window: 'Uitsnede',
    keyHelp:
      'Verplaats de uitsnede met de pijltoetsen. Houd Alt ingedrukt bij een pijltoets om het formaat te wijzigen, ' +
      'en Shift voor grotere stappen. De uitsnede wordt aangekondigd als links, boven, breedte en hoogte in beeldpixels.',
  },
  sortableList: {
    keyHelp:
      'Druk op de spatiebalk om dit item op te pakken en verplaats het daarna met de pijltoetsen. ' +
      'Druk nogmaals op de spatiebalk om het neer te zetten, of op Escape om het terug te zetten.',
    grabbed: 'Opgepakt. {{index}} van {{total}}.',
    moved: '{{index}} van {{total}}.',
    dropped: 'Neergezet. {{index}} van {{total}}.',
    cancelled: 'Verplaatsing geannuleerd.',
  },
  colorPicker: {
    area: 'Verzadiging en helderheid, {{saturation}}% en {{brightness}}%',
    hue: 'Tint',
    alpha: 'Dekking',
    formatHex: 'HEX',
    formatRgb: 'RGB',
    formatHsl: 'HSL',
    channelHex: 'HEX',
    channelRed: 'R',
    channelGreen: 'G',
    channelBlue: 'B',
    channelHue: 'H',
    channelSaturation: 'S%',
    channelLightness: 'L%',
    channelAlpha: 'A%',
  },
  calendarHeatmap: {
    label: 'Kalenderheatmap',
  },
  lineChart: {
    label: 'Lijndiagram',
    thousands: '{{value}}k',
  },
  donutChart: {
    label: 'Ringdiagram',
  },
  compare: {
    label: 'Scheidingslijn voor vergelijking',
  },
  // De twee `roledescription`-waarden worden uitgesproken IN PLAATS VAN de naam van
  // de rol, dus het zijn kleingeschreven zelfstandige naamwoorden — carrousel, dia —
  // en geen labels met een hoofdletter zoals hierboven.
  carousel: {
    label: 'Carrousel',
    goToSlide: 'Ga naar dia {{index}}',
    prev: 'Vorige dia',
    next: 'Volgende dia',
    pagination: 'Carrouselpaginering',
    roledescription: 'carrousel',
    slideRoledescription: 'dia',
  },
  actionSheet: {
    label: 'Acties',
  },
  alert: {
    close: 'Melding sluiten',
  },
  qr: {
    label: 'QR-code',
  },
  image: {
    viewer: 'Afbeeldingsvoorbeeld',
    open: 'Voorbeeld openen',
    close: 'Voorbeeld sluiten',
  },
  window: {
    close: 'Sluiten',
    minimize: 'Minimaliseren',
    maximize: 'Maximaliseren',
    restore: 'Herstellen',
    restoreDown: 'Vorig formaat',
    restoreWindow: '{{title}} herstellen',
    closeWindow: 'Venster sluiten',
    untitled: 'Naamloos',
    taskbar: 'Geminimaliseerde vensters',
  },
  dialog: {
    close: 'Dialoogvenster sluiten',
  },
  // Bewust algemeen: een popoverpaneel heeft geen universele naam, en een
  // `role="dialog"` zonder naam wordt helemaal niet aangekondigd. Overschrijf het
  // per instantie met `[ariaLabel]`.
  popover: {
    label: 'Zwevend paneel',
  },
  markdown: {
    copy: 'Code kopiëren',
    copied: 'Gekopieerd',
    taskDone: 'Klaar:',
    taskTodo: 'Te doen:',
  },
  // Bewust zonder meervoudsvorm: de interpolator vult alleen waarden in en kent
  // geen meervoud, dus het telwoord staat achteraan — Beschikbare resultaten: 1
  // moet net zo goed lopen als bij 5.
  marquee: {
    label: 'Lopende tekst',
    link: 'koppeling',
  },
  mention: {
    listbox: 'Vermeldingen',
    available: 'Beschikbare resultaten: {{count}}',
    inserted: 'Ingevoegd: {{label}}',
  },
  drawer: {
    close: 'Paneel sluiten',
  },
  datePicker: {
    open: 'Kalender openen',
    openTime: 'Tijdkiezer openen',
    openDateTime: 'Datum- en tijdkiezer openen',
    openRange: 'Periodekalender openen',
    panel: 'Datum kiezen',
    panelTime: 'Tijd kiezen',
    panelDateTime: 'Datum en tijd kiezen',
    panelRange: 'Periode kiezen',
    panelRangeDateTime: 'Periode met tijd kiezen',
    rangeStart: 'Begin van periode',
    rangeEnd: 'Einde van periode',
    startTime: 'Begintijd',
    endTime: 'Eindtijd',
    hours: 'Uren',
    minutes: 'Minuten',
    seconds: 'Seconden',
    incrementHours: 'Uren verhogen',
    decrementHours: 'Uren verlagen',
    incrementMinutes: 'Minuten verhogen',
    decrementMinutes: 'Minuten verlagen',
    incrementSeconds: 'Seconden verhogen',
    decrementSeconds: 'Seconden verlagen',
    toggleAmPm: 'Wisselen tussen a.m. en p.m.',
    am: 'a.m.',
    pm: 'p.m.',
  },
  sidebar: {
    label: 'Zijbalk',
  },
  spinner: {
    label: 'Laden',
  },
  rating: {
    label: 'Beoordeling',
  },
  gauge: {
    label: 'Meter',
  },
  progress: {
    label: 'Voortgang',
  },
  meterGroup: {
    label: 'Meterbalk',
  },
  knob: {
    label: 'Waarde',
  },
  slider: {
    label: 'Waarde',
    lower: 'Laagste waarde',
    upper: 'Hoogste waarde',
  },
  speedDial: {
    label: 'Acties',
  },
  statistic: {
    delta: '{{value}}{{suffix}}',
    deltaSuffix: '%',
  },
  result: {
    notFound: 'Sorry, deze pagina bestaat niet.',
    forbidden: 'Sorry, u hebt geen toegang tot deze pagina.',
    serverError: 'Sorry, er is iets misgegaan.',
  },
  date: {
    months: {
      jan: 'januari',
      feb: 'februari',
      mar: 'maart',
      apr: 'april',
      may: 'mei',
      jun: 'juni',
      jul: 'juli',
      aug: 'augustus',
      sep: 'september',
      oct: 'oktober',
      nov: 'november',
      dec: 'december',
    },
  },
};
