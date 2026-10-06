import{j as e,u as d}from"./index-Cc5lJv14.js";import{r as o,b as g,L as m}from"./vendor-react-DySwiC3i.js";import{r as h}from"./mermaid-BYa517Of.js";function p({chart:i,onRendered:n}){const s=o.useRef(null),a=o.useRef(n);return a.current=n,o.useEffect(()=>{const t=s.current;if(!t)return;let r=!1;return h(t,i,()=>r,l=>{var c;return(c=a.current)==null?void 0:c.call(a,l)}),()=>{r=!0}},[i]),e.jsx("div",{ref:s,className:"mermaid-diagram flex justify-center w-full","data-diagram":i})}const x=[{title:"The FinTech Architect",steps:[{label:"Core Banking",kind:"Flagship",to:"/projects/core-banking"},{label:"Atomic Financial Transactions in NoSQL",kind:"Deep Dive",to:"/system-design/atomic-financial-transactions-in-nosql"},{label:"Saga State Machine",kind:"Lab",to:"/labs/saga-state-machine"},{label:"DB Event Replay Benchmark",kind:"Benchmark",to:"/labs/db-event-replay-benchmark"}]},{title:"High-Performance Go Backend",steps:[{label:"Aegis",kind:"Flagship",to:"/projects/aegis"},{label:"gRPC Service Mesh in Go",kind:"Architecture Note",to:"/blog/grpc-service-mesh-in-go-aegis-architecture"},{label:"ADR: Tracing vs Metrics",kind:"ADR",to:"/research/adr-tracing-vs-metrics-in-microservices"},{label:"Designing a Global API Gateway",kind:"System Design",to:"/system-design/designing-a-global-api-gateway"},{label:"Rate Limiting Algorithms",kind:"Lab",to:"/labs/rate-limiting-algorithms"},{label:"Go vs TS Concurrency",kind:"Benchmark",to:"/labs/go-vs-ts-concurrency"}]},{title:"HFT Research Platform",steps:[{label:"QuantAlpha",kind:"Flagship",to:"/projects/quant-alpha"},{label:"Designing a Multi-Role HFT Research Platform",kind:"Architecture Note",to:"/blog/designing-a-multi-role-hft-research-platform"},{label:"Database Indexing: B-Tree vs BRIN",kind:"Research",to:"/research/database-indexing-btree-vs-brin-for-time-series"},{label:"Redis Streams vs BullMQ",kind:"Benchmark",to:"/labs/redis-vs-bullmq"}]}];function f(i,n){const s="http://www.w3.org/1999/xlink",a="/portfolio/";i.querySelectorAll("a").forEach(t=>{const r=t.getAttributeNS(s,"href")??t.getAttribute("href");!r||!r.startsWith("/")||(t.dataset.appPath=r,t.setAttributeNS(s,"xlink:href",`${a}${r.slice(1)}`))}),i.addEventListener("click",t=>{const r=t.target.closest("a"),l=r==null?void 0:r.dataset.appPath;l&&(t.preventDefault(),n(l))})}function P(){const i=g();return d({title:"Ecosystem Graph",description:"Interactive ecosystem graph of the portfolio."}),e.jsxs("main",{className:"mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24 animate-fade-in",children:[e.jsxs("header",{className:"mb-12 text-center",children:[e.jsx("h1",{className:"text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6",children:"Ecosystem Graph"}),e.jsx("p",{className:"text-lg text-slate-600 max-w-2xl mx-auto font-light",children:"A visual representation of how technologies, architectural concepts, and flagship projects interconnect across my engineering portfolio."})]}),e.jsxs("section",{className:"bg-surface p-4 md:p-8 rounded-3xl shadow-xl border border-slate-200 overflow-x-auto",children:[e.jsx("div",{className:"md:min-w-[800px]",children:e.jsx(p,{chart:`
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
  `,onRendered:s=>f(s,i)})}),e.jsx("p",{className:"mt-4 text-center text-xs text-slate-500",children:"Dark nodes link to their project page."})]}),e.jsxs("div",{className:"mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-sm",children:[e.jsxs("div",{className:"flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100",children:[e.jsx("div",{className:"w-4 h-4 bg-panel rounded-sm"}),e.jsx("span",{className:"font-semibold text-slate-700",children:"Flagship Projects"})]}),e.jsxs("div",{className:"flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100",children:[e.jsx("div",{className:"w-4 h-4 bg-teal-100 border border-teal-500 rounded-sm"}),e.jsx("span",{className:"font-semibold text-slate-700",children:"Core Technologies"})]}),e.jsxs("div",{className:"flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100",children:[e.jsx("div",{className:"w-4 h-4 bg-amber-100 border border-amber-500 rounded-full"}),e.jsx("span",{className:"font-semibold text-slate-700",children:"Architecture Concepts"})]})]}),e.jsxs("section",{className:"mt-16 max-w-4xl mx-auto",children:[e.jsx("h2",{className:"text-sm font-bold uppercase tracking-wider text-slate-900 mb-6 text-center",children:"Recommended Reading Paths"}),e.jsx("div",{className:"grid gap-6 md:grid-cols-2",children:x.map(s=>e.jsxs("div",{className:"rounded-2xl border border-slate-200 bg-surface p-6",children:[e.jsx("h3",{className:"mb-4 font-bold text-slate-900",children:s.title}),e.jsx("ol",{className:"space-y-3",children:s.steps.map((a,t)=>e.jsxs("li",{className:"flex items-start gap-3 text-sm",children:[e.jsx("span",{className:"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600",children:t+1}),e.jsxs(m,{to:a.to,className:"min-w-0 flex-1 group",children:[e.jsx("span",{className:"mr-1.5 text-[10px] font-bold uppercase tracking-widest text-teal-700",children:a.kind}),e.jsx("span",{className:"text-slate-700 group-hover:text-teal-700 group-hover:underline",children:a.label})]})]},a.to))})]},s.title))})]})]})}export{P as default};
