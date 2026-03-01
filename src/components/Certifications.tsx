import { Award } from 'lucide-react';

interface Certification {
  name: string;
  issuer: string;
  date: string;
  credentialId?: string;
}

const certifications: Certification[] = [
  {
    name: 'AWS Certified Developer - Associate',
    issuer: 'Amazon Web Services',
    date: '2023',
    credentialId: 'ABC123XYZ',
  },
  {
    name: 'Professional Scrum Master I',
    issuer: 'Scrum.org',
    date: '2022',
  },
  {
    name: 'React Developer Certification',
    issuer: 'Meta',
    date: '2021',
  },
];

export default function Certifications() {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-sm uppercase tracking-widest text-teal-600 mb-12 font-medium">
          Certifications
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {certifications.map((cert, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                  <Award className="text-teal-600" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 mb-1">
                    {cert.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-1">{cert.issuer}</p>
                  <p className="text-sm text-slate-500">{cert.date}</p>
                  {cert.credentialId && (
                    <p className="text-xs text-slate-400 mt-2">
                      ID: {cert.credentialId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
