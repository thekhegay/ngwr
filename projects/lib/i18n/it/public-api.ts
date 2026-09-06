import { type WrI18nCatalog } from 'ngwr/i18n';

/** Base Italian catalog for ngwr built-in component strings. */
export const wrIt: WrI18nCatalog = {
  common: {
    ok: 'OK',
    cancel: 'Annulla',
    close: 'Chiudi',
    confirm: 'Conferma',
    delete: 'Elimina',
    save: 'Salva',
    edit: 'Modifica',
    add: 'Aggiungi',
    remove: 'Rimuovi',
    clear: 'Cancella',
    search: 'Cerca',
    loading: 'Caricamento…',
    select: 'Seleziona',
    next: 'Avanti',
    previous: 'Precedente',
    back: 'Indietro',
    today: 'Oggi',
    yesterday: 'Ieri',
    tomorrow: 'Domani',
    of: 'di',
  },
  pagination: {
    prev: 'Pagina precedente',
    next: 'Pagina successiva',
    itemsPerPage: 'Elementi per pagina',
    perPage: '{{size}} / pagina',
    goToPage: 'Vai alla pagina {{page}}',
    label: 'Paginazione',
    pageOf: 'Pagina {{current}} di {{total}}',
    range: '{{from}}–{{to}} di {{total}}',
    compact: '{{current}} / {{total}}',
  },
  table: {
    empty: 'Nessun dato',
    loading: 'Caricamento…',
    sort: 'Ordina colonna',
    filter: 'Filtra colonna',
    selectAll: 'Seleziona tutte le righe',
    selectRow: 'Seleziona riga',
    expandRow: 'Mostra o nascondi i dettagli della riga',
    toggleRow: 'Mostra o nascondi le righe figlie',
    selectGroup: 'Seleziona gruppo',
    toggleGroup: 'Mostra o nascondi il gruppo',
    noMatches: 'Nessun risultato',
    search: 'Cerca',
    reset: 'Reimposta',
  },
  eventCalendar: {
    today: 'Oggi',
    previous: 'Precedente',
    next: 'Successivo',
    month: 'Mese',
    week: 'Settimana',
    day: 'Giorno',
    time: 'Ora',
    allDay: 'Tutto il giorno',
    label: 'Calendario',
    more: '+{{count}} in più',
    header: '{{month}} {{year}}',
    range: '{{from}} – {{to}}',
    chipLabel: '{{title}}, {{time}}',
    slotLabel: '{{time}} — {{date}}',
    allDayCellLabel: '{{label}} — {{date}}',
  },
  tour: {
    next: 'Avanti',
    back: 'Indietro',
    done: 'Fine',
    skip: 'Salta il tour',
    progress: 'Passaggio {{current}} di {{total}}',
  },
  splitter: {
    divider: 'Ridimensiona i riquadri',
  },
  stepper: {
    optional: 'facoltativo',
  },
  transfer: {
    source: 'Disponibili',
    target: 'Selezionati',
    search: 'Cerca',
    empty: 'Nessun elemento',
    selectAll: 'Seleziona tutto',
    toTarget: 'Sposta tra i selezionati',
    toSource: 'Sposta tra i disponibili',
    count: '{{checked}} / {{total}}',
  },
  form: {
    optional: 'facoltativo',
  },
  validation: {
    required: 'Campo obbligatorio.',
    requiredTrue: 'Questa casella deve essere selezionata.',
    email: 'Inserisci un indirizzo email valido.',
    // Count last in both: "almeno {{n}} caratteri" is wrong at one, and there is
    // no plural machinery here. Same reason the `cvc` message splits in two.
    minlength: 'Numero minimo di caratteri: {{requiredLength}}.',
    maxlength: 'Numero massimo di caratteri: {{requiredLength}}.',
    min: 'Inserisci un valore maggiore o uguale a {{min}}.',
    max: 'Inserisci un valore minore o uguale a {{max}}.',
    pattern: 'Il valore non è nel formato previsto.',
    noWhitespace: 'Il valore non può contenere spazi.',
    hexColor: 'Inserisci un colore esadecimale, ad es. #1a2b3c.',
    url: 'Inserisci un URL valido.',
    cardNumber: 'Inserisci un numero di carta valido.',
    cvc: 'Inserisci il codice di sicurezza. Cifre richieste: {{length}}.',
    iban: 'Inserisci un IBAN valido.',
    match: 'I due valori non coincidono.',
    matchFields: 'I campi non coincidono.',
    oneOf: 'Scegli uno dei valori consentiti.',
    minDate: 'Scegli una data successiva.',
    maxDate: 'Scegli una data precedente.',
  },
  select: {
    label: 'Seleziona',
    placeholder: 'Seleziona…',
    empty: 'Nessuna opzione',
    clearSelection: 'Cancella la selezione',
    removeItem: 'Rimuovi {{label}}',
    noResults: 'Nessun risultato',
    loading: 'Caricamento…',
    more: '+{{count}} in più',
  },
  // `tree` covers both inline display and combobox-mode pickers
  // (replaces the dropped `treeSelect` namespace).
  tree: {
    expand: 'Espandi',
    collapse: 'Comprimi',
    placeholder: 'Seleziona…',
    clearSelection: 'Cancella la selezione',
    removeItem: 'Rimuovi {{label}}',
    more: '+{{count}} in più',
  },
  commandPalette: {
    label: 'Palette dei comandi',
    placeholder: 'Digita un comando o cerca…',
    noResults: 'Nessun risultato',
    loading: 'Ricerca in corso…',
    escHint: 'esc',
  },
  empty: {
    noData: 'Nessun dato',
  },
  fileUpload: {
    browse: 'Fai clic per scegliere',
    dropZone: 'oppure trascina i file qui',
    dropZoneLabel: 'Area di caricamento file — fai clic o trascina i file',
    removeFile: 'Rimuovi file',
    invalid: 'Tipo di file non supportato',
    tooBig: 'File troppo grande',
    size: '{{value}} {{unit}}',
    unitByte: 'B',
    unitKb: 'KB',
    unitMb: 'MB',
    unitGb: 'GB',
    unitTb: 'TB',
  },
  popconfirm: {
    label: 'Conferma azione',
    confirm: 'Conferma',
    cancel: 'Annulla',
  },
  toast: {
    region: 'Notifiche',
    close: 'Chiudi',
    copy: 'Copia',
    copied: 'Copiato',
    closeAll: 'Chiudi tutto',
  },
  input: {
    showPassword: 'Mostra la password',
    hidePassword: 'Nascondi la password',
  },
  inputNumber: {
    increment: 'Aumenta',
    decrement: 'Diminuisci',
  },
  inputOtp: {
    label: 'Codice di verifica',
    digit: 'Cifra {{index}}',
    character: 'Carattere {{index}}',
  },
  anchor: {
    label: 'Indice dei contenuti',
  },
  avatar: {
    alt: 'Avatar',
  },
  backTop: {
    label: 'Torna su',
  },
  breadcrumbs: {
    label: 'Percorso di navigazione',
  },
  burger: {
    label: 'Apri o chiudi il menu',
  },
  calendar: {
    prevMonth: 'Mese precedente',
    nextMonth: 'Mese successivo',
    prevYear: 'Anno precedente',
    nextYear: 'Anno successivo',
    // The month / year pickers are `role="listbox"`, and a listbox owes a
    // name — without one a screen reader announces the control as nothing at
    // all. Caught by `check:state-a11y` once a state finally opened the view.
    monthList: 'Mesi',
    yearList: 'Anni',
    prevYears: '12 anni precedenti',
    nextYears: '12 anni successivi',
    header: '{{month}} {{year}}',
    yearRange: '{{from}} – {{to}}',
    dayLabel: '{{weekday}}, {{date}}',
  },
  imageCropper: {
    empty: 'Nessuna immagine',
    window: 'Area di ritaglio',
    keyHelp:
      'I tasti freccia spostano il ritaglio. Tieni premuto Alt con una freccia per ridimensionarlo, Maiusc per passi più ampi. ' +
      "Il ritaglio viene annunciato come distanza da sinistra, distanza dall'alto, larghezza e altezza in pixel dell'immagine.",
  },
  sortableList: {
    keyHelp:
      'Premi la barra spaziatrice per prendere questo elemento, poi spostalo con i tasti freccia. ' +
      'Premi di nuovo la barra spaziatrice per rilasciarlo oppure Esc per rimetterlo al suo posto.',
    grabbed: 'Preso. {{index}} di {{total}}.',
    moved: '{{index}} di {{total}}.',
    dropped: 'Rilasciato. {{index}} di {{total}}.',
    cancelled: 'Spostamento annullato.',
  },
  colorPicker: {
    area: 'Saturazione e luminosità, {{saturation}}% e {{brightness}}%',
    hue: 'Tonalità',
    alpha: 'Opacità',
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
    label: 'Mappa di calore del calendario',
  },
  lineChart: {
    label: 'Grafico a linee',
    thousands: '{{value}}k',
  },
  donutChart: {
    label: 'Grafico ad anello',
  },
  compare: {
    label: 'Divisore di confronto',
  },
  // I due `roledescription` sono pronunciati AL POSTO del nome del ruolo, quindi
  // sono sostantivi minuscoli — «carosello», «diapositiva» — e non etichette con
  // l'iniziale maiuscola come quelle sopra.
  carousel: {
    label: 'Carosello',
    goToSlide: 'Vai alla diapositiva {{index}}',
    prev: 'Diapositiva precedente',
    next: 'Diapositiva successiva',
    pagination: 'Paginazione del carosello',
    roledescription: 'carosello',
    slideRoledescription: 'diapositiva',
  },
  actionSheet: {
    label: 'Azioni',
  },
  alert: {
    close: 'Chiudi avviso',
  },
  qr: {
    label: 'Codice QR',
  },
  image: {
    viewer: 'Anteprima immagine',
    open: 'Apri anteprima',
    close: 'Chiudi anteprima',
  },
  window: {
    close: 'Chiudi',
    minimize: 'Riduci a icona',
    maximize: 'Ingrandisci',
    restore: 'Ripristina',
    restoreDown: 'Ripristina le dimensioni',
    restoreWindow: 'Ripristina {{title}}',
    closeWindow: 'Chiudi finestra',
    untitled: 'Senza titolo',
    taskbar: 'Finestre ridotte a icona',
  },
  dialog: {
    close: 'Chiudi finestra di dialogo',
  },
  // Volutamente generico: un pannello popover non ha un nome universale e un
  // `role="dialog"` senza nome non viene annunciato affatto. Da ridefinire caso
  // per caso con `[ariaLabel]`.
  popover: {
    label: 'Riquadro a comparsa',
  },
  markdown: {
    copy: 'Copia il codice',
    copied: 'Copiato',
    taskDone: 'Fatto:',
    taskTodo: 'Da fare:',
  },
  // Sostantivo davanti — «Inserito: Ada» — e conteggio in coda: l'interpolatore
  // non concorda genere né numero, quindi «Risultati disponibili: 1» deve restare
  // corretto quanto «Risultati disponibili: 12».
  marquee: {
    label: 'Testo scorrevole',
    link: 'collegamento',
  },
  mention: {
    listbox: 'Menzioni',
    available: 'Risultati disponibili: {{count}}',
    inserted: 'Inserito: {{label}}',
  },
  drawer: {
    close: 'Chiudi il pannello',
  },
  datePicker: {
    open: 'Apri il calendario',
    openTime: "Apri il selettore dell'ora",
    openDateTime: 'Apri il selettore di data e ora',
    openRange: 'Apri il calendario del periodo',
    panel: 'Scegli la data',
    panelTime: "Scegli l'ora",
    panelDateTime: 'Scegli data e ora',
    panelRange: 'Scegli il periodo',
    panelRangeDateTime: 'Scegli il periodo con data e ora',
    rangeStart: 'Inizio del periodo',
    rangeEnd: 'Fine del periodo',
    startTime: 'Ora di inizio',
    endTime: 'Ora di fine',
    hours: 'Ore',
    minutes: 'Minuti',
    seconds: 'Secondi',
    incrementHours: 'Aumenta le ore',
    decrementHours: 'Diminuisci le ore',
    incrementMinutes: 'Aumenta i minuti',
    decrementMinutes: 'Diminuisci i minuti',
    incrementSeconds: 'Aumenta i secondi',
    decrementSeconds: 'Diminuisci i secondi',
    toggleAmPm: 'Cambia AM / PM',
    am: 'AM',
    pm: 'PM',
  },
  sidebar: {
    label: 'Barra laterale',
  },
  spinner: {
    label: 'Caricamento',
  },
  rating: {
    label: 'Valutazione',
  },
  gauge: {
    label: 'Indicatore',
  },
  progress: {
    label: 'Avanzamento',
  },
  meterGroup: {
    label: 'Misuratore',
  },
  knob: {
    label: 'Valore',
  },
  slider: {
    label: 'Valore',
    lower: 'Valore inferiore',
    upper: 'Valore superiore',
  },
  speedDial: {
    label: 'Azioni',
  },
  statistic: {
    delta: '{{value}}{{suffix}}',
    deltaSuffix: '%',
  },
  result: {
    notFound: 'Spiacenti, la pagina che cercavi non esiste.',
    forbidden: 'Spiacenti, non hai le autorizzazioni per accedere a questa pagina.',
    serverError: 'Spiacenti, si è verificato un errore.',
  },
  // Italian writes month names in lowercase, and `Intl` does the same for `it`
  // — so a consumer rendering its own calendar beside a library one that takes
  // its header from the date adapter gets one casing, not two.
  date: {
    months: {
      jan: 'gennaio',
      feb: 'febbraio',
      mar: 'marzo',
      apr: 'aprile',
      may: 'maggio',
      jun: 'giugno',
      jul: 'luglio',
      aug: 'agosto',
      sep: 'settembre',
      oct: 'ottobre',
      nov: 'novembre',
      dec: 'dicembre',
    },
  },
};
