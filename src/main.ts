/**
 * @file main.ts
 * @purpose Bootstrap da landing page: registra os custom elements, injeta metadados do
 *          build e monta cada demo SOB DEMANDA (IntersectionObserver + import dinâmico).
 * @techniques Import dinâmico tipado (loaders do demo-registry); IntersectionObserver;
 *            match de Result para falhas de carga; h() com custom elements (declaration merging).
 * @usedBy index.html.
 */
import { CodePeek, TAG_CODE_PEEK } from '@/components/code-peek';
import { DemoSection, TAG_DEMO_SECTION } from '@/components/demo-section';
import { ErrorShowcase, TAG_ERROR_SHOWCASE } from '@/components/error-showcase';
import { LangToggle, TAG_LANG_TOGGLE } from '@/components/lang-toggle';
import { ThemeToggle, TAG_THEME_TOGGLE } from '@/components/theme-toggle';
import { h, qs, qsa } from '@/core/dom';
import { loadDemo, registerDemo, type Cleanup, type DemoEntry } from '@/core/demo-registry';
import { translate } from '@/core/i18n';
import { match } from '@/core/result';
import { schedulePerFrame } from '@/core/scheduler';

// ---------------------------------------------------------------------------
// Registro dos custom elements
// ---------------------------------------------------------------------------

// O guard com customElements.get evita o erro "already defined" no HMR do dev.
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

// ---------------------------------------------------------------------------
// Registro das 12 demos — cada loader é um import dinâmico (chunk próprio, preguiçoso)
// ---------------------------------------------------------------------------

const demoEntries: readonly DemoEntry[] = [
  {
    id: '01',
    title: 'Inference and narrowing',
    load: () => import('@/demos/01-inference-and-narrowing'),
  },
  { id: '02', title: 'Generics with constraints', load: () => import('@/demos/02-generics') },
  { id: '03', title: 'Utility types in practice', load: () => import('@/demos/03-utility-types') },
  {
    id: '04',
    title: 'Discriminated unions and exhaustiveness',
    load: () => import('@/demos/04-discriminated-unions'),
  },
  {
    id: '05',
    title: 'Type guards and unknown',
    load: () => import('@/demos/05-type-guards-and-unknown'),
  },
  {
    id: '06',
    title: 'Mapped, conditional and template types',
    load: () => import('@/demos/06-mapped-conditional-template'),
  },
  {
    id: '07',
    title: 'Satisfies and as const',
    load: () => import('@/demos/07-satisfies-and-const'),
  },
  { id: '08', title: 'Branded types', load: () => import('@/demos/08-branded-types') },
  {
    id: '09',
    title: 'Result<T, E> and error handling',
    load: () => import('@/demos/09-result-error-handling'),
  },
  {
    id: '10',
    title: 'Typed DOM and events',
    load: () => import('@/demos/10-typed-dom-and-events'),
  },
  {
    id: '11',
    title: 'Async and typed HTTP',
    load: () => import('@/demos/11-async-and-typed-fetch'),
  },
  {
    id: '12',
    title: 'Compiler strictness',
    load: () => import('@/demos/12-tsconfig-strictness'),
  },
];

for (const entry of demoEntries) {
  registerDemo(entry);
}

// ---------------------------------------------------------------------------
// Montagem sob demanda
// ---------------------------------------------------------------------------

/** Cleanups das demos já montadas — despachadas no pagehide (nada fica pendurado). */
const activeCleanups = new Map<string, Cleanup>();

async function mountSlot(slot: HTMLElement): Promise<void> {
  const id = slot.getAttribute('data-demo') ?? '';

  // h('demo-section') devolve DemoSection graças ao declaration merging no componente.
  const section = h('demo-section');
  section.setAttribute('label-key', 'section.label');
  slot.replaceChildren(section);
  section.setStatus(translate('section.loading'));

  const result = await loadDemo(id, section.content);
  match(result, {
    ok: (cleanup) => {
      activeCleanups.set(id, cleanup);
      section.setStatus('');
    },
    err: (error) => {
      section.setStatus(`${translate('section.loadError')} [${error.code}]`);
    },
  });
}

function observeDemoSlots(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }
        observer.unobserve(entry.target);
        const slot = entry.target;
        if (slot instanceof HTMLElement) {
          // Um mount por frame: com scroll instantâneo o IO entrega os 12 slots no
          // MESMO task — montar tudo junto virava long task de ~1,7 s no Lighthouse
          // (ver core/scheduler.ts e a auditoria no README).
          schedulePerFrame(() => {
            void mountSlot(slot);
          });
        }
      }
    },
    // Carrega um pouco antes de a seção entrar na viewport (percepção de instantâneo).
    { rootMargin: '80px 0px' },
  );

  for (const slot of qsa<HTMLElement>('.demo-slot[data-demo]')) {
    observer.observe(slot);
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

// Acesso a DOM SOMENTE via core/dom.ts — regra de camadas do projeto.
const versionTarget = qs<HTMLElement>('#ts-version');
if (versionTarget !== null) {
  // `__TS_VERSION__` é substituída em build-time pela versão REAL instalada (ver vite.config.ts).
  versionTarget.textContent = `TypeScript ${__TS_VERSION__}`;
}

observeDemoSlots();

window.addEventListener('pagehide', () => {
  for (const cleanup of activeCleanups.values()) {
    cleanup();
  }
  activeCleanups.clear();
});
