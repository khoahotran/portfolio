import { Github, PenSquare, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { credibilityData } from '../data/portfolioData';

export default function Credibility() {
  const { oss, writing } = credibilityData;
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10">
        <div className="border border-slate-200 rounded-2xl p-8 bg-slate-50">
          <div className="flex items-center gap-2 mb-6">
            <Github size={18} className="text-teal-600" />
            <h2 className="text-sm uppercase tracking-widest text-teal-700 font-medium">Open Source</h2>
          </div>
          <div className="space-y-4">
            {oss.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between gap-4 rounded-xl bg-white p-4 border border-slate-200">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-600">{item.focus}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mt-2">{item.role}</p>
                </div>
                <div className="text-sm text-teal-700 flex items-center gap-1">
                  <Star size={14} />
                  {item.stars}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-8 bg-slate-50">
          <div className="flex items-center gap-2 mb-6">
            <PenSquare size={18} className="text-teal-600" />
            <h2 className="text-sm uppercase tracking-widest text-teal-700 font-medium">Writing</h2>
          </div>
          <div className="space-y-4">
            {writing.map((post, idx) => (
              <div key={idx} className="rounded-xl bg-white p-4 border border-slate-200 hover:border-teal-400 transition-colors">
                {post.route ? (
                  <Link to={post.route} className="block group">
                    <p className="text-lg font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">{post.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{post.takeaway}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500 mt-2">{post.time} read</p>
                  </Link>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-slate-900">{post.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{post.takeaway}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500 mt-2">{post.time} read</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
