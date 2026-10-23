/**
 * One scorer for both the Cmd-K palette and /search.
 *
 * They used to disagree: the palette matched a raw substring of the title only ("kafka" found
 * nothing although eleven articles are about Kafka, while "go" matched "alGOrithms"), and /search
 * ran Fuse.js fuzzy matching that returned an article with no "raft" in it for "raft" and nothing
 * at all for "consensus raft". This matches whole query words, in any order, against the words of
 * each field: every word must match somewhere, prefixes count, and a word of 5+ letters may carry
 * one typo.
 */

export interface SearchDoc {
  id: string;
  title: string;
  summary?: string;
  tags?: string[];
  body?: string;
}

export interface SearchHit<T extends SearchDoc> {
  doc: T;
  score: number;
}

const FIELD_WEIGHT = { title: 4, tags: 3, summary: 2, body: 1 } as const;

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function wordsOf(text: string): string[] {
  return normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
}

/** True when `a` and `b` differ by at most one insertion, deletion or substitution. */
export function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

interface IndexedField {
  weight: number;
  words: string[];
  joined: string;
}

function matchQuality(token: string, field: IndexedField): number {
  let best = 0;
  for (const word of field.words) {
    if (word === token) return 1;
    // Two-letter words ("go", "ui") only match whole words, or they match half the vocabulary.
    if (token.length > 2 && word.startsWith(token)) best = Math.max(best, 0.8);
    else if (token.length >= 5 && (withinOneEdit(token, word) || withinOneEdit(token, word.slice(0, token.length)))) {
      best = Math.max(best, 0.5);
    }
  }
  // "ratelimit" for "rate limiting": a run-together query against the field with its spaces removed.
  if (best === 0 && token.length >= 6 && field.joined.includes(token)) best = 0.6;
  return best;
}

export function createSiteSearch<T extends SearchDoc>(docs: T[]) {
  const indexed = docs.map((doc) => {
    const fields: IndexedField[] = (
      [
        [doc.title, FIELD_WEIGHT.title],
        [(doc.tags ?? []).join(' '), FIELD_WEIGHT.tags],
        [doc.summary ?? '', FIELD_WEIGHT.summary],
        [doc.body ?? '', FIELD_WEIGHT.body],
      ] as const
    ).map(([text, weight]) => {
      const words = wordsOf(text);
      return { weight, words, joined: words.join('') };
    });
    return { doc, fields, title: normalize(doc.title) };
  });

  return function search(query: string, limit = Infinity): SearchHit<T>[] {
    const tokens = wordsOf(query);
    if (tokens.length === 0) return [];
    const phrase = normalize(query).trim();
    const hits: SearchHit<T>[] = [];

    for (const entry of indexed) {
      let score = 0;
      let matchedAll = true;
      for (const token of tokens) {
        const best = Math.max(...entry.fields.map((field) => field.weight * matchQuality(token, field)));
        if (best === 0) {
          matchedAll = false;
          break;
        }
        score += best;
      }
      if (!matchedAll) continue;
      // An exact or leading title match is what someone typing a page's name is looking for.
      if (entry.title === phrase) score += 20;
      else if (entry.title.startsWith(phrase)) score += 10;
      else if (entry.title.includes(phrase)) score += 5;
      hits.push({ doc: entry.doc, score });
    }

    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  };
}
