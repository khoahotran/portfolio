import { Mail, Linkedin, Github, MapPin } from 'lucide-react';

const contactInfo = {
  email: 'your.email@example.com',
  linkedin: 'https://linkedin.com/in/yourprofile',
  github: 'https://github.com/yourprofile',
  location: 'San Francisco, CA',
};

export default function Contact() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-sm uppercase tracking-widest text-teal-600 mb-6 font-medium">
          Get In Touch
        </h2>
        <h3 className="text-3xl md:text-4xl text-slate-900 font-light mb-8">
          Let's build something amazing together
        </h3>
        <p className="text-lg text-slate-600 mb-12 max-w-2xl mx-auto">
          I'm always open to discussing new projects, creative ideas, or
          opportunities to be part of your vision.
        </p>

        <div className="flex flex-wrap justify-center gap-6 mb-16">
          <a
            href={`mailto:${contactInfo.email}`}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Mail size={20} />
            <span>Email Me</span>
          </a>
          <a
            href={contactInfo.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:border-teal-600 hover:text-teal-600 transition-colors"
          >
            <Linkedin size={20} />
            <span>LinkedIn</span>
          </a>
          <a
            href={contactInfo.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:border-teal-600 hover:text-teal-600 transition-colors"
          >
            <Github size={20} />
            <span>GitHub</span>
          </a>
        </div>

        <div className="flex items-center justify-center gap-2 text-slate-500">
          <MapPin size={16} />
          <span>{contactInfo.location}</span>
        </div>

        <footer className="mt-16 pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} Your Name. Built with React & TailwindCSS
          </p>
        </footer>
      </div>
    </section>
  );
}
