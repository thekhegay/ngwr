import { describe, expect, it } from 'vitest';

import { wrInitials } from './initials';

describe('wrInitials', () => {
  it('takes the first grapheme of the first two words, upper-cased', () => {
    expect(wrInitials('Roman Khegay')).toBe('RK');
    expect(wrInitials('ada lovelace')).toBe('AL');
    expect(wrInitials('Ada King Lovelace')).toBe('AK');
  });

  it('ignores extra whitespace of any kind', () => {
    expect(wrInitials('  ada \t\n lovelace  ')).toBe('AL');
    expect(wrInitials('ada lovelace')).toBe('AL');
  });

  it('gives one initial for a one-word name', () => {
    expect(wrInitials('Madonna')).toBe('M');
    expect(wrInitials('roman')).toBe('R');
  });

  it('reads a hyphenated name as one word', () => {
    expect(wrInitials('Jean-Luc Picard')).toBe('JP');
    expect(wrInitials('Mary-Kate')).toBe('M');
  });

  it('skips punctuation before a letter, and a word of punctuation alone', () => {
    expect(wrInitials('(Ada) Lovelace')).toBe('AL');
    expect(wrInitials('@roman - khegay')).toBe('RK');
    expect(wrInitials('Ada - Lovelace')).toBe('AL');
  });

  it('counts a digit, and gives nothing for punctuation alone', () => {
    expect(wrInitials('Agent 007')).toBe('A0');
    expect(wrInitials('42')).toBe('4');
    expect(wrInitials('...')).toBe('');
    expect(wrInitials('- - -')).toBe('');
  });

  it('gives nothing for nothing, without throwing', () => {
    expect(wrInitials(null)).toBe('');
    expect(wrInitials(undefined)).toBe('');
    expect(wrInitials('')).toBe('');
    expect(wrInitials('   ')).toBe('');
  });

  it('keeps a grapheme whole, never half of one', () => {
    // A skin tone, a ZWJ family, a combining mark and a surrogate pair: one
    // initial each, and never a lone surrogate that renders as a box.
    expect(wrInitials('👩🏽‍🚀 Valentina')).toBe('👩🏽‍🚀V');
    expect(wrInitials('👨‍👩‍👧‍👦 Family')).toBe('👨‍👩‍👧‍👦F');
    expect(wrInitials('émile zola')).toBe('ÉZ');
    expect(wrInitials('𝔄da 𝔏ovelace')).toBe('𝔄𝔏');
  });

  it('upper-cases with the default mapping, and keeps a letter whose upper case is two', () => {
    expect(wrInitials('élodie durand')).toBe('ÉD');
    expect(wrInitials('ñandú')).toBe('Ñ');
    expect(wrInitials('ßen müller')).toBe('ßM');
    expect(wrInitials('ﬁona')).toBe('ﬁ');
  });

  it('takes a locale for a language whose mapping differs', () => {
    expect(wrInitials('ismail', 'tr')).toBe('İ');
    expect(wrInitials('ismail')).toBe('I');
    expect(wrInitials('ismail', 'en')).toBe('I');
  });

  it('gives one character for a Han, Hangul or kana name', () => {
    expect(wrInitials('王小明')).toBe('王');
    expect(wrInitials('王 小明')).toBe('王');
    expect(wrInitials('김철수')).toBe('김');
    expect(wrInitials('김 철수')).toBe('김');
    expect(wrInitials('山田 太郎')).toBe('山');
    expect(wrInitials('やまだ たろう')).toBe('や');
    expect(wrInitials('タナカ ハナコ')).toBe('タ');
  });

  it('reads Cyrillic, Greek, Arabic and Hebrew letters as any other', () => {
    expect(wrInitials('хегай роман')).toBe('ХР');
    expect(wrInitials('αλέξανδρος παπαδόπουλος')).toBe('ΑΠ');
    expect(wrInitials('محمد علي')).toBe('مع');
    expect(wrInitials('דוד בן-גוריון')).toBe('דב');
  });

  describe('letters style, spelled out', () => {
    it('matches the call without options', () => {
      for (const name of ['Roman Khegay', 'Ada King Lovelace', 'Madonna', '王 小明', '  ada   lovelace ', '...', '']) {
        expect(wrInitials(name, undefined, { style: 'letters' })).toBe(wrInitials(name));
        expect(wrInitials(name, undefined, {})).toBe(wrInitials(name));
      }
      expect(wrInitials('ismail', 'tr', { style: 'letters' })).toBe('İ');
      expect(wrInitials(null, undefined, { style: 'letters' })).toBe('');
    });

    it('ignores the order', () => {
      expect(wrInitials('Хегай Роман', undefined, { order: 'family-first' })).toBe('ХР');
      expect(wrInitials('Roman Khegay', undefined, { style: 'letters', order: 'family-first' })).toBe('RK');
    });
  });

  describe('surname style', () => {
    const given = { style: 'surname' } as const;
    const family = { style: 'surname', order: 'family-first' } as const;

    it('reads the last part as the family name by default', () => {
      expect(wrInitials('Roman Khegay', undefined, given)).toBe('Khegay R.');
      expect(wrInitials('Ada King Lovelace', undefined, given)).toBe('Lovelace A. K.');
      expect(wrInitials('Roman Khegay', undefined, { style: 'surname', order: 'given-first' })).toBe('Khegay R.');
    });

    it('reads the first part as the family name when told so', () => {
      expect(wrInitials('Хегай Роман', undefined, family)).toBe('Хегай Р.');
      expect(wrInitials('Иванов Иван Иванович', undefined, family)).toBe('Иванов И. И.');
    });

    it('returns a one-part name as written', () => {
      expect(wrInitials('Madonna', undefined, given)).toBe('Madonna');
      expect(wrInitials('madonna', undefined, family)).toBe('madonna');
    });

    it('gives every other part an initial, not the first two', () => {
      expect(wrInitials('Pablo Diego José Ruiz Picasso', undefined, given)).toBe('Picasso P. D. J. R.');
    });

    it('collapses whitespace of any kind', () => {
      expect(wrInitials('  Roman \t\n  Khegay  ', undefined, given)).toBe('Khegay R.');
      expect(wrInitials(' Иванов   Иван  Иванович ', undefined, family)).toBe('Иванов И. И.');
    });

    it('keeps a hyphenated family name whole, and gives a hyphenated given name one initial', () => {
      expect(wrInitials('Петров-Водкин Кузьма Сергеевич', undefined, family)).toBe('Петров-Водкин К. С.');
      expect(wrInitials('Jean-Luc Picard', undefined, given)).toBe('Picard J.');
    });

    it('keeps the family name as written and upper-cases the initials', () => {
      expect(wrInitials('roman khegay', undefined, given)).toBe('khegay R.');
      expect(wrInitials("d'Artagnan charles", undefined, family)).toBe("d'Artagnan C.");
    });

    it('gives nothing for nothing, without throwing', () => {
      expect(wrInitials(null, undefined, given)).toBe('');
      expect(wrInitials(undefined, undefined, family)).toBe('');
      expect(wrInitials('', undefined, given)).toBe('');
      expect(wrInitials('   ', undefined, family)).toBe('');
    });

    it('drops a part of punctuation alone before it picks the family name', () => {
      expect(wrInitials('Ada - Lovelace', undefined, given)).toBe('Lovelace A.');
      expect(wrInitials('Roman Khegay -', undefined, given)).toBe('Khegay R.');
      expect(wrInitials('- Хегай Роман', undefined, family)).toBe('Хегай Р.');
      expect(wrInitials('...', undefined, given)).toBe('');
    });

    it('takes an initial as the letters style does: one grapheme, past punctuation', () => {
      expect(wrInitials('émile zola', undefined, given)).toBe('zola É.');
      expect(wrInitials('e\u0301mile zola', undefined, given)).toBe('zola E\u0301.');
      expect(wrInitials('👩🏽‍🚀 Tereshkova', undefined, given)).toBe('Tereshkova 👩🏽‍🚀.');
      expect(wrInitials('𝔄da Lovelace', undefined, given)).toBe('Lovelace 𝔄.');
      expect(wrInitials('(Ada) Lovelace', undefined, given)).toBe('Lovelace A.');
      expect(wrInitials('ßen Müller', undefined, given)).toBe('Müller ß.');
    });

    it('upper-cases an initial with the locale given', () => {
      expect(wrInitials('ismail Kaya', 'tr', given)).toBe('Kaya İ.');
      expect(wrInitials('Kaya ismail', 'tr', family)).toBe('Kaya İ.');
      expect(wrInitials('ismail Kaya', undefined, given)).toBe('Kaya I.');
    });

    it('has no one-character rule for Han, Hangul or kana', () => {
      expect(wrInitials('王 小明', undefined, family)).toBe('王 小.');
      expect(wrInitials('김 철수', undefined, family)).toBe('김 철.');
      expect(wrInitials('王小明', undefined, family)).toBe('王小明');
    });
  });
});
