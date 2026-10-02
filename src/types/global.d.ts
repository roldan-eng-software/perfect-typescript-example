/**
 * @file global.d.ts
 * @purpose Declarações globais compartilhadas por todo o app: a versão do TypeScript
 *          injetada pelo Vite no build e os módulos `?raw` usados pelo <code-peek>.
 * @techniques Declaration merging (variável global de build); referência de tipos do
 *            Vite que declara `declare module '*?raw'` e tipa `import.meta.glob`.
 * @usedBy src/main.ts (versão no hero), src/components/code-peek.ts (?raw).
 */

// Os tipos do cliente do Vite declaram `*?raw` (imports de código-fonte como string),
// `*.css`, `import.meta.env` e `import.meta.glob`. Referenciados aqui para que o
// tsconfig.json possa manter `types: []` (nenhum @types global automático).
/// <reference types="vite/client" />

// Injetada em tempo de build via `define` no vite.config.ts — não existe em runtime puro.
declare const __TS_VERSION__: string;
