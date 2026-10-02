/**
 * @file main.ts
 * @purpose Bootstrap da landing page: injeta metadados do build e (nas próximas etapas)
 *          registra os componentes e carrega as demos sob demanda.
 * @techniques Injeção de constantes em build-time (`__TS_VERSION__` via define do Vite);
 *            guard de null sem `!` (noUncheckedIndexedAccess).
 * @usedBy index.html.
 */

// ---------------------------------------------------------------------------
// TODO(passo 2): substituir este acesso direto a `document` pelos helpers de
// core/dom.ts, conforme a regra de camadas ("document" só em core/dom.ts,
// components/ e init() das demos).
// ---------------------------------------------------------------------------
const versionTarget = document.getElementById('ts-version');
if (versionTarget !== null) {
  // `__TS_VERSION__` é substituída em build-time pela versão REAL instalada (ver vite.config.ts).
  versionTarget.textContent = `TypeScript ${__TS_VERSION__}`;
}
