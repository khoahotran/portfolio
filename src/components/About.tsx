export default function About() {
  return (
    <section id="about" className="py-24 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-sm uppercase tracking-widest text-teal-600 mb-8 font-medium italic">
          / Positioning
        </h2>
        <div className="grid md:grid-cols-[2fr,1fr] gap-12 items-start">
          <div>
            <p className="text-3xl md:text-4xl text-slate-900 font-bold leading-tight mb-8">
              Detail-oriented developer specializing in modern web and mobile technologies.
            </p>
            <div className="space-y-6 text-lg text-slate-600 leading-relaxed font-light">
              <p>
                I architect robust backend services, implement caching mechanisms, and deliver high-performance full-stack solutions with NestJS and Firebase.
              </p>
              <p>
                Focus areas: NestJS backend services, Firebase Functions, Firestore, Algolia search, and React/Angular frontends.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 space-y-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-4">Values</p>
              <ul className="space-y-3 text-slate-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-teal-500 font-bold">01</span>
                  <span>Modular, scalable backend services.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-500 font-bold">02</span>
                  <span>Fast, reliable APIs with caching and search.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-500 font-bold">03</span>
                  <span>Full-stack delivery across web and mobile clients.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
