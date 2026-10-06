import { Award } from 'lucide-react';
import { certificationsData as certifications } from '../data/portfolioData';

export default function Certifications() {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-sm uppercase tracking-widest text-teal-700 mb-12 font-medium">
          Certifications
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {certifications.map((cert, index) => (
            <div
              key={index}
              className="bg-surface rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                  <Award className="text-teal-700" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 mb-1">
                    {cert.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-1">{cert.issuer}</p>
                  <p className="text-sm text-slate-500">{cert.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
