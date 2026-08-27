import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkLoadError: boolean;
}

/**
 * Top-level error boundary. Without this, a render-phase error — most
 * commonly a lazy route chunk that 404s after a redeploy replaces the
 * hashed asset filenames — throws during render and unmounts the whole
 * React tree, leaving a permanently blank page with no recovery path.
 * <Suspense> only covers *pending* lazy imports, not *failed* ones.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkLoadError: false };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    const isChunkLoadError = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
      message
    );

    return { hasError: true, isChunkLoadError };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-600">
          {this.state.isChunkLoadError
            ? 'A newer version of this site was deployed while you were browsing. Reloading will fetch the latest version.'
            : 'This page hit an unexpected error. Reloading usually fixes it.'}
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="rounded-full bg-inverse px-6 py-2.5 text-sm font-semibold text-inverse-fg transition hover:bg-inverse/90"
        >
          Reload page
        </button>
      </main>
    );
  }
}

export default ErrorBoundary;
