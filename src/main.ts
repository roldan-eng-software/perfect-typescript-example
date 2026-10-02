/**
 * @file main.ts
 * @purpose Bootstrap da landing page: injeta metadados do build, registra os custom
 *          elements e (no passo 4) monta/carrega as demos sob demanda.
 * @techniques Injeção de constante em build-time (`__TS_VERSION__` via define do Vite);
 *            guard de null sem `!` (noUncheckedIndexedAccess).
 * @usedBy index.html.
 */
import { CodePeek, TAG_CODE_PEEK } from '@/components/code-peek';
import { DemoSection, TAG_DEMO_SECTION } from '@/components/demo-section';
import { ErrorShowcase, TAG_ERROR_SHOWCASE } from '@/components/error-showcase';
import { LangToggle, TAG_LANG_TOGGLE } from '@/components/lang-toggle';
import { ThemeToggle, TAG_THEME_TOGGLE } from '@/components/theme-toggle';
import { qs } from '@/core/dom';

// Registro dos custom elements. O guard com customElements.get evita o erro
// "already defined" quando o HMR do dev reexecuta este módulo.
function defineElement(name: string, constructor: CustomElementConstructor): void {
  if (customElements.get(name) === undefined) {
    customElements.define(name, constructor);
  }
}

defineElement(TAG_LANG_TOGGLE, LangToggle);
defineElement(TAG_THEME_TOGGLE, ThemeToggle);
defineElement(TAG_DEMO_SECTION, DemoSection);
defineElement(TAG_CODE_PEEK, CodePeek);
defineElement(TAG_ERROR_SHOWCASE, ErrorShowcase);

// Acesso a DOM SOMENTE via core/dom.ts — regra de camadas do projeto.
const versionTarget = qs<HTMLElement>('#ts-version');
if (versionTarget !== null) {
  // `__TS_VERSION__` é substituída em build-time pela versão REAL instalada (ver vite.config.ts).
  versionTarget.textContent = `TypeScript ${__TS_VERSION__}`;
}

// TODO(passo 4): para cada .demo-slot[data-demo], montar <demo-section>, chamar
// loadDemo() do demo-registry (import dinâmico) e agendar via IntersectionObserver.
