import { ChevronDown } from 'lucide-react';

export default function Hero() {
  const scrollToContent = () => {
    const aboutSection = document.getElementById('about');
    aboutSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 relative">
      <div className="text-center px-6 max-w-4xl mx-auto">
        <h1 className="text-6xl md:text-7xl font-light text-slate-900 mb-6 tracking-tight animate-fade-in">
          Your Name
        </h1>
        <p className="text-2xl md:text-3xl text-slate-600 mb-4 font-light animate-fade-in-delay-1">
          Software Engineer & Creative Problem Solver
        </p>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-delay-2">
          Building elegant solutions that bridge technology and human needs
        </p>
        <button
          onClick={scrollToContent}
          className="animate-bounce-slow mt-8 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Scroll to content"
        >
          <ChevronDown size={32} />
        </button>
      </div>
    </section>
  );
}
