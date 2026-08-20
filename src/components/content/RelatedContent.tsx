import { Link } from 'react-router-dom';
import { collectionLabel, formatDate } from '../../content-engine/format';
import type { ContentIndexItem } from '../../content-engine/types';

interface Props {
  items: ContentIndexItem[];
}

function RelatedContent({ items }: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 border-t border-slate-200 pt-8">
      <h2 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-900">Read Next</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.slug}
            to={`/${item.collection}/${item.slug}`}
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:border-teal-500 hover:shadow-lg"
          >
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-teal-600">
                {collectionLabel(item.collection)}
              </div>
              <h3 className="line-clamp-2 font-bold text-slate-900 transition-colors group-hover:text-teal-700">
                {item.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.summary}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-[10px] font-medium text-slate-400">
              <span>{formatDate(item.date)}</span>
              <span>{item.readingText}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default RelatedContent;
