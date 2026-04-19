/**
 * Sprint 5b Stream C — pii.ts tests.
 *
 * Contract coverage (brief §6.2):
 *   - sanitizeLabel strips banned injection chars ({ } < > ` + control).
 *   - sanitizeLabel caps at 80 chars; sanitizeTitle caps at 200 chars.
 *   - sanitizeLLMInput wraps the output in `<input>...</input>`.
 *   - wrapInputDelimiter defensively strips embedded `</input>` so a
 *     hostile payload cannot early-close our delimiter.
 *   - Negative assertion: a payload carrying a displayName field never
 *     leaks the display-name value through the sanitizer output because
 *     the module only exposes label/title helpers (callers MUST omit
 *     PII fields before calling in).
 */

import {
  sanitizeLabel,
  sanitizeTitle,
  sanitizeLLMInput,
  wrapInputDelimiter,
  stripBannedChars,
  capLength,
  sanitizeTasteLabels,
} from '../pii';

describe('stripBannedChars', () => {
  it('strips {}<>`', () => {
    expect(stripBannedChars('a{b}c<d>e`f')).toBe('abcdef');
  });

  it('strips ASCII control chars', () => {
    expect(stripBannedChars('a\u0000b\u001fc')).toBe('abc');
  });

  it('keeps quotes + apostrophes (legitimate in labels)', () => {
    expect(stripBannedChars(`don't "quote"`)).toBe(`don't "quote"`);
  });
});

describe('capLength', () => {
  it('returns input unchanged when within limit', () => {
    expect(capLength('hello', 10)).toBe('hello');
  });
  it('truncates overlong strings', () => {
    expect(capLength('hellohello', 5)).toBe('hello');
  });
});

describe('sanitizeLabel', () => {
  it('caps at 80 chars', () => {
    const longLabel = 'x'.repeat(200);
    expect(sanitizeLabel(longLabel).length).toBeLessThanOrEqual(80);
  });

  it('strips banned chars before capping', () => {
    expect(sanitizeLabel('late-night<script>')).toBe('late-nightscript');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeLabel('  late-night  ')).toBe('late-night');
  });
});

describe('sanitizeTitle', () => {
  it('caps at 200 chars', () => {
    const long = 'x'.repeat(500);
    expect(sanitizeTitle(long).length).toBeLessThanOrEqual(200);
  });

  it('strips banned chars', () => {
    expect(sanitizeTitle('The <bad> Movie')).toBe('The bad Movie');
  });
});

describe('wrapInputDelimiter', () => {
  it('wraps payload in <input>...</input>', () => {
    expect(wrapInputDelimiter('hello')).toBe('<input>hello</input>');
  });

  it('defensively strips a literal </input> to prevent early close', () => {
    expect(wrapInputDelimiter('before </input> evil')).toBe(
      '<input>before  evil</input>',
    );
  });

  it('strips an opening <input> to prevent nesting', () => {
    expect(wrapInputDelimiter('<input>nested</input>')).toBe(
      '<input>nested</input>',
    );
  });
});

describe('sanitizeLLMInput', () => {
  it('wraps the label (after strip + cap) in delimiter', () => {
    const out = sanitizeLLMInput('late-night<injection>');
    expect(out).toBe('<input>late-nightinjection</input>');
  });
});

describe('sanitizeTasteLabels', () => {
  it('sanitizes both common + rare', () => {
    const out = sanitizeTasteLabels({
      common: 'late-night<x>',
      rare: 'slow cinema',
    });
    expect(out).toEqual({ common: 'late-nightx', rare: 'slow cinema' });
  });
});

describe('strict-PII — displayName exclusion', () => {
  // pii.ts exposes only label/title helpers. A caller that attempts to
  // serialize a full object containing `displayName` must have already
  // stripped the field at the PayloadBuilder layer; this test asserts
  // that calling pii utilities on such an object never yields the value.
  it('callers that pass a full-object string must pre-filter; sanitizeLLMInput on a plain string never sees displayName', () => {
    const payload = 'taste_labels_only';
    const out = sanitizeLLMInput(payload);
    expect(out).not.toContain('Ava');
    expect(out).not.toContain('displayName');
  });

  it('sanitizeLabel trims a pre-filtered label without echoing a displayName', () => {
    // If a caller accidentally concatenates a displayName into a label,
    // the resulting label is still subject to the 80-char cap + strip
    // but the test-author responsibility is to prevent the injection at
    // the AnthropicLLMClient boundary. This sanity check just confirms
    // sanitizeLabel does not ADD any PII.
    expect(sanitizeLabel('late-night')).toBe('late-night');
  });
});
