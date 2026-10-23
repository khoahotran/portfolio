/**
 * Where the reader left each history entry, keyed by React Router's `location.key`.
 *
 * Kept in memory while the reader scrolls and written to sessionStorage only on `flush()` (each
 * navigation, and `pagehide`), so a reload or a cross-document Back still finds the position
 * without serialising the map on every scroll frame. Bounded, so a long session cannot grow it
 * without limit: the least recently saved entries go first.
 */

const STORAGE_KEY = 'portfolio-scroll';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export interface ScrollMemory {
  save(key: string, y: number): void;
  get(key: string): number | undefined;
  flush(): void;
}

function readStored(storage: Store | null): Map<string, number> {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return new Map();
    return new Map(
      parsed.filter(
        (entry): entry is [string, number] =>
          Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'number' && Number.isFinite(entry[1])
      )
    );
  } catch {
    // Corrupt JSON or storage that throws on access (private mode, blocked site data): start empty.
    return new Map();
  }
}

export function createScrollMemory(storage: Store | null, limit = 100): ScrollMemory {
  const positions = readStored(storage);

  return {
    save(key, y) {
      positions.delete(key); // re-insert so the newest entry is the last to be trimmed
      positions.set(key, Math.max(0, Math.round(y)));
      while (positions.size > limit) {
        const oldest = positions.keys().next().value;
        if (oldest === undefined) break;
        positions.delete(oldest);
      }
    },
    get: (key) => positions.get(key),
    flush() {
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify([...positions]));
      } catch {
        // Quota or blocked storage: positions still work for this document, just not across a reload.
      }
    },
  };
}
