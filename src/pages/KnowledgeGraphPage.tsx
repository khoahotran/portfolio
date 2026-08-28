import { Link, useNavigate, type NavigateFunction } from 'react-router-dom';
import MermaidDiagram from '../components/content/MermaidDiagram';
import { useSeo } from '../seo/useSeo';

/**
 * Reading paths from `.ai/knowledge-graph.md` ("Recommended Reading Paths"),
 * kept as plain in-app links here as the reliable fallback next-action for
 * this page — independent of whether the diagram's node-click wiring below
 * works in a given browser. Each `to` is verified to resolve to a real route.
 */
const READING_PATHS = [
  {
    title: 'The FinTech Architect',
    steps: [
      { label: 'Core Banking', kind: 'Flagship', to: '/projects/core-banking' },
      { label: 'Atomic Financial Transactions in NoSQL', kind: 'Deep Dive', to: '/system-design/atomic-financial-transactions-in-nosql' },
      { label: 'Saga State Machine', kind: 'Lab', to: '/labs/saga-state-machine' },
      { label: 'DB Event Replay Benchmark', kind: 'Benchmark', to: '/labs/db-event-replay-benchmark' },
    ],
  },
  {
    title: 'High-Performance Go Backend',
    steps: [
      { label: 'Aegis', kind: 'Flagship', to: '/projects/aegis' },
      { label: 'gRPC Service Mesh in Go', kind: 'Architecture Note', to: '/blog/grpc-service-mesh-in-go-aegis-architecture' },
      { label: 'ADR: Tracing vs Metrics', kind: 'ADR', to: '/research/adr-tracing-vs-metrics-in-microservices' },
      { label: 'Designing a Global API Gateway', kind: 'System Design', to: '/system-design/designing-a-global-api-gateway' },
      { label: 'Rate Limiting Algorithms', kind: 'Lab', to: '/labs/rate-limiting-algorithms' },
      { label: 'Go vs TS Concurrency', kind: 'Benchmark', to: '/labs/go-vs-ts-concurrency' },
    ],
  },
  // QuantAlpha and PFM had graph nodes but no reading path at all — this closes that gap for
  // QuantAlpha specifically (added alongside the Phase 5 §5.4 database-indexing article, which
  // gave it its first research-depth piece beyond the flagship page and the HFT signal article).
  {
    title: 'HFT Research Platform',
    steps: [
      { label: 'QuantAlpha', kind: 'Flagship', to: '/projects/quant-alpha' },
      { label: 'Designing a Multi-Role HFT Research Platform', kind: 'Architecture Note', to: '/blog/designing-a-multi-role-hft-research-platform' },
      { label: 'Database Indexing: B-Tree vs BRIN', kind: 'Research', to: '/research/database-indexing-btree-vs-brin-for-time-series' },
      { label: 'Redis Streams vs BullMQ', kind: 'Benchmark', to: '/labs/redis-vs-bullmq' },
    ],
  },
];

/**
 * Wires the diagram's `click <nodeId> href "/path" "_self"` anchors (see the
 * `click` lines in graphDefinition below) to client-side navigation instead
 * of a full page reload. Mermaid emits these as real SVG `<a>` elements using
 * `xlink:href` (not `href`) — confirmed against the rendered output, not
 * assumed. Same convention as MarkdownContent's normalizeLinks/handleLinkClick:
 * the visible href is rewritten to include the app's base path (correct
 * without JS / on view-source), while the original app-relative path is
 * kept in a data attribute for `navigate()` so it isn't double-prefixed.
 */
function wireGraphLinks(container: HTMLElement, navigate: NavigateFunction) {
  const XLINK = 'http://www.w3.org/1999/xlink';
  const base = import.meta.env.BASE_URL;

  container.querySelectorAll<SVGAElement>('a').forEach((anchor) => {
    const appPath = anchor.getAttributeNS(XLINK, 'href') ?? anchor.getAttribute('href');
    if (!appPath || !appPath.startsWith('/')) {
      return;
    }

    (anchor as unknown as HTMLElement).dataset.appPath = appPath;
    anchor.setAttributeNS(XLINK, 'xlink:href', `${base}${appPath.slice(1)}`);
  });

  container.addEventListener('click', (event) => {
    const anchor = (event.target as Element).closest('a') as (SVGAElement & HTMLElement) | null;
    const appPath = anchor?.dataset.appPath;
    if (!appPath) {
      return;
    }

    event.preventDefault();
    navigate(appPath);
  });
}

function KnowledgeGraphPage() {
  const navigate = useNavigate();

  useSeo({ title: 'Ecosystem Graph', description: 'Interactive ecosystem graph of the portfolio.' });

  // Scoped to the flagship projects (content/projects/*.md — see .ai/flagship-projects.md) —
  // SeensioGO and Jujuja were previously drawn here as project nodes
  // identical in style to Aegis/Core Banking/QuantAlpha, but neither has a
  // content/projects/ page; they're covered via blog/system-design articles
  // instead. Drawing them as flagship projects overstated what exists. Every
  // edge below is cross-checked against .ai/flagship-projects.md and each
  // project's own frontmatter tags, not carried over from the previous version.
  //
  // The three `click` lines make the flagship nodes navigate to their project
  // pages (wired to client-side routing by wireGraphLinks above) — this used
  // to be a diagram with zero links anywhere on the page.
  const graphDefinition = `
graph TD
    %% Styling
    classDef domain fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px,color:#334155,font-weight:bold;
    classDef project fill:#0f172a,stroke:#334155,stroke-width:2px,color:#f8fafc,font-weight:bold;
    classDef tech fill:#ccfbf1,stroke:#14b8a6,stroke-width:1px,color:#0f766e;
    classDef concept fill:#fef3c7,stroke:#f59e0b,stroke-width:1px,color:#b45309;

    %% Domains
    subgraph D_Systems [Distributed Systems]
        P_Aegis(Aegis Auth Platform):::project
        P_Banking(Core Banking):::project
    end

    subgraph D_Data [Data & ML]
        P_Quant(QuantAlpha HFT):::project
    end

    subgraph D_Fintech [Personal Finance]
        P_PFM(PFM):::project
    end

    %% Technologies
    T_Go[Go / Golang]:::tech
    T_Python[Python]:::tech
    T_Kafka[Kafka / Redpanda]:::tech
    T_Redis[Redis Streams]:::tech
    T_Postgres[PostgreSQL]:::tech
    T_Firestore[Firestore]:::tech
    T_NextJS[Next.js / Server Actions]:::tech

    %% Concepts
    C_EventSourcing((Event Sourcing)):::concept
    C_CQRS((CQRS)):::concept
    C_Saga((Saga Pattern)):::concept
    C_RBAC((RBAC)):::concept
    C_Microservices((Microservices)):::concept
    C_PBAC((PBAC)):::concept
    C_APIGateway((API Gateway / Rate Limiting)):::concept
    C_Observability((Observability)):::concept

    %% Relationships - Tech to Projects
    T_Go --> P_Aegis
    T_Go --> P_Banking
    T_Go --> P_Quant
    T_Python --> P_Quant

    T_Kafka --> P_Aegis
    T_Redis --> P_Aegis
    T_Redis --> P_Quant

    T_Postgres --> P_Aegis
    T_Postgres --> P_Quant
    T_Postgres --> P_PFM
    T_Firestore --> P_Banking
    T_Redis --> P_PFM
    T_NextJS --> P_PFM

    %% Relationships - Concepts to Projects
    C_EventSourcing -.-> P_Banking
    C_CQRS -.-> P_Banking
    C_Saga -.-> P_Banking

    C_RBAC -.-> P_Aegis
    C_Microservices -.-> P_Aegis
    C_CQRS -.-> P_Aegis
    C_PBAC -.-> P_PFM
    C_APIGateway -.-> P_Aegis
    C_Observability -.-> P_Aegis

    %% Click-through to the flagship project pages
    click P_Aegis href "/projects/aegis" "_self"
    click P_Banking href "/projects/core-banking" "_self"
    click P_Quant href "/projects/quant-alpha" "_self"
    click P_PFM href "/projects/pfm" "_self"
  `;

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24 animate-fade-in">
      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">Ecosystem Graph</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto font-light">
          A visual representation of how technologies, architectural concepts, and flagship projects interconnect across my engineering portfolio.
        </p>
      </header>

      <section className="bg-surface p-4 md:p-8 rounded-3xl shadow-xl border border-slate-200 overflow-x-auto">
        {/* The 800px floor only applies from md: up. Below that, the SVG scales down to fit the
            viewport via the `.mermaid-rendered svg { max-width: 100% }` rule in index.css instead
            of forcing a fixed-width diagram that leaves most of it permanently off-screen. */}
        <div className="md:min-w-[800px]">
          <MermaidDiagram
            chart={graphDefinition}
            onRendered={(container) => wireGraphLinks(container, navigate)}
          />
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Dark nodes link to their project page.
        </p>
      </section>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-sm">
        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
          {/* bg-panel, not bg-slate-900: this swatch has to keep matching the Mermaid node it
              describes, and Mermaid node colours come from a static classDef in the diagram source
              rather than from these tokens. An inverting swatch would stop matching in dark mode. */}
          <div className="w-4 h-4 bg-panel rounded-sm"></div>
          <span className="font-semibold text-slate-700">Flagship Projects</span>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="w-4 h-4 bg-teal-100 border border-teal-500 rounded-sm"></div>
          <span className="font-semibold text-slate-700">Core Technologies</span>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="w-4 h-4 bg-amber-100 border border-amber-500 rounded-full"></div>
          <span className="font-semibold text-slate-700">Architecture Concepts</span>
        </div>
      </div>

      <section className="mt-16 max-w-4xl mx-auto">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-6 text-center">
          Recommended Reading Paths
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {READING_PATHS.map((path) => (
            <div key={path.title} className="rounded-2xl border border-slate-200 bg-surface p-6">
              <h3 className="mb-4 font-bold text-slate-900">{path.title}</h3>
              <ol className="space-y-3">
                {path.steps.map((step, i) => (
                  <li key={step.to} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                      {i + 1}
                    </span>
                    <Link to={step.to} className="min-w-0 flex-1 group">
                      <span className="mr-1.5 text-[10px] font-bold uppercase tracking-widest text-teal-700">
                        {step.kind}
                      </span>
                      <span className="text-slate-700 group-hover:text-teal-700 group-hover:underline">
                        {step.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default KnowledgeGraphPage;
