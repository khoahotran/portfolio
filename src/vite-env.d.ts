/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VITALS_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// highlight.js ships types only at its package root; deep language imports
// (used in content-engine/markdown.ts to register a single extra grammar
// without pulling in lowlight's full `all` bundle) have no declaration file.
declare module 'highlight.js/lib/languages/protobuf' {
  import type { LanguageFn } from 'highlight.js';
  const protobuf: LanguageFn;
  export default protobuf;
}
