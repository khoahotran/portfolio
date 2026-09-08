import { AlertTriangle, CheckCircle2, Gauge } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { optimalK, runBloomFilterTrial } from '../../labs/bloomFilter';
import { useSeo } from '../../seo/useSeo';

const BIT_ARRAY_SIZE = 2000;
const DESIGNED_CAPACITY = 200;
const TEST_ITEM_COUNT = 5000;

function itemRange(count: number, prefix: string): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
}

function BloomFilterPage() {
  useSeo({
    title: 'Bloom Filter Visualizer',
    description: 'Run a real bit-array Bloom filter — measure its false-positive rate against the closed-form formula, then overload it past design capacity and watch the rate climb for real.',
  });

  const [insertedCount, setInsertedCount] = useState(DESIGNED_CAPACITY);
  const k = optimalK(BIT_ARRAY_SIZE, DESIGNED_CAPACITY);

  const insertedItems = useMemo(() => itemRange(insertedCount, 'item'), [insertedCount]);
  const testItems = useMemo(() => itemRange(TEST_ITEM_COUNT, 'test'), []);

  const trial = useMemo(
    () => runBloomFilterTrial(BIT_ARRAY_SIZE, k, insertedItems, testItems),
    [insertedItems, testItems, k]
  );

  const overloadFactor = insertedCount / DESIGNED_CAPACITY;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="bloom-filter" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bloom Filters</h1>
      <p className="mt-2 text-slate-600">
        A real {BIT_ARRAY_SIZE}-bit filter, sized for {DESIGNED_CAPACITY} items at {k} hash
        functions each. Drag how many items actually get inserted and watch the measured
        false-positive rate — not a formula, a real count against {TEST_ITEM_COUNT.toLocaleString()}
        {' '}genuinely-not-inserted test items every time.
      </p>

      <ProvenanceNote labId="bloom-filter" />

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Items inserted</span>
              <span className="text-teal-700">{insertedCount.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={10}
              max={DESIGNED_CAPACITY * 6}
              step={10}
              value={insertedCount}
              onChange={(e) => setInsertedCount(Number(e.target.value))}
              className="mt-3 w-full accent-teal-600"
            />
          </label>

          <p className="text-xs text-slate-500">
            Designed capacity is {DESIGNED_CAPACITY} items — you're at{' '}
            <span className="font-bold text-slate-700">{overloadFactor.toFixed(1)}×</span> that.
            {overloadFactor > 1.5 && ' Past design capacity, the false-positive rate stops being a small cost and becomes the dominant one.'}
          </p>

          <div className="space-y-1.5 border-t border-slate-100 pt-4 text-xs text-slate-600">
            <div className="flex justify-between"><span>Bit array size (m)</span><span className="font-mono">{BIT_ARRAY_SIZE}</span></div>
            <div className="flex justify-between"><span>Hash functions (k)</span><span className="font-mono">{k}</span></div>
            <div className="flex justify-between"><span>Bits set</span><span className="font-mono">{trial.bitsSet} / {BIT_ARRAY_SIZE}</span></div>
            <div className="flex justify-between"><span>Fill ratio</span><span className="font-mono">{(trial.fillRatio * 100).toFixed(1)}%</span></div>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 space-y-6">
          <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-800">
            <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            <p>
              Every one of the {insertedCount.toLocaleString()} inserted items still tests as
              present — {trial.falseNegativeCount} false negatives, always. This never changes,
              no matter how overloaded the filter gets.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
              <Gauge className="w-4 h-4" aria-hidden="true" /> False-Positive Rate
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Theoretical formula</p>
                <div className="mt-2 text-2xl font-bold text-slate-800">{(trial.theoreticalFalsePositiveRate * 100).toFixed(2)}%</div>
                <p className="mt-2 text-xs text-slate-500 font-mono">(1 - e^(-kn/m))^k</p>
              </div>
              <div className={`rounded-2xl border p-5 ${trial.measuredFalsePositiveRate > 0.5 ? 'border-rose-200 bg-rose-50' : 'border-teal-200 bg-teal-50'}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Measured (real test)</p>
                <div className={`mt-2 flex items-center gap-2 text-2xl font-bold ${trial.measuredFalsePositiveRate > 0.5 ? 'text-rose-800' : 'text-teal-800'}`}>
                  {trial.measuredFalsePositiveRate > 0.5 && <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />}
                  {(trial.measuredFalsePositiveRate * 100).toFixed(2)}%
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {trial.falsePositiveCount.toLocaleString()} of {trial.testedCount.toLocaleString()} genuinely-new items wrongly flagged.
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              The two numbers track each other closely at any fill level — this is a real hash-based
              structure being measured, not a formula asserted separately from an implementation.
              Drag the slider from {DESIGNED_CAPACITY} up to {DESIGNED_CAPACITY * 6} and watch both
              rise together, sharply, once the filter holds more than it was sized for.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default BloomFilterPage;
