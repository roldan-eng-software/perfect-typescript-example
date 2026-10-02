# Técnicas de TypeScript

Um capítulo por demonstração da landing page: **o problema**, **a técnica**, **o trecho
real** (caminho no repositório) e **a armadilha comum**. Os trechos são citações curtas do
arquivo indicado — o código completo está ligado em cada caminho.

---

## 01 — Inferência e narrowing

**Problema.** Um campo de texto produz `string | number | boolean | null` e a UI precisa
dizer, corretamente, qual ramo do tipo foi tomado — inclusive com a pegadinha
`typeof null === 'object'`.

**Técnica.** Narrowing por `typeof`, `in` e `instanceof`, encadeado em funções puras com
retorno inferido; `assertNever` fecha a função provando que nenhum ramo sobrou.

**Trecho real** — [`src/demos/01-inference-and-narrowing.ts`](src/demos/01-inference-and-narrowing.ts):

```ts
if (value === null) {
  return { label: 'value === null', result: 'null (typeof diria "object" — a pegadinha clássica)' };
}
if (typeof value === 'string') {
  return { label: 'typeof value === "string"', result: `string — "${value}"` };
}
// …
return assertNever(value, 'Scalar sem ramo tratado');
```

**Armadilha comum.** Checar `typeof value === 'object'` antes do null: `null` passa pelo
guard e quebra o resto da função. null primeiro, sempre.

---

## 02 — Genéricos com constraints e sobrecargas

**Problema.** Encadear transformações e agrupar listas sem perder o tipo do resultado —
e sem `string` largado nas chaves de um `Record`.

**Técnica.** `pipe` com sobrecargas (cada estágio vira uma assinatura), `groupBy` com
constraint `K extends PropertyKey` e **`const` type parameter** para inferir chaves
literais.

**Trecho real** — [`src/demos/02-generics.ts`](src/demos/02-generics.ts):

```ts
export function groupBy<T, const K extends PropertyKey>(
  items: readonly T[],
  keyOf: (item: T) => K,
): Record<K, T[]> {
```

**Armadilha comum.** Sem `const K`, `keyOf = (n) => (n % 2 ? 'even' : 'odd')` infere
`string` e o `Record` vira uma superfície de índices arbitários. Com `const`, a chave é a
literal — `groups.even` compila, `groups.missing` não (provado em
[`errors/02-generics.errors.ts`](src/demos/errors/02-generics.errors.ts)).

---

## 03 — Utility types a partir de uma fonte de verdade

**Problema.** Formulário, payload de criação, exibição segura e labels de campo — tudo
derivado de um único tipo `User`, sem repetir campos.

**Técnica.** `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `Extract`,
`Exclude`, `NonNullable`, `ReturnType`, `Parameters` e `Awaited` projetando o mesmo
contrato.

**Trecho real** — [`src/demos/03-utility-types.ts`](src/demos/03-utility-types.ts):

```ts
export type NewUser = Omit<User, 'id'>;
export type UserFormFields = Pick<User, 'name' | 'email' | 'role'>;
export type SavedUser = Awaited<ReturnType<typeof saveUser>>;
```

**Armadilha comum.** Tipar o formulário à mão e deixar o modelo do servidor divergir.
Com projeções, mudou em `User`? Mudou em tudo — e o lint de tipos reclama onde precisa.

---

## 04 — Uniões discriminadas e exaustividade

**Problema.** Uma requisição tem estados mutuamente exclusivos; esquecer de tratar um
estado novo é o bug clássico que só aparece em produção.

**Técnica.** União discriminada pelo campo `status`, reducer com `switch` e fechamento em
`assertNever(state)` — o que sobra após todos os `case` é `never`, e `never` é o único
tipo aceito pelo parâmetro.

**Trecho real** — [`src/demos/04-discriminated-unions.ts`](src/demos/04-discriminated-unions.ts):

```ts
case 'error':
  return `error — ${state.message}`;
default:
  return assertNever(state, 'Estado sem tratamento');
```

**Armadilha comum.** `default` que retorna uma string genérica “fallback”: o compilador
nunca reclama quando um estado novo chega. `assertNever` transforma o esquecimento em
erro de build (verificado em [`errors/04-unions.errors.ts`](src/demos/errors/04-unions.errors.ts)).

---

## 05 — Type guards e `unknown`

**Problema.** `JSON.parse` devolve `any`; colar JSON de usuário e confiar nele é como
não validar nada. Precisa-se de `unknown` + validação com **erros por caminho**.

**Técnica.** Type predicates (`value is T`) para estruturas pequenas, assertion function
(`asserts value is T`) para validar um valor inteiro de uma vez, e `Result<Payload, Issue[]>`
acumulando todos os problemas.

**Trecho real** — [`src/demos/05-type-guards-and-unknown.ts`](src/demos/05-type-guards-and-unknown.ts):

```ts
export function isRecord(value: unknown): value is JsonObject { … }
export function assertPayload(input: unknown): asserts input is Payload { … }
```

**Armadilha comum.** `any` no meio do caminho (“é só um cast rapidinho”): ele silencia
tudo à jusante. Com `unknown`, cada acesso é um erro até o guard existir — e depois do
`asserts`, o tipo já chega narrowado.

---

## 06 — Tipos mapeados, condicionais e template literal

**Problema.** Um padrão de rota como `"/users/:id/posts/:postId"` deveria **produzir o
tipo** `{ id: string; postId: string }` — em nível de tipo, sem executar nada.

**Técnica.** Template literal types decompõem a string, `infer` captura o nome do
parâmetro, o tipo é recursivo no “resto” da rota e um mapped type gera o objeto final.

**Trecho real** — [`src/demos/06-mapped-conditional-template.ts`](src/demos/06-mapped-conditional-template.ts):

```ts
export type RouteParams<Path extends string> = Path extends `${string}:${infer Param}/${infer Rest}`
  ? Record<Param | keyof RouteParams<Rest>, string>
  : Path extends `${string}:${infer Param}`
    ? Record<Param, string>
    : Record<never, string>;
```

**Armadilha comum.** Esquecer o ramo base: sem ele, o tipo não fecha e qualquer rota sem
params cai em `never`. O mesmo arquivo mostra key remapping (`` as `get${Capitalize<…>}` ``)
e tupla variádica (`First<T>` com `...unknown[]`).

---

## 07 — `satisfies` e `as const`

**Problema.** Validar um objeto de configuração **sem** perder as chaves literais — a
anotação de tipo tradicional afunila tudo para `string`.

**Técnica.** `satisfies Record<string, ThemeDefinition>` valida a estrutura em tempo de
compilação e preserva `keyof typeof themes` como `'ocean' | 'sunset' | 'forest'`; `as const` faz o
mesmo para um valor único.

**Trecho real** — [`src/demos/07-satisfies-and-const.ts`](src/demos/07-satisfies-and-const.ts):

```ts
export const themes = { ocean: { … }, sunset: { … }, forest: { … } }
  satisfies Record<string, ThemeDefinition>;

export type ThemeName = keyof typeof themes; // 'ocean' | 'sunset' | 'forest'
```

**Armadilha comum.** `const t: ThemeDefinition = {…}` parece igual e não é: `t.name` vira
`string` e `themes[t.name]` deixa de compilar. Já `as ThemeDefinition` nem valida —
campo faltando passa batido. A tabela na própria demo compara os três casos.

---

## 08 — Branded (nominal) types

**Problema.** `UserId` e `OrderId` são `string` na API; trocar um pelo outro compila e
explode em runtime. `Money` aceita qualquer `number`.

**Técnica.** `Brand<T, Label>` = interseção com uma propriedade privada de marca; as
**fábricas** são os únicos pontos do arquivo com `as`, e lá acontece a validação.

**Trecho real** — [`src/demos/08-branded-types.ts`](src/demos/08-branded-types.ts):

```ts
export type UserId = Brand<string, 'UserId'>;
export function fetchUser(id: UserId): string { … }  // OrderId não passa (errors/08)
```

**Armadilha comum.** Achar que “é só string, o cast resolve”: o `as` de fuga anula a
proteção inteira. No projeto, o `as` de marca só existe dentro da fábrica, com comentário
justificando — e `number` nunca é atribuível a `Money` (provado em
[`tests/types/demos.test-d.ts`](tests/types/demos.test-d.ts)).

---

## 09 — `Result<T, E>` e tratamento de erros

**Problema.** Parser de datas/números falha o tempo todo (entrada inválida). Exceções
escondem o custo do erro no tipo e forçam `try/catch` em volta de tudo.

**Técnica.** `Result<Date, ParseIssue>` com `ok`/`err`/`match`; o erro é um **valor** —
aqui, uma hierarquia de classes `abstract` + `implements` + `override`.

**Trecho real** — [`src/demos/09-result-error-handling.ts`](src/demos/09-result-error-handling.ts):

```ts
export abstract class ParseIssue implements Describable {
  public abstract readonly code: string;
}
export class InvalidDateIssue extends ParseIssue {
  override readonly code = 'invalid-date';
}
```

**Armadilha comum.** `match` com só o ramo `ok` “porque nunca falha”: a assinatura exige
os dois. E sem `noImplicitOverride`, um `code` esquecido na subclasse passaria em
silêncio — com a flag ligada, `override` é obrigatório.

---

## 10 — DOM e eventos tipados

**Problema.** DOM é stringly-typed: `querySelector` devolve `Element`, eventos carregam
`any`, e criar `<button>` à mão repete código.

**Técnica.** `qs<T>`/`h(tag)` com `keyof HTMLElementTagNameMap`, `EventBus<Events>` com
mapa de eventos (payload amarrado ao nome), sobrecargas de função e **declaration
merging** aumentando o mapa de tags para os nossos custom elements.

**Trecho real** — [`src/components/code-peek.ts`](src/components/code-peek.ts):

```ts
declare global {
  interface HTMLElementTagNameMap {
    'code-peek': CodePeek;
  }
}
```

**Armadilha comum.** `document.querySelector(...) as HTMLButtonElement` — o cast afirma
o que a página não garante. Com o genérico + `declare global`, `h('demo-status-pill')`
devolve o tipo certo **e** devolve `null` honesto quando o seletor não existe (o guard é
obrigatório, sem `!`).

---

## 11 — Async e cliente HTTP tipado

**Problema.** `fetch` devolve corpo como `any`, erro como exceção e cancelamento
implícito. Um client honesto valida a forma, classifica a falha e respeita timeout/retry.

**Técnica.** `fetchJson<T>(url, validate, options)` com `AbortController` por tentativa
(timeout) encadeado ao sinal do chamador (cancelamento), `retries` para falhas
transitórios e `Result<T, FetchFailure>` com código de erro tipado.

**Trecho real** — [`src/demos/11-async-and-typed-fetch.ts`](src/demos/11-async-and-typed-fetch.ts):

```ts
export type FetchFailureCode =
  'http' | 'network' | 'timeout' | 'aborted' | 'invalid-json' | 'invalid-shape';
```

**Armadilha comum.** Ler `signal.aborted` direto após um `await` e confiar no tipo:
`aborted` é `readonly` e o CFA afunila a leitura para `false` — o valor muda em runtime
durante o await. O arquivo contorna isso lendo por função (`isAborted(signal)`), com o
porquê documentado no comentário.

---

## 12 — Rigor do compilador

**Problema.** Flags de `tsconfig` soam arbitárias até alguém mostrar o **erro real** que
cada uma evita e o **custo** que cobra na rotina.

**Técnica.** Tabela tipada com `satisfies readonly FlagRow[]` (faltar coluna não compila),
arquivos `errors/` vivos como prova e notas de escopo **verificadas empiricamente**
(enum/`any`/`namespace` evitados; decorators e `using` fora, com o experimento registrado).

**Trecho real** — [`src/demos/12-tsconfig-strictness.ts`](src/demos/12-tsconfig-strictness.ts):

```ts
export const FLAG_TABLE = [
  { flag: 'noUncheckedIndexedAccess', avoids: 'lista[0] sendo lido como sempre válido', cost: 'T | undefined em indexações' },
  …
] satisfies readonly FlagRow[];
```

**Armadilha comum.** Copiar um `tsconfig` “de gente grande” sem entender o custo.
Aqui cada flag tem linha própria: o que evita (com erro real em `src/demos/errors/`) e o
que cobra no dia a dia.

---

### Mecânica dos erros vivos (comum aos capítulos 02, 04 e 08)

```ts
// @ts-expect-error descrição do erro esperado
linha_que_nao_compila();
```

O `tsc` falha se a diretiva não tiver um erro real embaixo (“unused directive”) **ou**
se a linha deixar de errar. É o mecanismo que mantém os exemplos sincronizados com o
compilador — o mesmo que o ESLint exige descrição em
(`ban-ts-comment: allow-with-description`).
