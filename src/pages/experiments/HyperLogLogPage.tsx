import { AlertTriangle, CheckCircle2, GitMerge, Ruler } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import {
  addToHyperLogLog,
  createHyperLogLog,
  estimateCardinality,
  estimateCardinalityRaw,
  mergeHyperLogLog,
  runCardinalityTrial,
  theoreticalStandardError,
} from '../../labs/hyperLogLog';
import { useSeo } from '../../seo/useSeo';

function HyperLogLogPage() {
  useSeo({
    title: 'HyperLogLog Visualizer',
    description: 'Run a real HyperLogLog sketch — measure its estimation error against a true count and the theoretical standard error, watch the small-range correction matter, then merge two overlapping sketches for a real union estimate.',
  });

  // Stage 1 — accuracy vs. true cardinality
  const [precision, setPrecision] = useState(10);
  const [trueCardinality, setTrueCardinality] = useState(1000);
  const registerCount = 1 << precision;

  const trial = useMemo(() => runCardinalityTrial(trueCardinality, precision), [trueCardinality, precision]);
  const standardError = useMemo(() => theoreticalStandardError(registerCount), [registerCount]);

  const smallRangeDemo = useMemo(() => {
    const hll = createHyperLogLog(precision);
    for (let i = 0; i < Math.min(trueCardinality, 50); i++) addToHyperLogLog(hll, `demo-${i}`);
    return { raw: estimateCardinalityRaw(hll), corrected: estimateCardinality(hll), n: Math.min(trueCardinality, 50) };
  }, [precision, trueCardinality]);

  // Stage 2 — merge
  const [sizeA, setSizeA] = useState(1000);
  const [sizeB, setSizeB] = useState(1000);
  const [overlap, setOverlap] = useState(500);

  const mergeResult = useMemo(() => {
    const p = 10;
    const a = createHyperLogLog(p);
    const b = createHyperLogLog(p);
    const clampedOverlap = Math.min(overlap, sizeA, sizeB);
    for (let i = 0; i < sizeA; i++) addToHyperLogLog(a, `user-${i}`);
    // b starts (sizeA - clampedOverlap) positions in, so the first clampedOverlap ids it adds are
    // shared with a's range, and the rest are genuinely new.
    for (let i = sizeA - clampedOverlap; i < sizeA - clampedOverlap + sizeB; i++) addToHyperLogLog(b, `user-${i}`);
    const trueUnion = sizeA + sizeB - clampedOverlap;
    const estimateA = estimateCardinality(a);
    const estimateB = estimateCardinality(b);
    const naiveSum = estimateA + estimateB;
    const merged = mergeHyperLogLog(a, b);
    const mergedEstimate = estimateCardinality(merged);
    return { trueUnion, estimateA, estimateB, naiveSum, mergedEstimate, clampedOverlap };
  }, [sizeA, sizeB, overlap]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="hyperloglog" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">HyperLogLog</h1>
      <p className="mt-2 text-slate-600">
        The Bloom filter lab answers "have I seen this exact item." This one answers the different
        question of "how many distinct items have I seen" — in a fixed handful of registers, never
        storing a single item itself.
      </p>

      <ProvenanceNote labId="hyperloglog" />

      <div className="mt-8 space-y-10">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
            <Ruler className="w-4 h-4" aria-hidden="true" /> Estimate vs. True Count
          </h2>
          <div className="grid gap-6 md:grid-cols-12">
            <div className="min-w-0 md:col-span-4 space-y-4 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
              <label className="block text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>True cardinality</span>
                  <span>{trueCardinality.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100000}
                  step={10}
                  value={trueCardinality}
                  onChange={(e) => setTrueCardinality(Number(e.target.value))}
                  className="mt-1.5 w-full accent-teal-600"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Precision (registers = 2^p)</span>
                  <span>p={precision} (m={registerCount.toLocaleString()})</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={14}
                  value={precision}
                  onChange={(e) => setPrecision(Number(e.target.value))}
                  className="mt-1.5 w-full accent-teal-600"
                />
              </label>
              <div className="space-y-1.5 border-t border-slate-100 pt-4 text-xs text-slate-600">
                <div className="flex justify-between"><span>Registers (m)</span><span className="font-mono">{registerCount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Memory (1 byte/register)</span><span className="font-mono">{registerCount.toLocaleString()} B</span></div>
                <div className="flex justify-between"><span>Theoretical std. error</span><span className="font-mono">{(standardError * 100).toFixed(2)}%</span></div>
              </div>
            </div>

            <div className="min-w-0 md:col-span-8 space-y-4">
              <div
                className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${
                  trial.relativeError > standardError * 4 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-teal-200 bg-teal-50 text-teal-800'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                <p>
                  True count {trueCardinality.toLocaleString()}, estimated {trial.estimate.toFixed(0)}{' '}
                  — {(trial.relativeError * 100).toFixed(2)}% off, against a theoretical standard
                  error of {(standardError * 100).toFixed(2)}% for {registerCount.toLocaleString()}{' '}
                  registers. Never exact, but never storing a single one of the{' '}
                  {trueCardinality.toLocaleString()} items either — only {registerCount.toLocaleString()}{' '}
                  small registers, regardless of true cardinality.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                  The correction that matters below ~{(2.5 * registerCount).toLocaleString()} true items
                </p>
                <p className="mb-4 text-xs text-slate-500">
                  Fixed demo at {smallRangeDemo.n} true items, same {registerCount.toLocaleString()}-register
                  sketch: most registers are still untouched zeros at this low a count, which the raw
                  harmonic-mean formula doesn't account for on its own.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Raw formula (no correction)</p>
                    <div className="mt-2 flex items-center gap-2 text-2xl font-bold text-rose-800">
                      <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
                      {smallRangeDemo.raw.toFixed(0)}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {(smallRangeDemo.raw / Math.max(smallRangeDemo.n, 1)).toFixed(1)}× the true count of {smallRangeDemo.n}.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Corrected (linear counting)</p>
                    <div className="mt-2 flex items-center gap-2 text-2xl font-bold text-teal-800">
                      <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                      {smallRangeDemo.corrected.toFixed(0)}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Close to the true count of {smallRangeDemo.n}.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
            <GitMerge className="w-4 h-4" aria-hidden="true" /> Merging Two Sketches Without Ever Combining Raw Data
          </h2>
          <div className="grid gap-6 md:grid-cols-12">
            <div className="min-w-0 md:col-span-4 space-y-4 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
              <p className="text-xs text-slate-500">Two independent sketches (say, two shards each tracking their own users), with a real overlap between them.</p>
              <label className="block text-xs font-semibold text-slate-600">
                <div className="flex justify-between"><span>Sketch A size</span><span>{sizeA.toLocaleString()}</span></div>
                <input type="range" min={100} max={5000} step={100} value={sizeA} onChange={(e) => setSizeA(Number(e.target.value))} className="mt-1.5 w-full accent-teal-600" />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                <div className="flex justify-between"><span>Sketch B size</span><span>{sizeB.toLocaleString()}</span></div>
                <input type="range" min={100} max={5000} step={100} value={sizeB} onChange={(e) => setSizeB(Number(e.target.value))} className="mt-1.5 w-full accent-teal-600" />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                <div className="flex justify-between"><span>Overlap between them</span><span>{mergeResult.clampedOverlap.toLocaleString()}</span></div>
                <input type="range" min={0} max={Math.min(sizeA, sizeB)} step={50} value={overlap} onChange={(e) => setOverlap(Number(e.target.value))} className="mt-1.5 w-full accent-teal-600" />
              </label>
            </div>

            <div className="min-w-0 md:col-span-8 space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-800">
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                <p>
                  True union: {mergeResult.trueUnion.toLocaleString()}. Merged sketch estimates{' '}
                  {mergeResult.mergedEstimate.toFixed(0)} — correct regardless of how much A and B
                  overlap, because merging takes the max per register, exactly what one sketch that
                  had seen everything both did would itself contain.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">A alone</p>
                    <div className="mt-2 text-xl font-bold text-slate-700">{mergeResult.estimateA.toFixed(0)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">B alone</p>
                    <div className="mt-2 text-xl font-bold text-slate-700">{mergeResult.estimateB.toFixed(0)}</div>
                  </div>
                  <div className={`rounded-2xl border p-4 ${Math.abs(mergeResult.naiveSum - mergeResult.trueUnion) > mergeResult.trueUnion * 0.15 ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Naive sum (A + B)</p>
                    <div className={`mt-2 flex items-center gap-1.5 text-xl font-bold ${Math.abs(mergeResult.naiveSum - mergeResult.trueUnion) > mergeResult.trueUnion * 0.15 ? 'text-rose-800' : 'text-slate-700'}`}>
                      {Math.abs(mergeResult.naiveSum - mergeResult.trueUnion) > mergeResult.trueUnion * 0.15 && <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />}
                      {mergeResult.naiveSum.toFixed(0)}
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Drag overlap up toward A's or B's full size — the naive sum keeps climbing (it
                  double-counts every shared user) while the merged estimate keeps tracking the real
                  union, because it never counted anyone twice in the first place.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HyperLogLogPage;
