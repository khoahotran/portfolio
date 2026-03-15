import { Mail, Linkedin, Github, MapPin } from 'lucide-react';
import { contactData } from '../data/portfolioData';

export default function Contact() {
  return (
    <section id="contact" className="py-24 px-6 bg-white">
      <div className="max-w-5xl mx-auto text-center font-light">
        <h2 className="text-sm uppercase tracking-widest text-teal-600 mb-6 font-medium italic">
          {contactData.title}
        </h2>
        <h3 className="text-4xl md:text-5xl text-slate-900 font-bold mb-8">
          {contactData.headline}
        </h3>
        <p className="text-lg text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
          {contactData.description}
        </p>

        <div className="flex flex-wrap justify-center gap-6 mb-20">
          <a
            href={`mailto:${contactData.email}`}
            className="flex items-center gap-2 px-8 py-4 bg-teal-600 text-white rounded-full font-medium hover:bg-slate-900 transition-all shadow-lg shadow-teal-100 hover:shadow-none translate-y-0 hover:-translate-y-1"
          >
            <Mail size={18} />
            <span>Say Hello</span>
          </a>
          <a
            href={contactData.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-4 border border-slate-200 text-slate-600 rounded-full font-medium hover:border-teal-500 hover:text-teal-600 transition-all translate-y-0 hover:-translate-y-1"
          >
            <Linkedin size={18} />
            <span>LinkedIn</span>
          </a>
          <a
            href={contactData.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-4 border border-slate-200 text-slate-600 rounded-full font-medium hover:border-teal-500 hover:text-teal-600 transition-all translate-y-0 hover:-translate-y-1"
          >
            <Github size={18} />
            <span>GitHub</span>
          </a>
        </div>

        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium tracking-wide">
          <MapPin size={14} className="text-teal-500" />
          <span>{contactData.location}</span>
        </div>

        <footer className="mt-20 pt-12 border-t border-slate-50">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            (c) {new Date().getFullYear()} Trần Nguyễn Anh Khoa
          </p>
          <p className="text-[10px] text-slate-300 mt-2 uppercase tracking-tighter">
            STUDENT @ HCMUT • FULL-STACK DEVELOPER
          </p>
        </footer>
      </div>
    </section>
  );
}

