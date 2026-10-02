/**
 * @file i18n.ts
 * @purpose Dicionário tipado de traduções (en-US ⇄ pt-BR) e estado global do idioma — puro, sem DOM.
 * @techniques `as const`; keyof typeof para derivar a união de chaves; Record completo
 *            (falta de tradução = erro de compilação); satisfies; event bus tipado.
 * @usedBy components/lang-toggle.ts (aplica no DOM), components/* (textos dinâmicos),
 *          index.html (atributos data-i18n).
 */

import { createEventBus, type Unsubscribe } from './event-bus';

/** Idioma padrão da página: en-US (requisito do projeto). */
export type Language = 'en-US' | 'pt-BR';

export const DEFAULT_LANGUAGE: Language = 'en-US';

/**
 * Fonte de verdade das chaves: `keyof typeof en` — adicionar uma chave em `en` exige
 * tradução em `ptBr` (annotação `Record<TranslationKey, string>`), e vice-versa.
 */
const en = {
  // --- Documento / navegação ---
  'meta.title': 'Perfect TypeScript Example — TypeScript techniques, demonstrated',
  'meta.description':
    'Twelve interactive demonstrations of advanced TypeScript techniques — strict compiler, runtime-tested, zero runtime dependencies.',
  'skip.toMain': 'Skip to main content',
  'nav.sections': 'Demonstrations',
  'nav.s01': 'Inference',
  'nav.s02': 'Generics',
  'nav.s03': 'Utilities',
  'nav.s04': 'Unions',
  'nav.s05': 'Guards',
  'nav.s06': 'Routes',
  'nav.s07': 'Satisfies',
  'nav.s08': 'Branded',
  'nav.s09': 'Result',
  'nav.s10': 'Typed DOM',
  'nav.s11': 'Fetch',
  'nav.s12': 'Strictness',

  // --- Hero ---
  'hero.title': 'Perfect TypeScript Example',
  'hero.lead':
    'Twelve interactive demonstrations of advanced TypeScript techniques — every claim on this page is backed by the strict compiler and the test suite. Read the code, open the repository, run the checks.',
  'hero.pillStrict': 'Strict compiler, zero any',
  'hero.pillZero': 'Zero runtime dependencies',
  'hero.pillTooling': 'Vite + Vitest + ESLint',
  'hero.compiledWith': 'This page is compiled with',
  'hero.author':
    'By Sandro — fullstack developer and entrepreneur building SaaS products in Brazil.',
  'hero.linksLabel': 'Author links',

  // --- Moldura das demos ---
  'slot.loading': 'This interactive demo initializes when the section enters the viewport.',
  'section.loading': 'Loading demonstration…',
  'section.loadError': 'This demonstration failed to load.',
  'section.label': 'Interactive demonstration',

  // --- Seções 01–12 ---
  'demo01.title': 'Inference and narrowing',
  'demo01.summary':
    'The compiler infers literal types and narrows unions through runtime guards. Type into the field below and see which branch of typeof / in / instanceof was taken.',
  'demo02.title': 'Generics with constraints',
  'demo02.summary':
    'Reusable utilities — pipe, groupBy and a typed store — built with constraints, defaults and const type parameters. Transform a list and inspect the result type.',
  'demo03.title': 'Utility types in practice',
  'demo03.summary':
    'One User type derives an entire form model: Partial, Required, Pick, Omit, Record, Extract, ReturnType, Parameters and Awaited from a single source of truth.',
  'demo04.title': 'Discriminated unions and exhaustiveness',
  'demo04.summary':
    'A request state machine (idle, loading, success, error) rendered by an exhaustive switch. Add an unhandled state and the compiler refuses to build.',
  'demo05.title': 'Type guards and unknown',
  'demo05.summary':
    'Paste raw JSON and watch hand-written type predicates turn unknown into a validated shape — with errors listed per path. See why unknown beats any.',
  'demo06.title': 'Mapped, conditional and template types',
  'demo06.summary':
    'A typed route parser: "/users/:id" becomes { id: string } through infer, key remapping and template literal types. Type a route and see the extracted params.',
  'demo07.title': 'Satisfies and as const',
  'demo07.summary':
    'Theme configuration validated with satisfies while keeping literal types intact — compared side by side with plain type annotations and assertions.',
  'demo08.title': 'Branded types',
  'demo08.summary':
    'UserId, OrderId and Money are nominally distinct — mixing them is a compile error. Try the cross-use below and read the real error emitted by the compiler.',
  'demo09.title': 'Result<T, E> and error handling',
  'demo09.summary':
    'A value parser returns ok/err instead of throwing. Follow the success and failure flows and compare them with classic try/catch.',
  'demo10.title': 'Typed DOM and events',
  'demo10.summary':
    'Generic query helpers, a typed event bus with an event map, function overloads and a custom element registered on HTMLElementTagNameMap.',
  'demo11.title': 'Async and typed HTTP',
  'demo11.summary':
    'fetchJson<T> with runtime validation, AbortController, timeout and retry — exercised against a local JSON file, no external network.',
  'demo12.title': 'Compiler strictness',
  'demo12.summary':
    'Every tsconfig flag explained with the real error it prevents, a live example and a cost/benefit table. Rigor you can read in the config.',

  // --- Rodapé ---
  'footer.tagline':
    'Sandro, fullstack developer and entrepreneur building SaaS products in Brazil.',
  'footer.note':
    '100% TypeScript, zero runtime dependencies, validated by the compiler and the test suite.',
  'footer.linksLabel': 'Footer links',

  // --- <code-peek> ---
  'code.expand': 'View source',
  'code.collapse': 'Hide source',
  'code.copy': 'Copy',
  'code.copied': 'Copied to clipboard',
  'code.copyFailed': 'Copy failed — select the code manually',
  'code.loading': 'Loading source…',
  'code.loadError': 'Source file unavailable in this build.',
  'code.regionLabel': 'Source code',

  // --- <error-showcase> ---
  'errors.title': 'What the compiler refuses',
  'errors.intro':
    'Each card pairs a @ts-expect-error directive with the real error it suppresses. The build fails if the error ever disappears — so these examples never go stale.',
  'errors.expected': 'Expected error',

  // --- Tema ---
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',
  'theme.group': 'Color theme',
} as const;

export type TranslationKey = keyof typeof en;

/**
 * `satisfies` valida SEM anotar o tipo: faltar uma chave em `ptBr` é erro de compilação
 * (Record exige todas as chaves de TranslationKey), e chave extra também é rejeitada.
 */
const ptBr = {
  // --- Documento / navegação ---
  'meta.title': 'Perfect TypeScript Example — Técnicas de TypeScript, demonstradas',
  'meta.description':
    'Doze demonstrações interativas de técnicas avançadas de TypeScript — compilador estrito, validadas por testes, sem dependências de runtime.',
  'skip.toMain': 'Pular para o conteúdo principal',
  'nav.sections': 'Demonstrações',
  'nav.s01': 'Inferência',
  'nav.s02': 'Genéricos',
  'nav.s03': 'Utilitários',
  'nav.s04': 'Uniões',
  'nav.s05': 'Guards',
  'nav.s06': 'Rotas',
  'nav.s07': 'Satisfies',
  'nav.s08': 'Branded',
  'nav.s09': 'Result',
  'nav.s10': 'DOM tipado',
  'nav.s11': 'Fetch',
  'nav.s12': 'Rigor',

  // --- Hero ---
  'hero.title': 'Perfect TypeScript Example',
  'hero.lead':
    'Doze demonstrações interativas de técnicas avançadas de TypeScript — cada afirmação nesta página é sustentada pelo compilador estrito e pela suíte de testes. Leia o código, abra o repositório, rode as verificações.',
  'hero.pillStrict': 'Compilador estrito, zero any',
  'hero.pillZero': 'Zero dependências de runtime',
  'hero.pillTooling': 'Vite + Vitest + ESLint',
  'hero.compiledWith': 'Esta página é compilada com',
  'hero.author':
    'Por Sandro — desenvolvedor fullstack e empreendedor, construindo produtos SaaS no Brasil.',
  'hero.linksLabel': 'Links do autor',

  // --- Moldura das demos ---
  'slot.loading': 'Esta demonstração interativa é inicializada quando a seção entra na viewport.',
  'section.loading': 'Carregando demonstração…',
  'section.loadError': 'Esta demonstração falhou ao carregar.',
  'section.label': 'Demonstração interativa',

  // --- Seções 01–12 ---
  'demo01.title': 'Inferência e narrowing',
  'demo01.summary':
    'O compilador infere tipos literais e restringe uniões através de guards em runtime. Digite no campo abaixo e veja qual ramo do typeof / in / instanceof foi tomado.',
  'demo02.title': 'Genéricos com constraints',
  'demo02.summary':
    'Utilitários reutilizáveis — pipe, groupBy e um store tipado — com constraints, valores padrão e const type parameters. Transforme uma lista e inspecione o tipo resultante.',
  'demo03.title': 'Utility types na prática',
  'demo03.summary':
    'Um único tipo User deriva todo o modelo de formulário: Partial, Required, Pick, Omit, Record, Extract, ReturnType, Parameters e Awaited a partir de uma única fonte de verdade.',
  'demo04.title': 'Uniões discriminadas e exaustividade',
  'demo04.summary':
    'Máquina de estados de requisição (idle, loading, success, error) renderizada por um switch exaustivo. Adicione um estado não tratado e o compilador se recusa a compilar.',
  'demo05.title': 'Type guards e unknown',
  'demo05.summary':
    'Cole JSON bruto e veja type predicates escritos à mão transformarem unknown em uma forma validada — com erros listados por caminho. Descubra por que unknown vence any.',
  'demo06.title': 'Tipos mapeados, condicionais e template',
  'demo06.summary':
    'Parser de rotas tipado: "/users/:id" vira { id: string } via infer, key remapping e template literal types. Digite uma rota e veja os parâmetros extraídos.',
  'demo07.title': 'Satisfies e as const',
  'demo07.summary':
    'Configuração de tema validada com satisfies sem perder os tipos literais — comparada lado a lado com anotações de tipo e asserções.',
  'demo08.title': 'Branded types',
  'demo08.summary':
    'UserId, OrderId e Money são nominalmente distintos — misturá-los é erro de compilação. Tente o uso cruzado abaixo e leia o erro real emitido pelo compilador.',
  'demo09.title': 'Result<T, E> e tratamento de erros',
  'demo09.summary':
    'Parser de valores retorna ok/err em vez de lançar exceções. Siga os fluxos de sucesso e falha e compare com o try/catch clássico.',
  'demo10.title': 'DOM tipado e eventos',
  'demo10.summary':
    'Helpers de consulta genéricos, um event bus tipado com mapa de eventos, sobrecargas de função e um custom element registrado em HTMLElementTagNameMap.',
  'demo11.title': 'Async e HTTP tipado',
  'demo11.summary':
    'fetchJson<T> com validação em runtime, AbortController, timeout e retry — exercitado contra um arquivo JSON local, sem rede externa.',
  'demo12.title': 'Rigor do compilador',
  'demo12.summary':
    'Cada flag do tsconfig explicada com o erro real que evita, um exemplo ao vivo e uma tabela de custo/benefício. Rigor que se lê na configuração.',

  // --- Rodapé ---
  'footer.tagline':
    'Sandro, desenvolvedor fullstack e empreendedor, construindo produtos SaaS no Brasil.',
  'footer.note':
    '100% TypeScript, zero dependências de runtime, validado pelo compilador e pela suíte de testes.',
  'footer.linksLabel': 'Links do rodapé',

  // --- <code-peek> ---
  'code.expand': 'Ver código',
  'code.collapse': 'Ocultar código',
  'code.copy': 'Copiar',
  'code.copied': 'Copiado para a área de transferência',
  'code.copyFailed': 'Falha ao copiar — selecione o código manualmente',
  'code.loading': 'Carregando código…',
  'code.loadError': 'Arquivo de código indisponível nesta build.',
  'code.regionLabel': 'Código-fonte',

  // --- <error-showcase> ---
  'errors.title': 'O que o compilador recusa',
  'errors.intro':
    'Cada cartão pareia uma diretiva @ts-expect-error com o erro real que ela suprime. A build falha se o erro deixar de acontecer — por isso esses exemplos nunca ficam desatualizados.',
  'errors.expected': 'Erro esperado',

  // --- Tema ---
  'theme.light': 'Claro',
  'theme.dark': 'Escuro',
  'theme.system': 'Sistema',
  'theme.group': 'Tema de cores',
} satisfies Readonly<Record<TranslationKey, string>>;

export const translations: Readonly<Record<Language, Readonly<Record<TranslationKey, string>>>> = {
  'en-US': en,
  'pt-BR': ptBr,
};

/** Guard de type predicate: valida chaves vindas de atributos HTML (string → TranslationKey). */
export function isTranslationKey(key: string): key is TranslationKey {
  return key in en;
}

/** Estado atual do idioma (módulo puro — a aplicação no DOM fica em components/lang-toggle.ts). */
let currentLanguage: Language = DEFAULT_LANGUAGE;

/** Barramento do i18n: notifica os componentes quando o idioma muda (padrão: event bus tipado). */
const i18nEvents = createEventBus<{ languagechange: { language: Language } }>();

export function getLanguage(): Language {
  return currentLanguage;
}

/** Tradução usando o idioma ativo — o que os componentes chamam nos textos dinâmicos. */
export function translate(key: TranslationKey): string {
  return translations[currentLanguage][key];
}

/**
 * Troca o idioma global e notifica (via event bus tipado) para os componentes
 * re-renderizarem seus textos internos. Não toca em DOM — quem aplica no DOM é o
 * <lang-toggle> (regra de camadas: document só em dom.ts/components/demos).
 */
export function changeLanguage(language: Language): void {
  if (language === currentLanguage) {
    return;
  }
  currentLanguage = language;
  i18nEvents.emit('languagechange', { language });
}

export function onLanguageChange(handler: (payload: { language: Language }) => void): Unsubscribe {
  return i18nEvents.on('languagechange', handler);
}
