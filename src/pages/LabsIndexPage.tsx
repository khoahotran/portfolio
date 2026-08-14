import { FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { labs } from '../labs/registry';
import { useSeo } from '../seo/useSeo';

function LabsIndexPage() {
  useSeo({
    title: 'Interactive Labs',
    description: 'Interactive React simulations and benchmarks for distributed systems patterns.',
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <Link to="/" className="mb-4 inline-block text-xs text-teal-600 hover:underline">
        Back to Portfolio
      </Link>
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Interactive Labs</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Stateful React simulations and benchmarks demonstrating distributed systems trade-offs — adjust
          parameters and watch the visualization react.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {labs.map((lab) => (
          <Link
            key={lab.id}
            to={`/labs/${lab.id}`}
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-teal-400"
          >
            <div className="mb-2 flex items-center gap-2 text-teal-600">
              <FlaskConical size={16} />
              <span className="text-xs font-semibold uppercase tracking-wide">Lab</span>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 group-hover:text-teal-600">
              {lab.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{lab.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}

export default LabsIndexPage;
