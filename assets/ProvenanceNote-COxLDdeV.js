import{c as t,g as d,j as e}from"./index-Cc5lJv14.js";import{A as l}from"./arrow-left-L7tjByvE.js";import{L as i}from"./vendor-react-DySwiC3i.js";import{P as o}from"./provenance-BbbQnBGu.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=t("AlertTriangle",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",key:"c3ski4"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=t("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=t("FlaskConical",[["path",{d:"M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2",key:"pzvekw"}],["path",{d:"M8.5 2h7",key:"csnxdl"}],["path",{d:"M7 16h10",key:"wp8him"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=t("Gauge",[["path",{d:"m12 14 4-4",key:"9kzdfg"}],["path",{d:"M3.34 19a10 10 0 1 1 17.32 0",key:"19p75a"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=t("HelpCircle",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",key:"1u773s"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);function N({labId:a}){var n;const s=d(a),r=(n=s==null?void 0:s.relatedArticle)!=null&&n.includes("/")?s.relatedArticle:`experiments/${s==null?void 0:s.relatedArticle}`;return e.jsxs("div",{className:"mb-4 flex flex-wrap items-center gap-2",children:[e.jsxs(i,{to:"/experiments",className:"btn-back",children:[e.jsx(l,{size:16,"aria-hidden":"true"}),"Back to Experiments"]}),(s==null?void 0:s.relatedArticle)&&e.jsxs(i,{to:`/${r}`,className:"btn-back !text-slate-500 hover:!text-slate-700",children:["Read the write-up",e.jsx(h,{size:16,"aria-hidden":"true"})]})]})}const k={implementation:{icon:p,surface:"border-emerald-200 bg-emerald-50",accent:"text-emerald-700"},measured:{icon:x,surface:"border-sky-200 bg-sky-50",accent:"text-sky-700"},model:{icon:u,surface:"border-amber-200 bg-amber-50",accent:"text-amber-700"},unverified:{icon:m,surface:"border-rose-200 bg-rose-50",accent:"text-rose-700"}};function f({provenance:a}){switch(a.kind){case"implementation":case"model":return e.jsx("p",{className:"break-words text-slate-700",children:a.basis});case"measured":return e.jsxs("div",{className:"space-y-1.5 break-words text-slate-700",children:[e.jsxs("p",{children:[e.jsx("span",{className:"font-semibold",children:"Environment:"})," ",a.environment]}),e.jsxs("p",{children:[e.jsx("span",{className:"font-semibold",children:"Measured:"})," ",a.measuredOn]}),a.harness&&e.jsxs("p",{children:[e.jsx("span",{className:"font-semibold",children:"Harness:"})," ",e.jsx("a",{href:a.harness,target:"_blank",rel:"noopener noreferrer",className:"underline decoration-sky-400 underline-offset-2 hover:text-sky-900",children:"reproduce this run"})]}),a.caveat&&e.jsxs("p",{className:"border-t border-sky-200 pt-1.5",children:[e.jsx("span",{className:"font-semibold",children:"Limits:"})," ",a.caveat]})]});case"unverified":return e.jsx("p",{className:"break-words text-slate-700",children:a.note})}}function w({labId:a}){var c;const s=(c=d(a))==null?void 0:c.provenance;if(!s)return null;const r=k[s.kind],n=r.icon;return e.jsxs("section",{"aria-label":"Data provenance",className:`mt-6 flex min-w-0 gap-3 rounded-xl border p-4 text-sm leading-relaxed ${r.surface}`,children:[e.jsx(n,{className:`mt-0.5 h-5 w-5 shrink-0 ${r.accent}`,"aria-hidden":"true"}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:`mb-1 text-[11px] font-bold uppercase tracking-widest ${r.accent}`,children:o[s.kind]}),e.jsx(f,{provenance:s})]})]})}export{h as A,x as G,N as L,w as P,m as a};
