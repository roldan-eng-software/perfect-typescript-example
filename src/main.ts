/**
 * @file main.ts
 * @purpose Bootstrap da landing page: injeta metadados do build e, nas próximas etapas,
 *          registra componentes e carrega as demos sob demanda.
 * @techniques Injeção de constante em build-time (`__TS_VERSION__` via define do Vite);
 *            guard de null sem `!` (noUncheckedIndexedAccess).
 * @usedBy index.html.
 */
import { qs } from '@/core/dom';

// Acesso a DOM SOMENTE via core/dom.ts — regra de camadas do projeto.
const versionTarget = qs<HTMLElement>('#ts-version');
if (versionTarget !== null) {
  // `__TS_VERSION__` é substituída em build-time pela versão REAL instalada (ver vite.config.ts).
  versionTarget.textContent = `TypeScript ${__TS_VERSION__}`;
}

// TODO(passo 3): registrar <theme-toggle>, <lang-toggle> e o i18n (en-US ⇄ pt-BR).
// TODO(passo 4): montar as seções e carregar cada demo via demo-registry (import dinâmico).
