import { type WrI18nCatalog } from 'ngwr/i18n';

// ngwr ships no validation copy, so the docs site supplies its own, the way any
// app does: `<wr-form-field>` reads `validation.<key>` from the app catalog for an
// error whose validator carries no `{ message }`, and the date picker words its
// refusals from `dateFormat` / `minDate` / `maxDate` / `dateFilter`. Placeholders
// are filled from the error payload.

export const VALIDATION_EN: WrI18nCatalog = {
  required: 'This field is required.',
  requiredTrue: 'This field must be checked.',
  email: 'Enter a valid email address.',
  // The number goes last, so the sentence reads the same at 1 as at 80 — there
  // is no plural machinery to get "1 characters" right.
  minlength: 'Minimum length is {{requiredLength}}.',
  maxlength: 'Maximum length is {{requiredLength}}.',
  min: 'Enter {{min}} or more.',
  max: 'Enter {{max}} or less.',
  pattern: 'This value is not in the expected format.',
  noWhitespace: 'This value cannot contain spaces.',
  hexColor: 'Enter a hex colour, e.g. #1a2b3c.',
  url: 'Enter a valid URL.',
  cardNumber: 'Enter a valid card number.',
  cvc: 'Enter the {{length}}-digit security code.',
  iban: 'Enter a valid IBAN.',
  match: 'The two values do not match.',
  matchFields: 'These fields do not match.',
  oneOf: 'Choose one of the allowed values.',
  minDate: 'Choose a later date.',
  maxDate: 'Choose an earlier date.',
  // A date in the field's own format, so no full stop after it.
  dateFormat: 'Expected format: {{example}}',
  dateFilter: 'This date is not available.',
};

export const VALIDATION_RU: WrI18nCatalog = {
  required: 'Обязательное поле.',
  requiredTrue: 'Нужно поставить отметку.',
  email: 'Введите корректный адрес почты.',
  minlength: 'Не короче {{requiredLength}} символов.',
  maxlength: 'Не длиннее {{requiredLength}} символов.',
  min: 'Не меньше {{min}}.',
  max: 'Не больше {{max}}.',
  pattern: 'Значение не соответствует формату.',
  noWhitespace: 'Значение не может содержать пробелы.',
  hexColor: 'Введите цвет в формате #1a2b3c.',
  url: 'Введите корректный адрес.',
  cardNumber: 'Введите корректный номер карты.',
  cvc: 'Введите {{length}}-значный код проверки.',
  iban: 'Введите корректный IBAN.',
  match: 'Значения не совпадают.',
  matchFields: 'Значения полей не совпадают.',
  oneOf: 'Выберите одно из допустимых значений.',
  minDate: 'Выберите более позднюю дату.',
  maxDate: 'Выберите более раннюю дату.',
  dateFormat: 'Ожидаемый формат: {{example}}',
  dateFilter: 'Эта дата недоступна.',
};
