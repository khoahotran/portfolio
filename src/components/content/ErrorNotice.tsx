interface Props {
  message: string;
  onRetry: () => void;
}

/**
 * Shared failed-to-load state for the data-fetching pages (ContentListPage,
 * SearchPage, ContentDetailPage). Replaces an indefinite "Loading..." state
 * with a visible, actionable error when the content index fetch rejects —
 * previously an unhandled rejection left these pages spinning forever.
 */
function ErrorNotice({ message, onRetry }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-rose-300 bg-rose-50 p-8 text-center">
      <p className="text-sm text-rose-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full border border-rose-300 bg-surface px-4 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
      >
        Try again
      </button>
    </div>
  );
}

export default ErrorNotice;
