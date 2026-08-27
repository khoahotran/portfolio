import { describe, expect, it } from 'vitest';
import labIds from './lab-ids.json';
import { labs, getLabById } from './registry';

/**
 * `src/labs/lab-ids.json` is the manifest the Node build scripts read — `build-search-index.mjs`
 * for the sitemap, `prerender.mjs` for the routes to snapshot, `check-responsive.mjs` for the
 * routes to sweep. `registry.ts` owns the definitions (title, description, lazy component), which
 * can't live in JSON.
 *
 * That split is only safe if the two agree, and nothing at runtime checks it: a lab missing from
 * the JSON would still render, but would silently vanish from the sitemap and ship without
 * prerendered metadata — exactly the class of invisible regression this phase existed to fix. The
 * check lives here rather than in the app so it costs the browser nothing.
 */
describe('lab registry / manifest parity', () => {
  it('registry ids and lab-ids.json contain the same ids', () => {
    expect(labs.map((lab) => lab.id)).toEqual(labIds);
  });

  it('has no duplicate ids', () => {
    expect(new Set(labIds).size).toBe(labIds.length);
  });

  it('resolves every id through getLabById', () => {
    for (const id of labIds) {
      expect(getLabById(id)?.id, `getLabById(${id})`).toBe(id);
    }
  });

  it('returns undefined for an unknown id', () => {
    expect(getLabById('not-a-lab')).toBeUndefined();
  });
});

describe('lab provenance', () => {
  it('every lab declares provenance', () => {
    for (const lab of labs) {
      expect(lab.provenance, `${lab.id} provenance`).toBeDefined();
    }
  });

  /**
   * A `measured` lab is the strongest claim the site makes, and the one a reader is most likely to
   * check. It must name an environment and when it ran; if it cannot link a runnable harness it
   * must say so in `caveat` rather than leaving the omission implicit.
   */
  it('measured labs state environment, date, and either a harness or a caveat', () => {
    for (const lab of labs) {
      if (lab.provenance.kind !== 'measured') continue;
      expect(lab.provenance.environment.length, `${lab.id} environment`).toBeGreaterThan(20);
      expect(lab.provenance.measuredOn, `${lab.id} measuredOn`).toBeTruthy();
      expect(
        Boolean(lab.provenance.harness || lab.provenance.caveat),
        `${lab.id} must link a harness or explain in caveat why it can't`
      ).toBe(true);
    }
  });

  /** A model's whole value is that the reader can judge the formulas, so `basis` has to show them. */
  it('modelled labs describe their basis', () => {
    for (const lab of labs) {
      if (lab.provenance.kind !== 'model' && lab.provenance.kind !== 'implementation') continue;
      expect(lab.provenance.basis.length, `${lab.id} basis`).toBeGreaterThan(40);
    }
  });
});
