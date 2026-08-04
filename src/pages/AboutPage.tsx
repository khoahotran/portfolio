import { useSeo } from '../seo/useSeo';

function AboutPage() {
  useSeo({
    title: 'About - Engineering Philosophy & Journey',
    description: 'My engineering philosophy, career evolution, and future technical direction.',
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24 animate-fade-in">
      <header className="mb-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">About & Philosophy</h1>
        <p className="text-xl text-slate-600 leading-relaxed max-w-3xl font-light">
          I am a Backend Engineer focused on building distributed systems, event-driven architectures, and high-performance services. Here is how I think about software engineering.
        </p>
      </header>

      {/* Engineering Philosophy */}
      <section className="mb-24">
        <h2 className="text-sm font-bold uppercase tracking-widest text-teal-600 mb-8 border-b border-slate-200 pb-4">
          Engineering Philosophy
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-3">1. Boring Technology First</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              I prefer mature, well-understood tools (PostgreSQL, Go, Redis) over the latest hype. Innovation should happen in the business domain, not in fighting immature infrastructure. I only introduce complex patterns (like Event Sourcing or CQRS) when the domain complexity strictly demands it.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-3">2. Design for Failure</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Distributed systems fail constantly. Networks partition, nodes crash, and disks fill up. I design systems assuming that failures will happen. This means prioritizing retries, idempotency, circuit breakers, dead-letter queues, and graceful degradation from day one.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-3">3. Observability is a Feature</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Code is read much more often than it is written, and it is debugged even more often. I treat structured logging, distributed tracing (OpenTelemetry), and metrics as core product features, not afterthoughts. If a system fails in production, the logs should tell me exactly why.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-3">4. Optimize for Deletability</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Good architecture allows you to throw away components without rewriting the whole system. I use hexagonal architecture and domain-driven design to isolate business logic from infrastructure concerns, making the system easier to test, refactor, and eventually replace.
            </p>
          </div>
        </div>
      </section>

      {/* Career Evolution Timeline */}
      <section className="mb-24 relative">
        <h2 className="text-sm font-bold uppercase tracking-widest text-teal-600 mb-12 border-b border-slate-200 pb-4">
          Career & Technical Evolution
        </h2>
        
        <div className="absolute left-[15px] md:left-1/2 top-24 bottom-0 w-px bg-slate-200 md:-translate-x-1/2"></div>
        
        <div className="space-y-16">
          {/* Phase 3 */}
          <div className="relative flex flex-col md:flex-row items-center justify-between group">
            <div className="md:w-5/12 text-left md:text-right pl-12 md:pl-0 pr-0 md:pr-12 mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-slate-900">Distributed Systems & Staff-Level Thinking</h3>
              <p className="text-sm font-bold text-teal-600 my-1">Present</p>
              <p className="text-sm text-slate-600 mt-2">
                Transitioned to building high-throughput, event-driven architectures. Focused on HFT matching engines, CQRS, Saga patterns, and system reliability. Moving beyond "writing code" to defining architecture and mentoring.
              </p>
            </div>
            <div className="absolute left-0 md:left-1/2 w-8 h-8 rounded-full border-4 border-white bg-teal-500 shadow-md md:-translate-x-1/2 z-10 group-hover:scale-125 transition-transform"></div>
            <div className="md:w-5/12 pl-12 md:pl-12 w-full">
              <div className="bg-slate-900 p-4 rounded-xl text-xs font-mono text-slate-300">
                <span className="text-emerald-400">Stack:</span> Go, gRPC, Kafka, Redis Streams, OpenTelemetry, Event Sourcing
              </div>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="relative flex flex-col md:flex-row items-center justify-between group">
            <div className="md:w-5/12 order-2 md:order-1 pl-12 md:pl-12 w-full">
              <div className="bg-slate-900 p-4 rounded-xl text-xs font-mono text-slate-300">
                <span className="text-emerald-400">Stack:</span> NestJS, Firebase, Algolia, Next.js, GCP
              </div>
            </div>
            <div className="absolute left-0 md:left-1/2 w-8 h-8 rounded-full border-4 border-white bg-slate-300 shadow-md md:-translate-x-1/2 z-10 group-hover:scale-125 transition-transform group-hover:bg-teal-400"></div>
            <div className="md:w-5/12 order-1 md:order-2 text-left pl-12 md:pl-0 pr-0 md:pr-12 mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-slate-900">Production Backend Services</h3>
              <p className="text-sm font-bold text-slate-500 my-1">Mid-Level</p>
              <p className="text-sm text-slate-600 mt-2">
                Shifted focus entirely to the backend. Deployed production services for SeensioGO and Jujuja. Learned the hard lessons of API design, caching strategies, geo-search, and managing cloud infrastructure.
              </p>
            </div>
          </div>

          {/* Phase 1 */}
          <div className="relative flex flex-col md:flex-row items-center justify-between group">
            <div className="md:w-5/12 text-left md:text-right pl-12 md:pl-0 pr-0 md:pr-12 mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-slate-900">Full-Stack Foundations</h3>
              <p className="text-sm font-bold text-slate-500 my-1">Early Career</p>
              <p className="text-sm text-slate-600 mt-2">
                Started by building full-stack web applications. Learned the basics of MVC architecture, responsive UI, RESTful APIs, and working within agile teams.
              </p>
            </div>
            <div className="absolute left-0 md:left-1/2 w-8 h-8 rounded-full border-4 border-white bg-slate-200 shadow-md md:-translate-x-1/2 z-10 group-hover:scale-125 transition-transform group-hover:bg-teal-300"></div>
            <div className="md:w-5/12 pl-12 md:pl-12 w-full">
              <div className="bg-slate-900 p-4 rounded-xl text-xs font-mono text-slate-300">
                <span className="text-emerald-400">Stack:</span> React, TypeScript, Tailwind, Node.js, Express, MongoDB
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future Roadmap */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-teal-600 mb-8 border-b border-slate-200 pb-4">
          Future Technical Direction
        </h2>
        <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl">
          <p className="text-slate-300 leading-relaxed mb-6">
            Engineering is a continuous journey. While I am highly productive with Go and TypeScript, I am actively exploring the following areas to expand my architectural toolkit:
          </p>
          <ul className="space-y-4 font-mono text-sm">
            <li className="flex items-start gap-3">
              <span className="text-teal-400 mt-0.5">→</span>
              <div>
                <strong className="text-white">Rust for Systems Programming:</strong>
                <p className="text-slate-400 text-xs mt-1">Exploring memory safety without garbage collection for ultra-low latency components.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-teal-400 mt-0.5">→</span>
              <div>
                <strong className="text-white">eBPF and Kernel Observability:</strong>
                <p className="text-slate-400 text-xs mt-1">Diving deeper into networking and system performance tracing at the OS level.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-teal-400 mt-0.5">→</span>
              <div>
                <strong className="text-white">Distributed Consensus (Raft/Paxos):</strong>
                <p className="text-slate-400 text-xs mt-1">Moving beyond using distributed databases to understanding how they handle leader election internally.</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

    </main>
  );
}

export default AboutPage;
