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
});
