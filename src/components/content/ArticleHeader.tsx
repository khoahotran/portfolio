import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collectionLabel, formatDate, routeForCollection } from '../../content-engine/format';
import type { ContentDetail } from '../../content-engine/types';
import SeriesNav from './SeriesNav';

interface Props {
  detail: ContentDetail;
}

function ArticleHeader({ detail }: Props) {
  return (
    <>
      <Link to={routeForCollection(detail.collection)} className="btn-back mb-2">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to {collectionLabel(detail.collection)}
      </Link>
      <header className="mb-6 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{detail.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span>{formatDate(detail.date)}</span>
          <span>{detail.readingText}</span>
        </div>
        <p className="mt-3 text-sm text-slate-600">{detail.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {detail.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
              #{tag}
            </span>
          ))}
        </div>
        <SeriesNav series={detail.series} seriesOrder={detail.seriesOrder} slug={detail.slug} />
      </header>
    </>
  );
}

export default ArticleHeader;
