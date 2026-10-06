import { ArrowLeft, ArrowRight } from 'lucide-react';
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
  // A bare slug (every lab before idempotency-store) means content/experiments/; a
  // "collection/slug" string (see LabDefinition.relatedArticle) names its own collection.
  const articlePath = lab?.relatedArticle?.includes('/') ? lab.relatedArticle : `experiments/${lab?.relatedArticle}`;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Link to="/experiments" className="btn-back">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Experiments
      </Link>
      {lab?.relatedArticle && (
        <Link
          to={`/${articlePath}`}
          className="btn-back !text-slate-500 hover:!text-slate-700"
        >
          Read the write-up
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export default LabBackLink;
