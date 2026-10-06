import { Link } from 'react-router-dom';
import { useSeo } from '../seo/useSeo';

function NotFoundPage() {
  useSeo({
    title: 'Page not found',
    description: 'The page you were looking for does not exist.',
    noindex: true,
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">404</p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-600">
        The page you were looking for doesn&apos;t exist, or the link may be out of date.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-full bg-inverse px-5 py-2 text-sm font-semibold text-inverse-fg transition hover:bg-inverse/90"
        >
          Back to home
        </Link>
        <Link
          to="/search"
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:border-teal-500 hover:text-teal-700"
        >
          Search the site
        </Link>
      </div>
    </main>
  );
}

export default NotFoundPage;
