import { Link } from 'react-router-dom';
import { getLabById } from './registry';

interface Props {
  labId: string;
}

/**
 * Every lab page previously had its own identical "&larr; Back to Experiments"
 * link, and no way to get back to the specific article a reader arrived from
 * — the only way out of any lab was the generic collection list. This adds a
 * second link to the companion write-up when one exists (see
 * LabDefinition.relatedArticle), and is a shared component rather than 9
 * copies specifically so that second link's presence/absence stays correct
 * automatically as labs are added or gain a companion article.
 */
function LabBackLink({ labId }: Props) {
  const lab = getLabById(labId);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4">
      <Link
        to="/experiments"
        className="inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 hover:text-teal-700 transition-colors"
      >
        &larr; Back to Experiments
      </Link>
      {lab?.relatedArticle && (
        <Link
          to={`/experiments/${lab.relatedArticle}`}
          className="inline-block text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
        >
          Read the write-up &rarr;
        </Link>
      )}
    </div>
  );
}

export default LabBackLink;
