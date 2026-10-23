import { createElement, type ComponentType } from 'react';

export type PreloadableComponent<P extends object = object> = ComponentType<P> & { preload: () => Promise<void> };

/**
 * `React.lazy()` that can be loaded ahead of rendering, and renders synchronously once loaded.
 *
 * `React.lazy()` suspends on its first render even when the module is already in memory - its
 * `import()` promise only settles on a later microtask - so the first commit is always the
 * Suspense fallback. On a first visit that replaced the prerendered page with "Loading page…" for
 * a frame. main.tsx calls `preload()` for the current route before rendering, so the first commit
 * is the page itself (see src/routing/preload-route.ts).
 *
 * A failed import is thrown to the nearest error boundary on every render, as `React.lazy()` does -
 * retrying inside render loops forever, because React re-renders after an error. Only an explicit
 * `preload()` retries the import.
 */
export function lazyRoute<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>
): PreloadableComponent<P> {
  let loaded: ComponentType<P> | null = null;
  let failure: { error: unknown } | null = null;
  let pending: Promise<void> | null = null;

  const preload = (): Promise<void> => {
    if (loaded) return Promise.resolve();
    failure = null;
    pending ??= factory().then(
      (module) => {
        loaded = module.default;
      },
      (error: unknown) => {
        failure = { error };
        pending = null;
      }
    );
    return pending;
  };

  function LazyRoute(props: P) {
    if (loaded) return createElement(loaded, props);
    if (failure) throw failure.error;
    // Suspense's contract: a thrown promise suspends this subtree until it settles, then React
    // renders it again - by which point `loaded` (or `failure`) is set.
    throw preload();
  }

  return Object.assign(LazyRoute, { preload });
}
