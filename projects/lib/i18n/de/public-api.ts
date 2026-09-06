import { type WrI18nCatalog } from 'ngwr/i18n';

/** Base German catalog for ngwr built-in component strings. */
export const wrDe: WrI18nCatalog = {
  common: {
    ok: 'OK',
    cancel: 'Abbrechen',
    close: 'Schließen',
    confirm: 'Bestätigen',
    delete: 'Löschen',
    save: 'Speichern',
    edit: 'Bearbeiten',
    add: 'Hinzufügen',
    remove: 'Entfernen',
    clear: 'Leeren',
    search: 'Suchen',
    loading: 'Wird geladen…',
    select: 'Auswählen',
    next: 'Weiter',
    previous: 'Zurück',
    back: 'Zurück',
    today: 'Heute',
    yesterday: 'Gestern',
    tomorrow: 'Morgen',
    of: 'von',
  },
  pagination: {
    prev: 'Vorherige Seite',
    next: 'Nächste Seite',
    itemsPerPage: 'Einträge pro Seite',
    perPage: '{{size}} / Seite',
    goToPage: 'Zu Seite {{page}} wechseln',
    label: 'Seitennavigation',
    pageOf: 'Seite {{current}} von {{total}}',
    range: '{{from}}–{{to}} von {{total}}',
    compact: '{{current}} / {{total}}',
  },
  table: {
    empty: 'Keine Daten',
    loading: 'Wird geladen…',
    sort: 'Spalte sortieren',
    filter: 'Spalte filtern',
    selectAll: 'Alle Zeilen auswählen',
    selectRow: 'Zeile auswählen',
    expandRow: 'Zeilendetails ein-/ausblenden',
    toggleRow: 'Untergeordnete Zeilen ein-/ausblenden',
    selectGroup: 'Gruppe auswählen',
    toggleGroup: 'Gruppe ein-/ausblenden',
    noMatches: 'Keine Treffer',
    search: 'Suchen',
    reset: 'Zurücksetzen',
  },
  eventCalendar: {
    today: 'Heute',
    previous: 'Zurück',
    next: 'Weiter',
    month: 'Monat',
    week: 'Woche',
    day: 'Tag',
    time: 'Uhrzeit',
    allDay: 'Ganztägig',
    label: 'Kalender',
    more: '+{{count}} weitere',
    header: '{{month}} {{year}}',
    range: '{{from}} – {{to}}',
    chipLabel: '{{title}}, {{time}}',
    slotLabel: '{{time}} — {{date}}',
    allDayCellLabel: '{{label}} — {{date}}',
  },
  tour: {
    next: 'Weiter',
    back: 'Zurück',
    done: 'Fertig',
    skip: 'Tour überspringen',
    progress: 'Schritt {{current}} von {{total}}',
  },
  splitter: {
    divider: 'Bereichsgröße ändern',
  },
  stepper: {
    optional: 'optional',
  },
  transfer: {
    source: 'Verfügbar',
    target: 'Ausgewählt',
    search: 'Suchen',
    empty: 'Nichts vorhanden',
    selectAll: 'Alle auswählen',
    toTarget: 'Zur Auswahl hinzufügen',
    toSource: 'Aus der Auswahl entfernen',
    count: '{{checked}} / {{total}}',
  },
  form: {
    optional: 'optional',
  },
  validation: {
    required: 'Dieses Feld ist erforderlich.',
    requiredTrue: 'Dieses Feld muss aktiviert sein.',
    email: 'Geben Sie eine gültige E-Mail-Adresse ein.',
    minlength: 'Geben Sie mindestens {{requiredLength}} Zeichen ein.',
    maxlength: 'Geben Sie höchstens {{requiredLength}} Zeichen ein.',
    min: 'Geben Sie {{min}} oder mehr ein.',
    max: 'Geben Sie {{max}} oder weniger ein.',
    pattern: 'Dieser Wert hat nicht das erwartete Format.',
    noWhitespace: 'Dieser Wert darf keine Leerzeichen enthalten.',
    hexColor: 'Geben Sie eine Hex-Farbe ein, z. B. #1a2b3c.',
    url: 'Geben Sie eine gültige URL ein.',
    cardNumber: 'Geben Sie eine gültige Kartennummer ein.',
    cvc: 'Geben Sie den {{length}}-stelligen Sicherheitscode ein.',
    iban: 'Geben Sie eine gültige IBAN ein.',
    match: 'Die beiden Werte stimmen nicht überein.',
    matchFields: 'Diese Felder stimmen nicht überein.',
    oneOf: 'Wählen Sie einen der zulässigen Werte.',
    minDate: 'Wählen Sie ein späteres Datum.',
    maxDate: 'Wählen Sie ein früheres Datum.',
  },
  select: {
    // Accessible name of a `role="combobox"`, so a noun rather than the command
    // `Auswählen` — the placeholder below is the one that prompts an action.
    label: 'Auswahl',
    placeholder: 'Auswählen…',
    empty: 'Keine Optionen',
    clearSelection: 'Auswahl aufheben',
    removeItem: '{{label}} entfernen',
    noResults: 'Keine Ergebnisse',
    loading: 'Wird geladen…',
    more: '+{{count}} weitere',
  },
  // `tree` covers both inline display and combobox-mode pickers
  // (replaces the dropped `treeSelect` namespace).
  tree: {
    expand: 'Erweitern',
    collapse: 'Reduzieren',
    placeholder: 'Auswählen…',
    clearSelection: 'Auswahl aufheben',
    removeItem: '{{label}} entfernen',
    more: '+{{count}} weitere',
  },
  commandPalette: {
    label: 'Befehlspalette',
    placeholder: 'Befehl eingeben oder suchen…',
    noResults: 'Keine Ergebnisse',
    loading: 'Suche läuft…',
    escHint: 'esc',
  },
  empty: {
    noData: 'Keine Daten',
  },
  fileUpload: {
    browse: 'Zum Auswählen klicken',
    dropZone: 'oder Dateien hierher ziehen',
    dropZoneLabel: 'Ablagebereich für Dateien — klicken oder Dateien hierher ziehen',
    removeFile: 'Datei entfernen',
    invalid: 'Nicht unterstützter Dateityp',
    tooBig: 'Datei zu groß',
    size: '{{value}} {{unit}}',
    unitByte: 'B',
    unitKb: 'KB',
    unitMb: 'MB',
    unitGb: 'GB',
    unitTb: 'TB',
  },
  popconfirm: {
    label: 'Aktion bestätigen',
    confirm: 'Bestätigen',
    cancel: 'Abbrechen',
  },
  toast: {
    region: 'Benachrichtigungen',
    close: 'Schließen',
    copy: 'Kopieren',
    copied: 'Kopiert',
    closeAll: 'Alle schließen',
  },
  input: {
    showPassword: 'Passwort anzeigen',
    hidePassword: 'Passwort ausblenden',
  },
  inputNumber: {
    increment: 'Erhöhen',
    decrement: 'Verringern',
  },
  inputOtp: {
    label: 'Bestätigungscode',
    digit: 'Ziffer {{index}}',
    character: 'Zeichen {{index}}',
  },
  anchor: {
    label: 'Inhaltsverzeichnis',
  },
  avatar: {
    alt: 'Avatar',
  },
  backTop: {
    label: 'Nach oben',
  },
  breadcrumbs: {
    label: 'Navigationspfad',
  },
  burger: {
    label: 'Menü ein-/ausblenden',
  },
  calendar: {
    prevMonth: 'Vorheriger Monat',
    nextMonth: 'Nächster Monat',
    prevYear: 'Vorheriges Jahr',
    nextYear: 'Nächstes Jahr',
    // The month / year pickers are `role="listbox"`, and a listbox owes a
    // name — without one a screen reader announces the control as nothing at
    // all. Caught by `check:state-a11y` once a state finally opened the view.
    monthList: 'Monate',
    yearList: 'Jahre',
    prevYears: 'Vorherige 12 Jahre',
    nextYears: 'Nächste 12 Jahre',
    header: '{{month}} {{year}}',
    yearRange: '{{from}} – {{to}}',
    dayLabel: '{{weekday}}, {{date}}',
  },
  imageCropper: {
    empty: 'Kein Bild',
    window: 'Zuschneidebereich',
    keyHelp:
      'Mit den Pfeiltasten verschieben Sie den Zuschneidebereich. Halten Sie Alt und eine Pfeiltaste gedrückt, ' +
      'um die Größe zu ändern, und Umschalt für größere Schritte. Der Bereich wird als Abstand links, ' +
      'Abstand oben, Breite und Höhe in Bildpixeln angesagt.',
  },
  sortableList: {
    keyHelp:
      'Drücken Sie die Leertaste, um dieses Element aufzunehmen, und verschieben Sie es dann mit den Pfeiltasten. ' +
      'Drücken Sie die Leertaste erneut, um es abzulegen, oder Escape, um es an seinen Platz zurückzulegen.',
    grabbed: 'Aufgenommen. {{index}} von {{total}}.',
    moved: '{{index}} von {{total}}.',
    dropped: 'Abgelegt. {{index}} von {{total}}.',
    cancelled: 'Verschieben abgebrochen.',
  },
  colorPicker: {
    area: 'Sättigung und Helligkeit, {{saturation}} % und {{brightness}} %',
    hue: 'Farbton',
    alpha: 'Deckkraft',
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
    label: 'Kalender-Heatmap',
  },
  lineChart: {
    label: 'Liniendiagramm',
    thousands: '{{value}} Tsd.',
  },
  donutChart: {
    label: 'Ringdiagramm',
  },
  compare: {
    label: 'Vergleichsregler',
  },
  // Die beiden `roledescription`-Werte werden ANSTELLE des Rollennamens
  // vorgelesen. Anders als im Englischen bleiben sie großgeschrieben —
  // deutsche Substantive kennen keine Kleinschreibung als Stilmittel.
  carousel: {
    label: 'Karussell',
    goToSlide: 'Zu Folie {{index}} wechseln',
    prev: 'Vorherige Folie',
    next: 'Nächste Folie',
    pagination: 'Karussell-Navigation',
    roledescription: 'Karussell',
    slideRoledescription: 'Folie',
  },
  actionSheet: {
    label: 'Aktionen',
  },
  alert: {
    close: 'Hinweis schließen',
  },
  qr: {
    label: 'QR-Code',
  },
  image: {
    viewer: 'Bildvorschau',
    open: 'Vorschau öffnen',
    close: 'Vorschau schließen',
  },
  window: {
    close: 'Schließen',
    minimize: 'Minimieren',
    maximize: 'Maximieren',
    restore: 'Wiederherstellen',
    restoreDown: 'Verkleinern',
    restoreWindow: '{{title}} wiederherstellen',
    closeWindow: 'Fenster schließen',
    untitled: 'Unbenannt',
    taskbar: 'Minimierte Fenster',
  },
  dialog: {
    close: 'Dialog schließen',
  },
  // Bewusst allgemein: eine Popover-Fläche hat keinen universellen Namen, und
  // ein `role="dialog"` ohne Namen wird gar nicht angesagt. Pro Instanz über
  // `[ariaLabel]` überschreiben.
  popover: {
    label: 'Popover',
  },
  markdown: {
    copy: 'Code kopieren',
    copied: 'Kopiert',
    taskDone: 'Erledigt:',
    taskTodo: 'Offen:',
  },
  // Zahl am Ende und ein Substantiv ohne Pluralform: „Treffer“ lautet im
  // Singular wie im Plural, und der Interpolator beugt nichts.
  marquee: {
    label: 'Laufschrift',
    link: 'Link',
  },
  mention: {
    listbox: 'Erwähnungen',
    available: 'Treffer: {{count}}',
    inserted: 'Eingefügt: {{label}}',
  },
  drawer: {
    close: 'Bereich schließen',
  },
  datePicker: {
    open: 'Kalender öffnen',
    openTime: 'Uhrzeitauswahl öffnen',
    openDateTime: 'Datums- und Uhrzeitauswahl öffnen',
    openRange: 'Kalender für Zeitraum öffnen',
    panel: 'Datum wählen',
    panelTime: 'Uhrzeit wählen',
    panelDateTime: 'Datum und Uhrzeit wählen',
    panelRange: 'Zeitraum wählen',
    panelRangeDateTime: 'Zeitraum mit Uhrzeit wählen',
    rangeStart: 'Beginn des Zeitraums',
    rangeEnd: 'Ende des Zeitraums',
    startTime: 'Startzeit',
    endTime: 'Endzeit',
    hours: 'Stunden',
    minutes: 'Minuten',
    seconds: 'Sekunden',
    incrementHours: 'Stunden erhöhen',
    decrementHours: 'Stunden verringern',
    incrementMinutes: 'Minuten erhöhen',
    decrementMinutes: 'Minuten verringern',
    incrementSeconds: 'Sekunden erhöhen',
    decrementSeconds: 'Sekunden verringern',
    toggleAmPm: 'AM / PM umschalten',
    am: 'AM',
    pm: 'PM',
  },
  sidebar: {
    label: 'Seitenleiste',
  },
  spinner: {
    label: 'Wird geladen',
  },
  rating: {
    label: 'Bewertung',
  },
  gauge: {
    label: 'Messanzeige',
  },
  progress: {
    label: 'Fortschritt',
  },
  meterGroup: {
    label: 'Messwerte',
  },
  knob: {
    label: 'Wert',
  },
  slider: {
    label: 'Wert',
    lower: 'Unterer Wert',
    upper: 'Oberer Wert',
  },
  speedDial: {
    label: 'Aktionen',
  },
  statistic: {
    // Der Join, den die Sprache besitzt: im Deutschen steht zwischen Zahl und
    // Einheit ein Leerzeichen — „+12,4 %“, nicht „+12,4%“ (DIN 5008), wie auch
    // bei `fileUpload.size` und `colorPicker.area`.
    delta: '{{value}} {{suffix}}',
    deltaSuffix: '%',
  },
  result: {
    notFound: 'Diese Seite existiert leider nicht.',
    forbidden: 'Sie sind leider nicht berechtigt, auf diese Seite zuzugreifen.',
    serverError: 'Leider ist ein Fehler aufgetreten.',
  },
  date: {
    months: {
      jan: 'Januar',
      feb: 'Februar',
      mar: 'März',
      apr: 'April',
      may: 'Mai',
      jun: 'Juni',
      jul: 'Juli',
      aug: 'August',
      sep: 'September',
      oct: 'Oktober',
      nov: 'November',
      dec: 'Dezember',
    },
  },
};
