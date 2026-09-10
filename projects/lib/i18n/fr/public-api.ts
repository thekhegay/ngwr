import { type WrI18nCatalog } from 'ngwr/i18n';

/** Base French catalog for ngwr built-in component strings. */
export const wrFr: WrI18nCatalog = {
  common: {
    ok: 'OK',
    cancel: 'Annuler',
    close: 'Fermer',
    confirm: 'Confirmer',
    delete: 'Supprimer',
    save: 'Enregistrer',
    edit: 'Modifier',
    add: 'Ajouter',
    remove: 'Retirer',
    clear: 'Effacer',
    search: 'Rechercher',
    loading: 'Chargement…',
    select: 'Sélectionner',
    next: 'Suivant',
    previous: 'Précédent',
    back: 'Retour',
    today: "Aujourd'hui",
    yesterday: 'Hier',
    tomorrow: 'Demain',
    of: 'sur',
  },
  pagination: {
    prev: 'Page précédente',
    next: 'Page suivante',
    itemsPerPage: 'Éléments par page',
    perPage: '{{size}} / page',
    goToPage: 'Aller à la page {{page}}',
    label: 'Pagination',
    pageOf: 'Page {{current}} sur {{total}}',
    range: '{{from}}–{{to}} sur {{total}}',
    compact: '{{current}} / {{total}}',
  },
  table: {
    empty: 'Aucune donnée',
    loading: 'Chargement…',
    sort: 'Trier la colonne',
    filter: 'Filtrer la colonne',
    selectAll: 'Sélectionner toutes les lignes',
    selectRow: 'Sélectionner la ligne',
    expandRow: 'Afficher ou masquer les détails de la ligne',
    toggleRow: 'Afficher ou masquer les lignes enfants',
    selectGroup: 'Sélectionner le groupe',
    toggleGroup: 'Afficher ou masquer le groupe',
    noMatches: 'Aucun résultat',
    search: 'Rechercher',
    reset: 'Réinitialiser',
  },
  eventCalendar: {
    today: "Aujourd'hui",
    previous: 'Précédent',
    next: 'Suivant',
    month: 'Mois',
    week: 'Semaine',
    day: 'Jour',
    time: 'Heure',
    allDay: 'Toute la journée',
    label: 'Calendrier',
    more: '+{{count}} de plus',
    header: '{{month}} {{year}}',
    range: '{{from}} – {{to}}',
    chipLabel: '{{title}}, {{time}}',
    slotLabel: '{{time}} — {{date}}',
    allDayCellLabel: '{{label}} — {{date}}',
  },
  tour: {
    next: 'Suivant',
    back: 'Retour',
    done: 'Terminé',
    skip: 'Passer la visite',
    progress: 'Étape {{current}} sur {{total}}',
  },
  splitter: {
    divider: 'Redimensionner les panneaux',
  },
  stepper: {
    optional: 'facultatif',
  },
  transfer: {
    source: 'Disponibles',
    target: 'Sélectionnés',
    search: 'Rechercher',
    empty: 'Aucun élément',
    selectAll: 'Tout sélectionner',
    toTarget: 'Déplacer vers les sélectionnés',
    toSource: 'Déplacer vers les disponibles',
    count: '{{checked}} / {{total}}',
    selectAllAria: '{{pane}} — {{action}}',
  },
  form: {
    optional: 'facultatif',
  },
  validation: {
    required: 'Ce champ est obligatoire.',
    requiredTrue: 'Cette case doit être cochée.',
    email: 'Saisissez une adresse e-mail valide.',
    // Le nombre en dernier dans les deux : « au moins {{requiredLength}}
    // caractères » est faux à un, le français mettant le nom au singulier à
    // zéro comme à un, et il n'existe ici aucune machinerie de pluriel.
    minlength: 'Nombre minimal de caractères : {{requiredLength}}.',
    maxlength: 'Nombre maximal de caractères : {{requiredLength}}.',
    min: 'Saisissez {{min}} ou plus.',
    max: 'Saisissez {{max}} ou moins.',
    pattern: "Cette valeur n'est pas au format attendu.",
    noWhitespace: "Cette valeur ne peut pas contenir d'espaces.",
    hexColor: 'Saisissez une couleur hexadécimale, par ex. #1a2b3c.',
    url: 'Saisissez une URL valide.',
    cardNumber: 'Saisissez un numéro de carte valide.',
    cvc: 'Saisissez le code de sécurité à {{length}} chiffres.',
    iban: 'Saisissez un IBAN valide.',
    match: 'Les deux valeurs ne correspondent pas.',
    matchFields: 'Ces champs ne correspondent pas.',
    oneOf: "Choisissez l'une des valeurs autorisées.",
    minDate: 'Choisissez une date ultérieure.',
    maxDate: 'Choisissez une date antérieure.',
  },
  select: {
    label: 'Sélectionner',
    placeholder: 'Sélectionner…',
    empty: 'Aucune option',
    clearSelection: 'Effacer la sélection',
    removeItem: 'Retirer {{label}}',
    noResults: 'Aucun résultat',
    loading: 'Chargement…',
    more: '+{{count}} de plus',
  },
  // `tree` covers both inline display and combobox-mode pickers
  // (replaces the dropped `treeSelect` namespace).
  tree: {
    expand: 'Développer',
    collapse: 'Réduire',
    placeholder: 'Sélectionner…',
    clearSelection: 'Effacer la sélection',
    removeItem: 'Retirer {{label}}',
    more: '+{{count}} de plus',
  },
  commandPalette: {
    label: 'Palette de commandes',
    placeholder: 'Saisir une commande ou rechercher…',
    noResults: 'Aucun résultat',
    loading: 'Recherche en cours…',
    escHint: 'esc',
  },
  empty: {
    noData: 'Aucune donnée',
  },
  fileUpload: {
    browse: 'Cliquez pour parcourir',
    dropZone: 'ou déposez vos fichiers ici',
    dropZoneLabel: 'Zone de dépôt de fichiers — cliquez ou déposez des fichiers',
    removeFile: 'Retirer le fichier',
    invalid: 'Type de fichier non pris en charge',
    tooBig: 'Fichier trop volumineux',
    size: '{{value}} {{unit}}',
    unitByte: 'o',
    unitKb: 'Ko',
    unitMb: 'Mo',
    unitGb: 'Go',
    unitTb: 'To',
  },
  popconfirm: {
    label: "Confirmer l'action",
    confirm: 'Confirmer',
    cancel: 'Annuler',
  },
  toast: {
    region: 'Notifications',
    close: 'Fermer',
    copy: 'Copier',
    copied: 'Copié',
    closeAll: 'Tout fermer',
  },
  input: {
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
  },
  inputNumber: {
    increment: 'Augmenter',
    decrement: 'Diminuer',
  },
  inputOtp: {
    label: 'Code de vérification',
    digit: 'Chiffre {{index}}',
    character: 'Caractère {{index}}',
  },
  anchor: {
    label: 'Sommaire',
  },
  avatar: {
    alt: 'Avatar',
  },
  backTop: {
    label: 'Retour en haut',
  },
  breadcrumbs: {
    label: "Fil d'Ariane",
  },
  burger: {
    label: 'Ouvrir ou fermer le menu',
  },
  calendar: {
    prevMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    prevYear: 'Année précédente',
    nextYear: 'Année suivante',
    // The month / year pickers are `role="listbox"`, and a listbox owes a
    // name — without one a screen reader announces the control as nothing at
    // all. Caught by `check:state-a11y` once a state finally opened the view.
    monthList: 'Mois',
    yearList: 'Années',
    prevYears: '12 années précédentes',
    nextYears: '12 années suivantes',
    header: '{{month}} {{year}}',
    yearRange: '{{from}} – {{to}}',
    dayLabel: '{{weekday}}, {{date}}',
  },
  imageCropper: {
    empty: 'Aucune image',
    window: 'Zone de recadrage',
    keyHelp:
      'Les touches fléchées déplacent la zone de recadrage. Maintenez Alt avec une touche fléchée pour la redimensionner, ' +
      'et Maj pour des pas plus grands. ' +
      "La zone est annoncée sous la forme gauche, haut, largeur et hauteur, en pixels de l'image.",
  },
  sortableList: {
    keyHelp:
      'Appuyez sur Espace pour saisir cet élément, puis déplacez-le avec les touches fléchées. ' +
      'Appuyez de nouveau sur Espace pour le déposer, ou sur Échap pour le remettre à sa place.',
    grabbed: 'Élément saisi. {{index}} sur {{total}}.',
    moved: '{{index}} sur {{total}}.',
    dropped: 'Élément déposé. {{index}} sur {{total}}.',
    cancelled: 'Déplacement annulé.',
  },
  colorPicker: {
    area: 'Saturation et luminosité, {{saturation}}% et {{brightness}}%',
    hue: 'Teinte',
    alpha: 'Opacité',
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
    label: 'Carte de chaleur du calendrier',
    cell: '{{date}}: {{count}}',
  },
  lineChart: {
    label: 'Graphique en courbes',
    thousands: '{{value}} k',
  },
  donutChart: {
    label: 'Graphique en anneau',
  },
  compare: {
    label: 'Séparateur de comparaison',
  },
  // Les deux `roledescription` sont prononcés À LA PLACE du nom du rôle, d'où des
  // noms communs en minuscules — « carrousel », « diapositive » — et non des
  // libellés avec majuscule comme ceux qui précèdent.
  carousel: {
    label: 'Carrousel',
    goToSlide: 'Aller à la diapositive {{index}}',
    prev: 'Diapositive précédente',
    next: 'Diapositive suivante',
    pagination: 'Pagination du carrousel',
    roledescription: 'carrousel',
    slideRoledescription: 'diapositive',
  },
  actionSheet: {
    label: 'Actions',
  },
  alert: {
    close: "Fermer l'alerte",
  },
  qr: {
    label: 'Code QR',
  },
  image: {
    viewer: "Aperçu de l'image",
    open: "Ouvrir l'aperçu",
    close: "Fermer l'aperçu",
  },
  window: {
    close: 'Fermer',
    minimize: 'Réduire',
    maximize: 'Agrandir',
    restore: 'Restaurer',
    restoreDown: 'Restaurer la taille',
    restoreWindow: 'Restaurer {{title}}',
    closeWindow: 'Fermer la fenêtre',
    untitled: 'Sans titre',
    taskbar: 'Fenêtres réduites',
  },
  dialog: {
    close: 'Fermer la boîte de dialogue',
  },
  // Volontairement générique : un panneau de popover n'a pas de nom universel, et
  // un `role="dialog"` sans nom n'est pas annoncé du tout. À redéfinir au cas par
  // cas avec `[ariaLabel]`.
  popover: {
    label: 'Fenêtre contextuelle',
  },
  markdown: {
    copy: 'Copier le code',
    copied: 'Copié',
    // En français un deux-points est précédé d'une espace insécable, et c'est
    // bien U+00A0 qui se trouve dans ces deux valeurs — invisible à la relecture,
    // à ne pas remplacer par une espace ordinaire. Idem dans `mention`.
    taskDone: 'Fait :',
    taskTodo: 'À faire :',
  },
  // Le nom d'abord — « Inséré : Ada », et non « Ada insérée » : le genre du nom
  // est inconnu à l'avance et l'interpolateur ne sait pas l'accorder. Même raison
  // pour le compteur, qui reste juste au singulier comme au pluriel.
  marquee: {
    label: 'Bandeau défilant',
    link: 'lien',
  },
  mention: {
    listbox: 'Mentions',
    available: 'Correspondances disponibles : {{count}}',
    inserted: 'Inséré : {{label}}',
  },
  drawer: {
    close: 'Fermer le panneau',
  },
  datePicker: {
    open: 'Ouvrir le calendrier',
    openTime: "Ouvrir le sélecteur d'heure",
    openDateTime: "Ouvrir le sélecteur de date et d'heure",
    openRange: 'Ouvrir le calendrier de période',
    panel: 'Choisir une date',
    panelTime: 'Choisir une heure',
    panelDateTime: 'Choisir une date et une heure',
    panelRange: 'Choisir une période',
    panelRangeDateTime: 'Choisir une période et des heures',
    rangeStart: 'Début de la période',
    rangeEnd: 'Fin de la période',
    startTime: 'Heure de début',
    endTime: 'Heure de fin',
    hours: 'Heures',
    minutes: 'Minutes',
    seconds: 'Secondes',
    incrementHours: 'Augmenter les heures',
    decrementHours: 'Diminuer les heures',
    incrementMinutes: 'Augmenter les minutes',
    decrementMinutes: 'Diminuer les minutes',
    incrementSeconds: 'Augmenter les secondes',
    decrementSeconds: 'Diminuer les secondes',
    toggleAmPm: 'Basculer AM / PM',
    am: 'AM',
    pm: 'PM',
  },
  sidebar: {
    label: 'Barre latérale',
  },
  spinner: {
    label: 'Chargement',
  },
  rating: {
    label: 'Note',
  },
  gauge: {
    label: 'Jauge',
  },
  progress: {
    label: 'Progression',
  },
  meterGroup: {
    label: 'Indicateur',
  },
  knob: {
    label: 'Valeur',
  },
  slider: {
    label: 'Valeur',
    lower: 'Valeur inférieure',
    upper: 'Valeur supérieure',
  },
  speedDial: {
    label: 'Actions',
  },
  statistic: {
    delta: '{{value}}{{suffix}}',
    deltaSuffix: '%',
  },
  result: {
    notFound: "Désolé, la page que vous avez visitée n'existe pas.",
    forbidden: "Désolé, vous n'avez pas l'autorisation d'accéder à cette page.",
    serverError: "Désolé, une erreur s'est produite.",
  },
  date: {
    // En français les noms de mois s'écrivent en minuscules, y compris en tête
    // d'un libellé — « janvier 2026 », pas « Janvier 2026 ». Ce n'est pas une
    // coquille, et `Intl` écrit la même chose pour fr.
    months: {
      jan: 'janvier',
      feb: 'février',
      mar: 'mars',
      apr: 'avril',
      may: 'mai',
      jun: 'juin',
      jul: 'juillet',
      aug: 'août',
      sep: 'septembre',
      oct: 'octobre',
      nov: 'novembre',
      dec: 'décembre',
    },
  },
};
