import { ArrowLeft, LayoutGrid, Play, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { labs, type LabDefinition } from '../labs/registry';
import { PROVENANCE_LABEL, type LabProvenance } from '../labs/provenance';
import { useSeo } from '../seo/useSeo';

// Every card previously showed the same generic "Lab" badge regardless of
// how deep the interaction actually is — a live-slider dashboard, a
// run/stop/reset sequence, and a 3-preset lookup table all looked identical
// until you opened one. Labeling the real interaction model up front sets
// the right expectation before the click.
const INTERACTION_META: Record<LabDefinition['interaction'], { label: string; icon: typeof Play }> = {
  live: { label: 'Live controls', icon: SlidersHorizontal },
  run: { label: 'Run & watch', icon: Play },
  preset: { label: 'Presets', icon: LayoutGrid },
};

// `interaction` says how you drive a lab; this says whether its output means anything. They are
// independent, and the pairing is the useful signal: three of the live-slider labs compute chosen
// formulas rather than measuring, and a reader deciding what to open deserves to know that here
// rather than after the click. Full detail is in each lab's ProvenanceNote — see labs/provenance.ts.
const PROVENANCE_BADGE: Record<LabProvenance['kind'], string> = {
  implementation: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  measured: 'bg-sky-50 text-sky-700 border-sky-200',
  model: 'bg-amber-50 text-amber-700 border-amber-200',
  unverified: 'bg-rose-50 text-rose-700 border-rose-200',
};

function LabsIndexPage() {
  useSeo({
    title: 'Interactive Labs',
    description: 'Interactive React simulations and benchmarks for distributed systems patterns.',
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <Link to="/" className="btn-back mb-4">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Portfolio
      </Link>
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Interactive Labs</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Stateful React simulations and benchmarks demonstrating distributed systems trade-offs — adjust
          parameters and watch the visualization react. Each lab states where its numbers come from:
          some run the real algorithm on your input, some are illustrative models, and some render a
          measured run.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {labs.map((lab) => {
          const { label, icon: Icon } = INTERACTION_META[lab.interaction];
          return (
            <Link
              key={lab.id}
              to={`/labs/${lab.id}`}
              className="group rounded-2xl border border-slate-200 bg-surface p-5 transition hover:-translate-y-0.5 hover:border-teal-400"
            >
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="flex items-center gap-2 text-teal-700">
                  <Icon size={16} aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    PROVENANCE_BADGE[lab.provenance.kind]
                  }`}
                >
                  {PROVENANCE_LABEL[lab.provenance.kind]}
                </span>
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 group-hover:text-teal-700">
                {lab.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600">{lab.description}</p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}

export default LabsIndexPage;
