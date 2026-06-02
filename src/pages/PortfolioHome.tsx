import { Link } from 'react-router-dom';
import { useSeo } from '../seo/useSeo';
import Hero from '../components/Hero';
import About from '../components/About';
import Experience from '../components/Experience';
import Projects from '../components/Projects';
import Skills from '../components/Skills';
import Education from '../components/Education';
import Certifications from '../components/Certifications';
import Contact from '../components/Contact';

function PortfolioHome() {
  useSeo({
    title: 'Trần Nguyễn Anh Khoa - Software Engineer Portfolio',
    description:
      'Backend systems developer portfolio, featuring architecture case studies, event-driven banking systems, and technical experiments.',
  });

  return (
    <main>
      <Hero />
      <About />
      <Experience />
      <Projects />
      <Skills />
      <Education />
      <Certifications />

      {/* Engineering Lab Section */}
      <section id="engineering-lab" className="py-24 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto text-center font-light">
          <h2 className="text-sm uppercase tracking-widest text-teal-600 mb-6 font-medium italic">
            / Engineering Lab
          </h2>
          <h3 className="text-4xl md:text-5xl text-slate-900 font-bold mb-8">
            Technical Writing & Simulators
          </h3>
          <p className="text-lg text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            Explore my engineering blog posts, detailed system design research, and interactive simulators.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/blog"
              className="px-8 py-3 rounded-full bg-slate-900 text-white font-semibold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all hover:-translate-y-0.5"
            >
              Blog
            </Link>
            <Link
              to="/research"
              className="px-8 py-3 rounded-full border border-slate-200 text-slate-900 hover:border-teal-600 hover:text-teal-600 transition-colors"
            >
              Research
            </Link>
            <Link
              to="/experiments"
              className="px-8 py-3 rounded-full border border-slate-200 text-slate-900 hover:border-teal-600 hover:text-teal-600 transition-colors"
            >
              Experiments
            </Link>
            <Link
              to="/system-design"
              className="px-8 py-3 rounded-full border border-slate-200 text-slate-900 hover:border-teal-600 hover:text-teal-600 transition-colors"
            >
              System Design
            </Link>
          </div>
        </div>
      </section>

      <Contact />
    </main>
  );
}

export default PortfolioHome;
