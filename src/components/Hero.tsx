import { ChevronDown, Github, Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { heroData } from '../data/portfolioData';

export default function Hero() {
  const scrollToContent = () => {
    const aboutSection = document.getElementById('about');
    aboutSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-white text-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.05),transparent_25%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.05),transparent_25%)]" />
      <div className="relative text-center px-6 max-w-5xl mx-auto space-y-10">
        <div className="space-y-4 animate-fade-in">
          <p className="text-sm uppercase tracking-[0.35em] text-teal-600 font-medium">{heroData.role}</p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900">
            {heroData.name}
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 font-light max-w-3xl mx-auto">
            {heroData.tagline}
          </p>
          <p className="text-sm text-slate-500">{heroData.location}</p>
          <div className="flex items-center justify-center gap-6 pt-4 text-slate-400">
            <a href={`mailto:${heroData.email}`} aria-label="Email" className="hover:text-teal-600 transition-colors"><Mail size={24} /></a>
            <a href={heroData.github} aria-label="GitHub Profile" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 transition-colors"><Github size={24} /></a>
            <a href={heroData.linkedin} aria-label="LinkedIn Profile" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 transition-colors"><Linkedin size={24} /></a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-left">
          {heroData.stats.map((stat, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3 backdrop-blur-sm"
            >
              {stat.route ? (
                // `block` preserves the same layout the replaced <p> had (an <a> is
                // inline by default) — added only to avoid a layout shift, per the
                // instruction to change styling only where strictly required to make
                // the label clickable. No other visual change from the plain-text label.
                <Link to={stat.route} className="block text-xs uppercase tracking-wide text-slate-500">
                  {stat.label}
                </Link>
              ) : (
                <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
              )}
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="#projects"
            className="px-8 py-3 rounded-full bg-slate-900 text-white font-semibold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all hover:-translate-y-0.5"
          >
            View Projects
          </a>
          <a
            href="#contact"
            className="px-8 py-3 rounded-full border border-slate-200 text-slate-900 hover:border-teal-600 hover:text-teal-600 transition-colors"
          >
            Get in touch
          </a>
        </div>

        <button
          onClick={scrollToContent}
          className="animate-bounce-slow mt-8 text-slate-400 hover:text-teal-600 transition-colors"
          aria-label="Scroll to content"
        >
          <ChevronDown size={32} />
        </button>
      </div>
    </section>
  );
}
