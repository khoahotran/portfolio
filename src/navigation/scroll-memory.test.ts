import { describe, expect, it } from 'vitest';
import { createScrollMemory } from './scroll-memory';

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('createScrollMemory', () => {
  it('returns what was saved for a key, rounded and never negative', () => {
    const memory = createScrollMemory(null);
    memory.save('a', 1234.6);
    memory.save('b', -20);
    expect(memory.get('a')).toBe(1235);
    expect(memory.get('b')).toBe(0);
    expect(memory.get('missing')).toBeUndefined();
  });

  it('writes to storage only on flush, and a new instance reads it back', () => {
    const storage = fakeStorage();
    const memory = createScrollMemory(storage);
    memory.save('a', 500);
    expect(storage.data.size).toBe(0);
    memory.flush();
    expect(createScrollMemory(storage).get('a')).toBe(500);
  });

  it('keeps only the most recently saved entries past the limit', () => {
    const memory = createScrollMemory(null, 2);
    memory.save('a', 1);
    memory.save('b', 2);
    memory.save('a', 3); // re-saving refreshes 'a', so 'b' is now the oldest
    memory.save('c', 4);
    expect(memory.get('b')).toBeUndefined();
    expect(memory.get('a')).toBe(3);
    expect(memory.get('c')).toBe(4);
  });

  it('starts empty on corrupt or malformed storage instead of throwing', () => {
    expect(createScrollMemory(fakeStorage({ 'portfolio-scroll': '{not json' })).get('a')).toBeUndefined();
    expect(createScrollMemory(fakeStorage({ 'portfolio-scroll': '{"a":1}' })).get('a')).toBeUndefined();
    const mixed = createScrollMemory(fakeStorage({ 'portfolio-scroll': '[["a",10],["b","x"],[3,4]]' }));
    expect(mixed.get('a')).toBe(10);
    expect(mixed.get('b')).toBeUndefined();
  });

  it('survives storage that throws on every call', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const memory = createScrollMemory(throwing);
    memory.save('a', 7);
    expect(() => memory.flush()).not.toThrow();
    expect(memory.get('a')).toBe(7);
  });
});
