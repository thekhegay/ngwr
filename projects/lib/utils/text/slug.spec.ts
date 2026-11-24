import { describe, expect, it } from 'vitest';

import { wrSlug } from './slug';

describe('wrSlug', () => {
  it('lower-cases Latin words and joins them with one hyphen', () => {
    expect(wrSlug('What it costs to adopt')).toBe('what-it-costs-to-adopt');
    expect(wrSlug('Signal Forms')).toBe('signal-forms');
    expect(wrSlug('API')).toBe('api');
  });

  it('turns a run of punctuation or whitespace into one hyphen', () => {
    expect(wrSlug('Data & charts')).toBe('data-charts');
    expect(wrSlug('Data / charts')).toBe('data-charts');
    expect(wrSlug('a -- b__c \t\n d')).toBe('a-b-c-d');
    expect(wrSlug("don't stop")).toBe('don-t-stop');
    expect(wrSlug('wr-select')).toBe('wr-select');
  });

  it('drops what leads and trails', () => {
    expect(wrSlug('  hello world  ')).toBe('hello-world');
    expect(wrSlug('...hello!?')).toBe('hello');
    expect(wrSlug('--- (hello) ---')).toBe('hello');
  });

  it('keeps Cyrillic letters, Russian and Kazakh', () => {
    expect(wrSlug('Привет, мир!')).toBe('привет-мир');
    expect(wrSlug('Привет мир')).toBe('привет-мир');
    expect(wrSlug('Зелёный Чай')).toBe('зелёный-чай');
    expect(wrSlug('Қазақстан Республикасы')).toBe('қазақстан-республикасы');
    expect(wrSlug('Әлем, сәлем!')).toBe('әлем-сәлем');
  });

  it('keeps a diacritic, composed or as a combining mark', () => {
    expect(wrSlug('Café au lait')).toBe('café-au-lait');
    expect(wrSlug('Café au lait')).toBe('café-au-lait');
    expect(wrSlug('Ñandú Über')).toBe('ñandú-über');
    // No composed form exists for this pair, so the mark stays a mark.
    expect(wrSlug('x́ y')).toBe('x́-y');
    expect(wrSlug('Русский край')).toBe('русский-край');
  });

  it('keeps Devanagari letters with their vowel marks', () => {
    expect(wrSlug('नमस्ते दुनिया')).toBe('नमस्ते-दुनिया');
    expect(wrSlug('हिन्दी, भाषा!')).toBe('हिन्दी-भाषा');
  });

  it('folds a full-width or ligature form through NFKC', () => {
    expect(wrSlug('ＡＢＣ　１２３')).toBe('abc-123');
    expect(wrSlug('ﬁne ofﬁce')).toBe('fine-office');
    expect(wrSlug('Ｈｅｌｌｏ！')).toBe('hello');
  });

  it('counts a digit', () => {
    expect(wrSlug('Angular 22')).toBe('angular-22');
    expect(wrSlug('v16.9.0')).toBe('v16-9-0');
    expect(wrSlug('2026')).toBe('2026');
    expect(wrSlug('٣ أشياء')).toBe('٣-أشياء');
  });

  it('gives nothing for nothing, without throwing', () => {
    expect(wrSlug(null)).toBe('');
    expect(wrSlug(undefined)).toBe('');
    expect(wrSlug('')).toBe('');
    expect(wrSlug('   ')).toBe('');
    expect(wrSlug('...')).toBe('');
    expect(wrSlug('- & -')).toBe('');
  });
});
