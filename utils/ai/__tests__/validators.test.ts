/**
 * Sprint 5b Stream C — validators.ts tests.
 *
 * Contract coverage:
 *   §2.5 why-you-match guard rails: banned regex + 10-22 word target,
 *     30-word hard ceiling.
 *   §3.3 rec-copy guard rails: length 30-280 + no `!`, no `?`, no emoji,
 *     no `#`; batch must be exactly 3 + no duplicate first word.
 */

import {
  sentenceIsValid,
  variantIsValid,
  assertRecCopyBatch,
  recCopyBatchIsValid,
  wordCount,
  REC_COPY_MIN_LEN,
  REC_COPY_MAX_LEN,
} from '../validators';

const words = (n: number): string =>
  Array.from({ length: n }, () => 'a').join(' ');

describe('sentenceIsValid — why-you-match banned regex', () => {
  const base =
    'You and Ava converge on late-night mood picks for weekend wind-down viewing.';

  it('accepts a clean 10-22 word sentence', () => {
    expect(sentenceIsValid(base)).toBe(true);
    expect(wordCount(base)).toBeGreaterThanOrEqual(10);
    expect(wordCount(base)).toBeLessThanOrEqual(22);
  });

  it('rejects compatibility language', () => {
    expect(
      sentenceIsValid(
        'You and Ava are compatible on late-night mood picks for weekends.',
      ),
    ).toBe(false);
  });

  it('rejects ranking language — "top"', () => {
    expect(
      sentenceIsValid(
        'Top pick: your shared late-night mood lines up perfectly tonight.',
      ),
    ).toBe(false);
  });

  it('rejects comparison language — "more than"', () => {
    expect(
      sentenceIsValid(
        'You and Ava align more than most on late-night viewing habits always.',
      ),
    ).toBe(false);
  });

  it('rejects percent tokens', () => {
    expect(
      sentenceIsValid(
        'You and Ava share 80% of late-night mood picks weekly together.',
      ),
    ).toBe(false);
  });

  it('rejects "rank" language', () => {
    expect(
      sentenceIsValid(
        'You and Ava rank each other high on late-night mood picks overall.',
      ),
    ).toBe(false);
  });

  it('rejects "score" language', () => {
    expect(
      sentenceIsValid(
        'You and Ava score high on late-night mood picks always tonight.',
      ),
    ).toBe(false);
  });

  it('rejects "most" language', () => {
    expect(
      sentenceIsValid(
        'You and Ava overlap on most late-night mood picks for weekend viewing.',
      ),
    ).toBe(false);
  });

  it('rejects platitudes — "love movies"', () => {
    expect(
      sentenceIsValid(
        'You and Ava both love movies that lean late-night mood picks tonight.',
      ),
    ).toBe(false);
  });

  it('rejects exclamation marks', () => {
    expect(
      sentenceIsValid(
        'You and Ava converge on late-night mood picks for weekends!',
      ),
    ).toBe(false);
  });

  it('rejects question marks', () => {
    expect(
      sentenceIsValid(
        'You and Ava converge on late-night mood picks for weekends?',
      ),
    ).toBe(false);
  });
});

describe('sentenceIsValid — word-count bounds', () => {
  it('rejects <10 words', () => {
    expect(sentenceIsValid(words(9))).toBe(false);
  });
  it('accepts 10 words', () => {
    expect(sentenceIsValid(words(10))).toBe(true);
  });
  it('accepts 22 words', () => {
    expect(sentenceIsValid(words(22))).toBe(true);
  });
  it('accepts 30 words (hard ceiling)', () => {
    expect(sentenceIsValid(words(30))).toBe(true);
  });
  it('rejects 31 words', () => {
    expect(sentenceIsValid(words(31))).toBe(false);
  });
});

describe('variantIsValid — rec-copy individual bounds', () => {
  const pad = (n: number): string => 'x'.repeat(n);

  it('rejects 29 chars (below floor)', () => {
    expect(variantIsValid(pad(29))).toBe(false);
  });
  it('accepts 30 chars (floor)', () => {
    expect(variantIsValid(pad(REC_COPY_MIN_LEN))).toBe(true);
  });
  it('accepts 280 chars (ceiling)', () => {
    expect(variantIsValid(pad(REC_COPY_MAX_LEN))).toBe(true);
  });
  it('rejects 281 chars (above ceiling)', () => {
    expect(variantIsValid(pad(281))).toBe(false);
  });
  it('rejects a variant with `!`', () => {
    expect(variantIsValid(`${pad(29)}!`)).toBe(false);
  });
  it('rejects a variant with an emoji', () => {
    expect(variantIsValid(`${pad(29)}🔥`)).toBe(false);
  });
  it('rejects a variant with a `#`', () => {
    expect(variantIsValid(`${pad(29)}#`)).toBe(false);
  });
});

describe('assertRecCopyBatch — 3-variant invariants', () => {
  const good = (first: string, body: string): string =>
    `${first} ${body.padEnd(60, 'x')}`;

  it('accepts exactly 3 distinct-first-word variants', () => {
    const variants = [
      good('Anchor', 'body'),
      good('Bridge', 'body'),
      good('Coda', 'body'),
    ];
    expect(() => assertRecCopyBatch(variants)).not.toThrow();
    expect(recCopyBatchIsValid(variants)).toBe(true);
  });

  it('rejects a batch with fewer than 3 variants', () => {
    const variants = [good('Anchor', 'body'), good('Bridge', 'body')];
    expect(() => assertRecCopyBatch(variants)).toThrow(/expected exactly 3/);
  });

  it('rejects a batch with more than 3 variants', () => {
    const variants = [
      good('Anchor', 'body'),
      good('Bridge', 'body'),
      good('Coda', 'body'),
      good('Denouement', 'body'),
    ];
    expect(() => assertRecCopyBatch(variants)).toThrow(/expected exactly 3/);
  });

  it('rejects two variants starting with the same first word', () => {
    const variants = [
      good('Anchor', 'body1'),
      good('Anchor', 'body2'),
      good('Coda', 'body3'),
    ];
    expect(() => assertRecCopyBatch(variants)).toThrow(/duplicate first word/);
  });

  it('rejects a batch where one variant fails length', () => {
    const variants = [
      good('Anchor', 'body'),
      good('Bridge', 'body'),
      'Coda short', // <30 chars
    ];
    expect(() => assertRecCopyBatch(variants)).toThrow(/failed validation/);
  });
});
