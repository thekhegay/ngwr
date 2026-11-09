import { describe, expect, it } from 'vitest';

import { labelIndex, labelTone, pageLabels } from './labels';

describe('labelTone', () => {
  it('gives each animation technology its own tone', () => {
    expect(['CSS', 'DOM', 'SVG', 'Canvas', 'WebGL'].map(labelTone)).toEqual(['css', 'dom', 'svg', 'canvas', 'webgl']);
  });

  it('keeps a kind on its own tone and any other trait neutral', () => {
    expect(labelTone('Animation')).toBe('animation');
    expect(labelTone('Signal Forms')).toBe('neutral');
  });
});

describe('animation pages', () => {
  it('shows the kind, the declarable and one technology', () => {
    expect(pageLabels('/animations/thread-lines')).toEqual(['Animation', 'Component', 'WebGL']);
  });

  it('lists the WebGL pages under one label', () => {
    const titles = labelIndex()
      .get('webgl')
      ?.pages.map(p => p.title);
    expect(titles).toEqual(['Fluid Cursor', 'Flow Lines', 'Thread Lines'].sort());
  });
});
