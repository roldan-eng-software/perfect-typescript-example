# Perfect TypeScript Example

[![Deploy](https://github.com/roldan-eng-software/perfect-typescript-example/actions/workflows/deploy.yml/badge.svg)](https://github.com/roldan-eng-software/perfect-typescript-example/actions/workflows/deploy.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-online-brightgreen)](https://roldan-eng-software.github.io/perfect-typescript-example/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-3178c6)](tsconfig.json)
[![Runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)](package.json)

> Landing page de portfólio com **12 demonstrações interativas** de TypeScript estrito —
> **sem frameworks** e **sem nenhuma dependência de runtime**. Cada afirmação da página é
> sustentada pelo compilador e pela suíte de testes.

**📦 Página publicada:** <https://roldan-eng-software.github.io/perfect-typescript-example/>
_(verificada com HTTP 200 no deploy do workflow `Deploy to GitHub Pages`)_

**Código:** <https://github.com/roldan-eng-software/perfect-typescript-example>

---

## O que este projeto demonstra

- **12 técnicas de TypeScript em demos navegáveis** — inferência e narrowing, genéricos,
  utility types, uniões discriminadas com exaustividade, type guards/`unknown`, tipos
  mapeados/condicionais/template literal, `satisfies`/`as const`, branded types,
  `Result<T, E>`, DOM e eventos tipados, `fetch` tipado com timeout/retry e o rigor do
  próprio `tsconfig.json`.
- **Código real, não cópia**: o painel "ver código" de cada seção carrega o arquivo do
  repositório via `import.meta.glob('?raw')` — o que você lê na página é o que está no repo.
- **O compilador como testemunha**: cada `<error-showcase>` mostra um arquivo
  `src/demos/errors/*.errors.ts` com diretivas `@ts-expect-error` — se o erro deixar de
  acontecer, o `tsc` acusa "unused directive" e a build **quebra**. Os exemplos nunca ficam
  desatualizados.
- **Verificação em dois níveis**: 43 testes de runtime (Vitest) + 9 testes de tipo
  (`expectTypeOf` e o helper `Expect<Equal<A, B>>`), tudo no script único `npm run check`.
- **Acessibilidade e i18n**: navegação por teclado, foco visível, contraste AA nos dois
  temas, `prefers-reduced-motion`, página em **en-US** com botão de tradução para
  **pt-BR** (dicionário tipado: faltar uma chave é erro de compilação).
- **Tema claro (padrão) / escuro / padrão do sistema**, sem flash ao carregar.

---

## Como rodar

```bash
npm install        # instala apenas devDependencies (zero runtime deps)
npm run dev        # servidor de desenvolvimento (Vite)
npm run check      # typecheck + lint + testes + testes de tipo + build
```

| Script               | O que faz                                                           |
| -------------------- | ------------------------------------------------------------------- |
| `npm run dev`        | Dev server com HMR                                                  |
| `npm run build`      | Build de produção em `dist/`                                        |
| `npm run preview`    | Serve o `dist/` localmente (mesmo base do GitHub Pages)             |
| `npm run typecheck`  | `tsc --noEmit` nos dois tsconfigs (app e config de build)           |
| `npm run lint`       | ESLint type-aware em modo estrito + regra de camadas                |
| `npm run format`     | Prettier em todo o repositório                                      |
| `npm run test`       | Testes de runtime (Vitest, ambiente Node)                           |
| `npm run test:types` | Testes de tipo (`vitest --typecheck --typecheck.only`)              |
| `npm run check`      | Os cinco em sequência: typecheck → lint → test → test:types → build |

---

## Decisões técnicas

### Por que TypeScript puro (sem React/Vue/Svelte)

O objetivo do projeto é demonstrar **o sistema de tipos**, não um framework. Com zero
frameworks:

- todo `div` da página passa por helpers tipados (`h('tag')` com `keyof HTMLElementTagNameMap`),
  então o DOM também é demonstração de tipos;
- o bundle inicial é minúsculo (≈ 10 kB de JS gzipado, medido no build) e não há hidden coupling entre
  versões de framework e versões de tipos;
- recrutador lê **TypeScript**, não boilerplate de framework.

### Por que Vite é só ferramenta de build

O Vite aparece apenas em `devDependencies` e nunca no bundle: ele resolve o alias `@/`,
injeta `__TS_VERSION__` no build (`vite.config.ts`), gera os chunks preguiçosos dos
`import()` dinâmicos e roda o Vitest. **Nenhum byte de Vite chega ao navegador** — em
runtime a página é HTML + CSS + o nosso TypeScript compilado.

### Por que `Result<T, E>` em vez de exceções

Falhas **esperadas** (JSON inválido, HTTP 404, demo que não carrega) são valores de
domínio: `Result` força o tratamento nos tipos (`match` exige os dois ramos) e a UI pode
mostrar o problema sem `try/catch` aninhado nem stack trace. Exceções ficam reservadas
para **falhas inesperadas** (bugs) — registro duplicado, `assertNever` violado
(`src/core/demo-registry.ts`, `src/utils/assert-never.ts`).

### Por que sem `enum` (e sem `namespace`)

`enum` gera objeto em runtime e permite reescrita de valores; a alternativa
**união de literais + `as const`** dá a mesma segurança com zero runtime e interoperidade
total com JSON. `namespace` só se mantém por questões legadas — `import`/`export` cobre o
caso. A comparação completa está na demo 12 (`SCOPE_NOTES`) e em
`TYPESCRIPT-TECHNIQUES.md`.

### Por que decorators e `using` ficaram de fora (verificado, não presumido)

- **Decorators padrão (stage 3):** o `tsc` 6.0.3 compila `ClassMethodDecoratorContext`
  sem flags, **mas** o pipeline do Vite 8 (Rolldown/oxc) emite `@decorator` **verbatim**
  no bundle com qualquer `target` (testado `es2017`–`es2022`) — o módulo falha com
  `Invalid or unexpected token` em Node 22 e no Edge. tsc sim, bundler não ⇒ fora.
- **`using` / `Disposable`:** com `lib: ES2023` o `tsc` acusa `TS2318`/`TS2550`
  (faltaria `ESNext.Disposable`) e o runtime dependeria de `Symbol.dispose` no navegador —
  suporte não garantido ⇒ fora.

Ambas as verificações estão documentadas em `src/demos/12-tsconfig-strictness.ts`
(`SCOPE_NOTES`) — a página mostra a evidência.

---

## Compatibilidade (verificada, não presumida)

| Item                  | Versão / política                                                                                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TypeScript**        | **6.0.x** (travado em `~6.0.3`). Motivo: o `typescript-eslint@8.71.0` exige peer `>=4.8.4 <6.1.0`; 7.x ainda não é suportado por ele. Todo o catálogo abaixo compila nesta versão (`npm run typecheck` = prova executável).                                                     |
| **Node.js**           | `>=22.12` (campo `engines`; exigência do Vite 8). CI usa Node 22.                                                                                                                                                                                                               |
| **Navegadores**       | Sintaxe entregue pelo pipeline default do Vite 8 sobre o alvo do projeto (`target: ES2023` no tsconfig). Smoke test executado no **Edge headless (Chromium)** — 12/12 demos montam, zero erros de console. Auditoria Lighthouse: **99/100/100/100** (ver seção própria abaixo). |
| **APIs de runtime**   | `custom elements`, `AbortController`, `IntersectionObserver`, `Intl`, `matchMedia`, `localStorage` (com `try/catch`), Clipboard API (com fallback de mensagem) — todas com suporte consolidado em motores atuais.                                                               |
| **Recursos recentes** | `satisfies`, `const` type parameters, key remapping, template literal types: **type-level puro** — compilam no 6.0.3 e não exigem nada do navegador. Decorators e `using`: excluídos (evidência acima).                                                                         |

> Não afirmamos versões mínimas históricas por recurso: o que se garante é que **o
> projeto inteiro compila e roda na versão documentada**, verificável com um comando.

---

## Auditoria (Lighthouse)

Medição no **site publicado** (reproduzível no `npm run preview`), Lighthouse 13.5.0
via Edge headless — **resultado estável: 4 de 4 rodadas consecutivas**:

| Performance | Acessibilidade | Best Practices |   SEO   |
| :---------: | :------------: | :------------: | :-----: |
|   **99**    |    **100**     |    **100**     | **100** |

- **confirmado no deploy publicado: 99/100/100/100 em duas rodadas seguidas (TBT 0 ms)**;
- TBT ≤ 40 ms no preview local (meta 95+ em todas as categorias: **batida com folga**);
- zero violações axe; CLS contido; página inteira percorrida no audit.

O caminho até 99 foi **medido, não chutado** — cada mudança teve antes/depois com
Lighthouse e trace de CPU/layout (`Tracing` via CDP):

1. removido `scroll-behavior: smooth` — animava os scrolls programáticos do audit (FCP 1,7 s → 1,1 s);
2. **CSS embutido no HTML** pelo plugin próprio `inlineStylesIntoHtml()` — o `<link>`
   render-blocking custava ~178 ms de desperdício;
3. **shells de `<code-peek>`/`<error-showcase>` adiados** via IntersectionObserver —
   24 construções no load viravam long tasks de ~460 ms;
4. `content-visibility: auto` **testado e removido**: piorou (style/layout 1754 → 2151 ms,
   porque o screenshot de página inteira do audit força a renderização de tudo);
5. `text-wrap: balance` **testado e removido** (re-quebra todos os títulos a cada layout);
6. `table-layout: fixed` + quebra de código — as 12 tabelas deixaram de disparar
   passagens de min/max-content em cada montagem;
7. **`core/scheduler.ts` (`schedulePerFrame`)** — o IntersectionObserver entrega os 12
   slots num único task quando o scroll é instantâneo; montar tudo junto gerava
   TBT intermitente de até **1670 ms**. Agora: um monte por frame;
8. margem de montagem `rootMargin` 300px → **80px** — nada abaixo da dobra monta na
   janela de medição do load (foi o que estabilizou 99/99/99/99).

Provas de que o ruído restante não é nosso: uma página **estática sem JS** no mesmo
servidor marcava 100 estável, e o profile sob throttle 4× mostra JS próprio < 50 ms.

## Técnica | Onde está | Por que usei | Suporte

Todos os itens do catálogo. "Suporte" = `TS 6.0.3 ✓` significa _compilado comprovadamente
pelo `npm run typecheck` deste repositório_.

### Tipos básicos e inferência

| Técnica               | Onde está                                                                   | Por que usei                                                                  | Suporte    |
| --------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- |
| Literais e inferência | `src/demos/01-inference-and-narrowing.ts` (`parseScalar`, `describeTypeof`) | Inferir primeiro, anotar só o necessário — a demo mostra o raciocínio ao vivo | TS 6.0.3 ✓ |
| `readonly`            | `src/core/result.ts`, `src/demos/01` (`QUEUE`)                              | Imutabilidade no contrato do tipo, não na boa vontade                         | TS 6.0.3 ✓ |
| `as const`            | `src/core/i18n.ts` (`en`), `src/demos/07` (`DEFAULT_THEME`)                 | Literais + deep readonly sem anotação manual                                  | TS 6.0.3 ✓ |
| Tuplas                | `tests/unit/store.test.ts` (`Array<[string, string]>`)                      | Posição carrega semântica (novo, anterior) — trocar ordem é erro de tipo      | TS 6.0.3 ✓ |
| Tuplas variádicas     | `src/demos/06-mapped-conditional-template.ts` (`First<T>`)                  | “primeiro elemento” de qualquer comprimento, sem listar os demais             | TS 6.0.3 ✓ |
| `unknown`             | `src/demos/05-type-guards-and-unknown.ts`, `src/components/code-peek.ts`    | JSON e código-fonte chegam sem forma — só validação narrow                    | TS 6.0.3 ✓ |
| `never`               | `src/utils/assert-never.ts`, `src/demos/04`                                 | Prova de exaustividade: o que sobra após todos os ramos                       | TS 6.0.3 ✓ |
| `void`                | `src/core/demo-registry.ts` (`Cleanup = () => void`)                        | Contrato “nada a devolver” no ciclo de vida das demos                         | TS 6.0.3 ✓ |

### Genéricos

| Técnica                 | Onde está                                                                                 | Por que usei                                                          | Suporte                                         |
| ----------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| Constraints (`extends`) | `core/dom.ts` (`qs<T extends Element>`), `demos/02` (`groupBy<K extends PropertyKey>`)    | Só tipos válidos passam; erros ficam na assinatura                    | TS 6.0.3 ✓                                      |
| Valores padrão          | `core/dom.ts` (`<T = Element>`)                                                           | Chamador só especifica o tipo quando o detalhe importa                | TS 6.0.3 ✓                                      |
| Múltiplos parâmetros    | `core/event-bus.ts` (`K` amarrado ao payload), `utils/type-assertions.ts` (`Equal<A, B>`) | Relacionar argumentos entre si (evento ↔ payload)                     | TS 6.0.3 ✓                                      |
| `const` type parameters | `src/demos/02-generics.ts` (`groupBy<T, const K>`)                                        | Chave infere como **literal** (`'even'\|'odd'`), não `string` largado | TS 6.0.3 ✓ (type-level, sem impacto de runtime) |

### Utility types

| Técnica                             | Onde está                                                                       | Por que usei                                                        | Suporte    |
| ----------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| `Partial` / `Required` / `Readonly` | `src/demos/03-utility-types.ts` (`UserPatch`, `UserRegistration`, `FrozenUser`) | Projeções de um único tipo `User` — fonte de verdade única          | TS 6.0.3 ✓ |
| `Pick` / `Omit`                     | `src/demos/03` (`UserFormFields`, `NewUser`), saída segura no form              | Formulário coleta só o que precisa; servidor não vê `id`/`password` | TS 6.0.3 ✓ |
| `Record`                            | `src/demos/03` (`UserLabels`), `src/demos/06` (`RouteParams`)                   | Mapa completo chave→valor sem erro de índice                        | TS 6.0.3 ✓ |
| `Extract` / `Exclude`               | `src/demos/03` (`AdminRole`, `RegularRole`)                                     | Fatiar uniões com precisão                                          | TS 6.0.3 ✓ |
| `NonNullable`                       | `src/demos/03` (`VerifiedEmail`)                                                | Eliminar nulos após validação                                       | TS 6.0.3 ✓ |
| `ReturnType` / `Parameters`         | `src/demos/03` (`CreateUserReturn`, `CreateUserInput`)                          | Derivar tipos da assinatura — muda a função, o tipo acompanha       | TS 6.0.3 ✓ |
| `Awaited`                           | `src/demos/03` (`SavedUser`), `src/demos/11` (`LoadProductsResult`)             | Tipo “depois do await”, derivado sem duplicar declaração            | TS 6.0.3 ✓ |
| `InstanceType`                      | `src/demos/10-typed-dom-and-events.ts` (`StatusPillElement`)                    | Tipo da instância a partir do construtor do custom element          | TS 6.0.3 ✓ |

### Tipos avançados

| Técnica                | Onde está                                                | Por que usei                                                                 | Suporte    |
| ---------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| Conditional types      | `src/utils/type-assertions.ts` (`Equal`), `src/demos/06` | Decidir tipo a partir de tipo — base dos testes de tipo e do parser de rotas | TS 6.0.3 ✓ |
| `infer`                | `src/demos/06` (`RouteParams`, `First<T>`)               | Extrair pedaços de um tipo (o nome do parâmetro da rota)                     | TS 6.0.3 ✓ |
| Mapped types           | `src/demos/06` (`Getters<T>`)                            | Transformar cada propriedade de um objeto em outro tipo                      | TS 6.0.3 ✓ |
| Key remapping (`as`)   | `src/demos/06` (`` `get${Capitalize<…>}` ``)             | Renomear chaves dentro do mapped type (getId, getTitle…)                     | TS 6.0.3 ✓ |
| Template literal types | `src/demos/06` (`` `${string}:${infer Param}` ``)        | Decompor strings em TIPO: rota vira objeto de parâmetros                     | TS 6.0.3 ✓ |
| Tipos recursivos       | `src/demos/06` (`RouteParams` chama a si mesma)          | Rotas com N parâmetros, sem limite pré-escrito                               | TS 6.0.3 ✓ |

### Narrowing

| Técnica                                    | Onde está                                                                               | Por que usei                                                             | Suporte    |
| ------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------- |
| `typeof`                                   | `src/demos/01` (`describeTypeof`), `src/core/store.ts`                                  | Ramo certo para primitivos — com a pegadinha `typeof null === 'object'`  | TS 6.0.3 ✓ |
| `in`                                       | `src/demos/01` (`describeIn`)                                                           | Union sem discriminante literal: basta a presença da propriedade         | TS 6.0.3 ✓ |
| `instanceof`                               | `src/demos/01` (`describeInstanceof`), `core/demo-registry.ts`                          | Narrowing por hierarquia de classes                                      | TS 6.0.3 ✓ |
| Igualdade (switch)                         | `src/demos/04` (`describeState`, `transition`)                                          | Igualdade com literais do discriminante restringe o ramo                 | TS 6.0.3 ✓ |
| Type predicates (`value is T`)             | `core/result.ts` (`isOk`), `demos/05` (`isRecord`), `core/i18n.ts` (`isTranslationKey`) | Checagem de runtime vira afirmação de tipo, sem `as`                     | TS 6.0.3 ✓ |
| Assertion functions (`asserts value is T`) | `src/demos/05` (`assertPayload`)                                                        | Validar uma variável inteira de uma vez e continuar com o tipo narrowado | TS 6.0.3 ✓ |
| Uniões discriminadas                       | `core/result.ts` (`Ok\|Err`), `src/demos/04` (`RequestState`)                           | Modelar estados mutuamente exclusivos com campos próprios                | TS 6.0.3 ✓ |
| Exaustividade + `never`                    | `src/utils/assert-never.ts`, `src/demos/04` (`default:`)                                | Estado/evento novo sem tratamento **não compila**                        | TS 6.0.3 ✓ |

### Operadores e modificadores

| Técnica                   | Onde está                                                              | Por que usei                                                       | Suporte    |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------- |
| `satisfies`               | `core/i18n.ts` (`ptBr`), `src/demos/07`, `src/demos/12` (`FLAG_TABLE`) | Validar estrutura **sem** perder tipos literais                    | TS 6.0.3 ✓ |
| `as const`                | `core/i18n.ts`, `src/demos/07`                                         | Ver “Tipos básicos”                                                | TS 6.0.3 ✓ |
| `keyof`                   | `core/dom.ts` (`h`), `src/demos/07` (`ThemeName`)                      | Chaves de um objeto viram união de literais                        | TS 6.0.3 ✓ |
| `typeof` em nível de tipo | `core/i18n.ts` (`keyof typeof en`), `src/demos/07`                     | Derivar o tipo a partir do valor/objeto declarado                  | TS 6.0.3 ✓ |
| `override`                | `src/demos/09-result-error-handling.ts` (`code`)                       | Exigir declaração explícita ao sobrescrever (`noImplicitOverride`) | TS 6.0.3 ✓ |
| `readonly` em arrays      | `src/demos/02` (`NumberList`), `core/i18n.ts`                          | Listas que não podem ser mutadas por engano                        | TS 6.0.3 ✓ |

### Padrões

| Técnica                                                             | Onde está                                                      | Por que usei                                                                                | Suporte    |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------- |
| Branded types                                                       | `src/demos/08-branded-types.ts` (`UserId`, `OrderId`, `Money`) | Nominal typing sobre primitivos: trocar IDs não compila                                     | TS 6.0.3 ✓ |
| `Result<T, E>`                                                      | `src/core/result.ts` (+ testes `tests/unit/result.test.ts`)    | Falha como dado, tratamento obrigatório nos tipos                                           | TS 6.0.3 ✓ |
| Sobrecargas de função                                               | `src/demos/02` (`pipe`), `src/demos/10` (`joinTruncated`)      | Assinaturas documentam formas distintas de chamar (estágios / opções)                       | TS 6.0.3 ✓ |
| Declaration merging / module augmentation (`HTMLElementTagNameMap`) | `src/components/*.ts` (`declare global`)                       | `h('code-peek')` devolve `CodePeek` sem cast — o mapa de tags do DOM conhece as nossas tags | TS 6.0.3 ✓ |

### Classes

| Técnica                 | Onde está                                         | Por que usei                                          | Suporte    |
| ----------------------- | ------------------------------------------------- | ----------------------------------------------------- | ---------- |
| Modificadores de acesso | `src/demos/01` (`Timestamp`), `src/demos/09`      | Contrato explícito do que é público/privado           | TS 6.0.3 ✓ |
| Campos `#private`       | `src/demos/01` (`#instant`), todos os componentes | Privacidade real (runtime), não só de tipo            | TS 6.0.3 ✓ |
| `abstract`              | `src/demos/09` (`ParseIssue`)                     | Base completa de erro, sem instanciar a abstração     | TS 6.0.3 ✓ |
| `implements`            | `src/demos/09` (`implements Describable`)         | Contrato de forma compartilhado por classes e objetos | TS 6.0.3 ✓ |
| `override`              | `src/demos/09` (`InvalidDateIssue.code`)          | Ver “Operadores e modificadores”                      | TS 6.0.3 ✓ |

### Módulos

| Técnica                        | Onde está                                                                               | Por que usei                                                         | Suporte                   |
| ------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------- |
| `import type` / `export type`  | todo o repositório (ex.: `core/demo-registry.ts`)                                       | `verbatimModuleSyntax` exige — tipos nunca viram runtime             | TS 6.0.3 ✓                |
| Imports dinâmicos tipados      | `src/main.ts` (loaders do registry), `src/components/code-peek.ts` (`import.meta.glob`) | Cada demo é um chunk separado, carregado só quando perto da viewport | TS 6.0.3 ✓ + Vite (build) |
| Declaração de módulo p/ `?raw` | `src/types/global.d.ts` (via `/// <reference types="vite/client" />`)                   | `import 'arquivo.ts'` como `string` tipada, sem `any`                | TS 6.0.3 ✓ + Vite (build) |

### Configuração

| Técnica                    | Onde está                    | Por que usei                                                          | Suporte     |
| -------------------------- | ---------------------------- | --------------------------------------------------------------------- | ----------- |
| Flags do `tsconfig.json`   | `tsconfig.json` (comentadas) | Cada flag com o porquê; demo 12 mostra “erro que evita × custo”       | TS 6.0.3 ✓  |
| Regra de camadas no ESLint | `eslint.config.js`           | `core/utils` não importam `demos/components` — violação quebra o lint | ESLint 10 ✓ |

### Evite — e por quê

| Técnica     | Onde está explicado                                     | Por quê                                                              | Status           |
| ----------- | ------------------------------------------------------- | -------------------------------------------------------------------- | ---------------- |
| `enum`      | `src/demos/12` (`SCOPE_NOTES`), demo 07 (literal union) | Gera runtime + reescrita; união de literais + `as const` cobre igual | Não usado        |
| `any`       | `eslint.config.js` (`no-explicit-any: error`), demo 05  | Silencia erros; `unknown` + validação é o caminho                    | Proibido no lint |
| `namespace` | `src/demos/12` (`SCOPE_NOTES`)                          | Legado; módulos resolvem sem risco de colisão global                 | Não usado        |

---

## Estrutura

```
├─ index.html                 # Landing page (en-US, chaves data-i18n p/ pt-BR)
├─ vite.config.ts             # base do GitHub Pages, alias @/, __TS_VERSION__, testes
├─ tsconfig.json              # rigor máximo (19 opções de compilador comentadas)
├─ src/
│  ├─ main.ts                 # bootstrap: componentes + montagem sob demanda
│  ├─ core/                   # dom, store, event-bus, result, demo-registry, i18n
│  ├─ utils/                  # assert-never, type-assertions, format
│  ├─ components/             # code-peek, demo-section, error-showcase, theme/lang-toggle
│  ├─ demos/                  # 01…12 (uma demo por arquivo, exporta init)
│  │  └─ errors/              # código que DEVE não compilar (@ts-expect-error)
│  ├─ styles/                 # tokens / base / components
│  └─ types/                  # global.d.ts, domain.ts
├─ tests/unit/                # 8 arquivos, 43 testes de runtime
├─ tests/types/               # 2 arquivos, 9 testes de tipo
├─ ARCHITECTURE.md            # camadas, ciclo de vida, testes, dependências
└─ TYPESCRIPT-TECHNIQUES.md   # um capítulo por demonstração
```

---

## Testes

```bash
npm run test        # 43 testes de runtime (Node puro, fetch mockado, fake timers)
npm run test:types  # 9 testes de tipo (expectTypeOf + Expect<Equal<…>>)
```

- **Runtime** (`tests/unit/`): `store`, `event-bus`, `result`, `format`, `pipe`/`groupBy`,
  validador de JSON, parser de rotas, `fetchJson` (mock de `fetch` + timeout com fake timers).
- **Tipo** (`tests/types/`): `Equal`/`Expect`, `RouteParams<'/users/:id'> = { id: string }`,
  `number` não assignable a `Money`, união de estados esgota para `never`.
- **Erros vivos** (`src/demos/errors/`): validados pelo próprio `tsc` em `npm run typecheck`.

---

## Sobre o autor

**Roldan Eng Software** — Sandro, desenvolvedor fullstack e empreendedor no Brasil,
freelancer e indie hacker construindo produtos SaaS.

- LinkedIn: `TODO`
- GitHub: `TODO`
- E-mail: `TODO`

---

## TODOs

Itens pendentes deste repositório (mantidos atualizados nesta lista):

1. **Links do autor** — preencher os `href` de LinkedIn, GitHub e e-mail: 6 ocorrências
   em `index.html` (hero + rodapé) e 3 nesta seção “Sobre o autor”.
2. **Badges adicionais** — opcional: badge de licença e de tamanho do bundle, se desejado.

> Fora do código: habilitar/atualizar a descrição do repositório no GitHub, se desejado.
> O deploy em si já funciona — workflow `Deploy to GitHub Pages` roda a cada push em `main`.

### Configuração obrigatória: Pages → Source = GitHub Actions

O repositório precisa de **Settings → Pages → Source → GitHub Actions**
(`build_type: workflow`). Com "Deploy from a branch", o GitHub publica o `index.html`
**fonte** — links para `/src/styles/*.css` que não existem no Pages, resultando em
página **sem CSS**. Isso aconteceu de verdade em 03/10/2026 (duas pipelines corriam em
paralelo e a de branch venceu a corrida). O workflow agora verifica o `build_type` no
primeiro step e **falha alto** se a fonte estiver errada.
