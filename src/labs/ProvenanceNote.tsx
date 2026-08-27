import { AlertTriangle, FlaskConical, Gauge, HelpCircle } from 'lucide-react';
import type { LabProvenance } from './provenance';
import { PROVENANCE_LABEL } from './provenance';
import { getLabById } from './registry';

/**
 * The "where do these numbers come from" panel every lab renders.
 *
 * Placed at the top of the lab, not buried at the bottom, on purpose: a reader deciding whether to
 * trust a chart should not have to scroll past it first. Icon and colour differ per kind so the
 * three categories are distinguishable at a glance rather than only on close reading.
 */
const STYLES: Record<
  LabProvenance['kind'],
  { icon: typeof Gauge; surface: string; accent: string }
> = {
  implementation: {
    icon: FlaskConical,
    surface: 'border-emerald-200 bg-emerald-50',
    accent: 'text-emerald-700',
  },
  measured: {
    icon: Gauge,
    surface: 'border-sky-200 bg-sky-50',
    accent: 'text-sky-700',
  },
  model: {
    icon: HelpCircle,
    surface: 'border-amber-200 bg-amber-50',
    accent: 'text-amber-700',
  },
  unverified: {
    icon: AlertTriangle,
    surface: 'border-rose-200 bg-rose-50',
    accent: 'text-rose-700',
  },
};

function Body({ provenance }: { provenance: LabProvenance }) {
  switch (provenance.kind) {
    case 'implementation':
    case 'model':
      return <p className="text-slate-700">{provenance.basis}</p>;
    case 'measured':
      return (
        <div className="space-y-1.5 text-slate-700">
          <p>
            <span className="font-semibold">Environment:</span> {provenance.environment}
          </p>
          <p>
            <span className="font-semibold">Measured:</span> {provenance.measuredOn}
          </p>
          {provenance.harness && (
            <p>
              <span className="font-semibold">Harness:</span>{' '}
              <a
                href={provenance.harness}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-sky-400 underline-offset-2 hover:text-sky-900"
              >
                reproduce this run
              </a>
            </p>
          )}
          {provenance.caveat && (
            <p className="border-t border-sky-200 pt-1.5">
              <span className="font-semibold">Limits:</span> {provenance.caveat}
            </p>
          )}
        </div>
      );
    case 'unverified':
      return <p className="text-slate-700">{provenance.note}</p>;
  }
}

/**
 * Looks the lab's provenance up from the registry by id, so each lab page adds one line rather
 * than restating its own provenance — the registry stays the single source of truth, the same way
 * it already is for routes and index cards.
 *
 * Not a static import cycle despite ProvenanceNote -> registry -> lab page -> ProvenanceNote: the
 * registry reaches its page components through lazy(() => import(...)), which is dynamic.
 */
export default function ProvenanceNote({ labId }: { labId: string }) {
  const provenance = getLabById(labId)?.provenance;

  // A lab id with no registry entry isn't reachable as a route at all (App.tsx builds routes from
  // the same list), so this is unreachable in practice — but rendering nothing is the right
  // degradation, matching the silent-failure convention in ArticleNav and the vitals reporter.
  if (!provenance) return null;

  const style = STYLES[provenance.kind];
  const Icon = style.icon;

  return (
    <section
      aria-label="Data provenance"
      className={`mt-6 flex min-w-0 gap-3 rounded-xl border p-4 text-sm leading-relaxed ${style.surface}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.accent}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className={`mb-1 text-[11px] font-bold uppercase tracking-widest ${style.accent}`}>
          {PROVENANCE_LABEL[provenance.kind]}
        </p>
        <Body provenance={provenance} />
      </div>
    </section>
  );
}
