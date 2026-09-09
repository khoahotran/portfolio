import { AlertTriangle, CheckCircle2, GitCompare } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { compareReconciliation } from '../../labs/merkleTree';
import type { MerkleEntry } from '../../labs/merkleTree';
import { useSeo } from '../../seo/useSeo';

const DATASET_SIZE = 1024;

function baseDataset(): MerkleEntry[] {
  return Array.from({ length: DATASET_SIZE }, (_, i) => ({ key: `k${i}`, value: `v${i}` }));
}

const PRESETS = [
  { label: 'Identical', differingIndices: [] as number[] },
  { label: '1 difference', differingIndices: [500] },
  { label: '5 scattered differences', differingIndices: [10, 200, 500, 777, 1000] },
  { label: 'Every key differs', differingIndices: 'all' as const },
];

function MerkleTreePage() {
  useSeo({
    title: 'Merkle Tree Reconciliation Visualizer',
    description: 'Run a real Merkle-tree targeted diff against a naive full scan on the same two datasets — see the O(1) proof of equality, the near-O(log n) cost of a sparse diff, and the honest case where the targeted walk loses.',
  });

  const [presetIndex, setPresetIndex] = useState(1);
  const base = useMemo(() => baseDataset(), []);

  const modified = useMemo(() => {
    const preset = PRESETS[presetIndex];
    if (preset.differingIndices === 'all') {
      return base.map((e, i) => ({ key: e.key, value: `X${i}` }));
    }
    const indices = new Set(preset.differingIndices);
    return base.map((e, i) => (indices.has(i) ? { key: e.key, value: `CHANGED${i}` } : e));
  }, [base, presetIndex]);

  const result = useMemo(() => compareReconciliation(base, modified), [base, modified]);
  const isWorstCase = presetIndex === PRESETS.length - 1;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="merkle-tree" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Merkle Trees</h1>
      <p className="mt-2 text-slate-600">
        Two {DATASET_SIZE.toLocaleString()}-key datasets, a real Merkle tree built over each, and a
        real targeted walk that only descends into subtrees whose hash actually differs — run
        against a naive full scan on the identical pair, every time.
      </p>

      <ProvenanceNote labId="merkle-tree" />

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Scenario</p>
          <div className="space-y-2">
            {PRESETS.map((preset, i) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setPresetIndex(i)}
                className={`w-full rounded-md px-3 py-2 text-left text-xs font-bold transition-colors ${
                  presetIndex === i ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Both trees are built for real from {DATASET_SIZE.toLocaleString()} entries each — the
            comparison below is measured against whichever scenario is selected, not precomputed.
          </p>
        </section>

        <section className="min-w-0 md:col-span-8 space-y-6">
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${
              isWorstCase ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-teal-200 bg-teal-50 text-teal-800'
            }`}
          >
            {isWorstCase ? (
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            )}
            <p>
              {isWorstCase
                ? "The honest caveat: with every key different, the targeted walk visits nearly the whole tree — more nodes than the naive scan, not fewer. The win is specific to sparse differences."
                : `Found ${result.differingKeys.length} differing key${result.differingKeys.length === 1 ? '' : 's'} by visiting only ${result.merkleNodesVisited.toLocaleString()} tree node${result.merkleNodesVisited === 1 ? '' : 's'} — not all ${DATASET_SIZE.toLocaleString()}.`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
              <GitCompare className="w-4 h-4" aria-hidden="true" /> Nodes Visited: Targeted Walk vs. Naive Scan
            </h2>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
                  <span>Merkle tree (targeted walk)</span>
                  <span className={isWorstCase ? 'text-amber-700' : 'text-teal-700'}>{result.merkleNodesVisited.toLocaleString()}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-3 rounded-full transition-all ${isWorstCase ? 'bg-amber-500' : 'bg-teal-600'}`}
                    style={{ width: `${Math.min(100, (result.merkleNodesVisited / (DATASET_SIZE * 2)) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
                  <span>Naive full scan</span>
                  <span className="text-slate-700">{result.naiveComparisons.toLocaleString()}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-slate-400 transition-all"
                    style={{ width: `${Math.min(100, (result.naiveComparisons / (DATASET_SIZE * 2)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Both counts come from running the real diff against the identical two datasets — a
              direct measurement, not two formulas asserted separately. Two identical trees cost
              exactly 1 (a single root-hash comparison proves full equality); every key differing
              costs up to {(DATASET_SIZE * 2 - 1).toLocaleString()} (the entire tree) — worse than
              the naive scan's fixed {DATASET_SIZE.toLocaleString()}.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default MerkleTreePage;
