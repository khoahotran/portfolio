const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/mermaid.core-CGaT_2qW.js","assets/index-DjrxkRUj.js","assets/vendor-react-BbYVll5d.js","assets/index-O4rSZjvc.css"])))=>i.map(i=>d[i]);
import{_ as c,j as e}from"./index-DjrxkRUj.js";import{r as n}from"./vendor-react-BbYVll5d.js";import{u as l}from"./useSeo-DlJHYNYy.js";function d({chart:r}){const t=n.useRef(null),a=n.useRef(!1);return n.useEffect(()=>{!r.trim()||!t.current||(a.current=!1,c(async()=>{const{default:s}=await import("./mermaid.core-CGaT_2qW.js").then(o=>o.bp);return{default:s}},__vite__mapDeps([0,1,2,3])).then(({default:s})=>{if(a.current)return;a.current=!0,s.initialize({startOnLoad:!1,theme:"neutral",fontFamily:"Inter, ui-sans-serif, system-ui, sans-serif",securityLevel:"loose",flowchart:{curve:"basis"}});const o=`mermaid-${Date.now()}-${Math.floor(Math.random()*1e3)}`;s.render(o,r).then(({svg:i})=>{t.current&&(t.current.innerHTML=i,t.current.classList.add("mermaid-rendered"))}).catch(i=>{console.error("Mermaid render error",i),t.current&&(t.current.innerHTML=`<pre class="mermaid-error text-xs text-rose-500 overflow-auto p-4 bg-rose-50 rounded-lg"><code>${r}</code></pre>`)})}))},[r]),e.jsx("div",{ref:t,className:"mermaid-diagram flex justify-center w-full","data-diagram":r})}function p(){return l({title:"Knowledge Graph",description:"Interactive ecosystem graph of the portfolio."}),e.jsxs("main",{className:"mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24 animate-fade-in",children:[e.jsxs("header",{className:"mb-12 text-center",children:[e.jsx("h1",{className:"text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6",children:"Ecosystem Graph"}),e.jsx("p",{className:"text-lg text-slate-600 max-w-2xl mx-auto font-light",children:"A visual representation of how technologies, architectural concepts, and flagship projects interconnect across my engineering portfolio."})]}),e.jsx("section",{className:"bg-white p-8 rounded-3xl shadow-xl border border-slate-200 overflow-x-auto",children:e.jsx("div",{className:"min-w-[800px]",children:e.jsx(d,{chart:`
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

    subgraph D_Product [Production Apps]
        P_Seensio(SeensioGO):::project
        P_Jujuja(Jujuja):::project
    end

    %% Technologies
    T_Go[Go / Golang]:::tech
    T_TS[TypeScript / Node]:::tech
    T_Kafka[Kafka / Redpanda]:::tech
    T_Redis[Redis Streams]:::tech
    T_Postgres[PostgreSQL]:::tech
    T_Firestore[Firestore]:::tech

    %% Concepts
    C_EventSourcing((Event Sourcing)):::concept
    C_CQRS((CQRS)):::concept
    C_Saga((Saga Pattern)):::concept
    C_RBAC((RBAC)):::concept
    C_Microservices((Microservices)):::concept

    %% Relationships - Tech to Projects
    T_Go --> P_Aegis
    T_Go --> P_Banking
    T_Go --> P_Quant
    T_TS --> P_Seensio
    T_TS --> P_Jujuja
    T_TS --> P_Quant

    T_Kafka --> P_Aegis
    T_Redis --> P_Aegis
    T_Redis --> P_Quant

    T_Postgres --> P_Aegis
    T_Postgres --> P_Quant
    T_Firestore --> P_Banking
    T_Firestore --> P_Seensio

    %% Relationships - Concepts to Projects
    C_EventSourcing -.-> P_Banking
    C_CQRS -.-> P_Banking
    C_Saga -.-> P_Banking
    
    C_RBAC -.-> P_Aegis
    C_Microservices -.-> P_Aegis
  `})})}),e.jsxs("div",{className:"mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-sm",children:[e.jsxs("div",{className:"flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100",children:[e.jsx("div",{className:"w-4 h-4 bg-slate-900 rounded-sm"}),e.jsx("span",{className:"font-semibold text-slate-700",children:"Flagship Projects"})]}),e.jsxs("div",{className:"flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100",children:[e.jsx("div",{className:"w-4 h-4 bg-teal-100 border border-teal-500 rounded-sm"}),e.jsx("span",{className:"font-semibold text-slate-700",children:"Core Technologies"})]}),e.jsxs("div",{className:"flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100",children:[e.jsx("div",{className:"w-4 h-4 bg-amber-100 border border-amber-500 rounded-full"}),e.jsx("span",{className:"font-semibold text-slate-700",children:"Architecture Concepts"})]})]})]})}export{p as default};
