import { describe, expect, it, vi } from 'vitest';
import { lazyRoute } from './lazy-route';

describe('lazyRoute', () => {
  it('keeps throwing a failed import on render instead of re-importing in a loop', async () => {
    const error = new Error('chunk gone');
    const factory = vi.fn(() => Promise.reject(error));
    const render = lazyRoute(factory) as unknown as (props: object) => unknown;
    let suspended: unknown;
    try {
      render({});
    } catch (thrown) {
      suspended = thrown;
    }
    await suspended;
    expect(() => render({})).toThrow(error);
    expect(() => render({})).toThrow(error);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
