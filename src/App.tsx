import { lazy, Suspense } from 'react';
import Hero from './components/Hero';

// Lazy load non-critical sections
const About = lazy(() => import('./components/About'));
// const Metrics = lazy(() => import('./components/Metrics'));
// const Philosophy = lazy(() => import('./components/Philosophy'));
const Experience = lazy(() => import('./components/Experience'));
const Projects = lazy(() => import('./components/Projects'));
// const Architecture = lazy(() => import('./components/Architecture'));
// const Credibility = lazy(() => import('./components/Credibility'));
const Skills = lazy(() => import('./components/Skills'));
const Education = lazy(() => import('./components/Education'));
const Certifications = lazy(() => import('./components/Certifications'));
const Contact = lazy(() => import('./components/Contact'));

// Loading fallback
const SectionLoader = () => (
  <div className="py-24 px-6 flex justify-center items-center">
    <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <Suspense fallback={<SectionLoader />}>
        <About />
        {/* <Metrics /> */}
        {/* <Philosophy /> */}
        <Experience />
        <Projects />
        {/* <Architecture /> */}
        {/* <Credibility /> */}
        <Skills />
        <Education />
        <Certifications />
        <Contact />
      </Suspense>
    </div>
  );
}

export default App;


