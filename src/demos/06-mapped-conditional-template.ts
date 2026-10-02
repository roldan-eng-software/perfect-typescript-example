/**
 * @file 06-mapped-conditional-template.ts
 * @purpose Demonstração 06: gerador de rotas tipado — "/users/:id" → { id: string } —
 *          construído com template literal types, infer, tipos condicionais recursivos,
 *          key remapping (`as`) e tuplas variádicas.
 * @techniques Template literal types; infer; conditional types recursivos; mapped types
 *            com key remapping; tuplas variádicas (...infer Rest).
 * @usedBy main.ts (loader), index.html (seção 06), tests (unit + types), code-peek.
 */
import { h } from '@/core/dom';
import type { Cleanup } from '@/core/demo-registry';

// ---------------------------------------------------------------------------
// Lógica pura (testável sem DOM)
// ---------------------------------------------------------------------------

/**
 * O tipo da rota é calculado em tempo de compilação:
 * - template literal decompõe "/users/:id" em peças;
 * - `infer Param` captura o nome do parâmetro;
 * - o ramo recursivo processa o Resto da rota;
 * - o mapped type gera { [nomeDoParam]: string }.
 * Rotas sem parâmetros viram `Record<never, string>` (equivale a {} sem usar `{}` vazio).
 */
export type RouteParams<Path extends string> = Path extends `${string}:${infer Param}/${infer Rest}`
  ? Record<Param | keyof RouteParams<Rest>, string>
  : Path extends `${string}:${infer Param}`
    ? Record<Param, string>
    : // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- rota SEM params É o objeto vazio; toda alternativa legal ({}, Record<never, …>) é flagged pela regra
      Record<never, string>;

/** Key remapping: renomeia chaves com template literal DENTRO do mapped type. */
export type Getters<T extends object> = {
  [Key in keyof T as `get${Capitalize<string & Key>}`]: () => T[Key];
};

export interface Article {
  readonly id: string;
  readonly title: string;
  readonly views: number;
}
export type ArticleGetters = Getters<Article>; // { getId, getTitle, getViews }

/** Tupla variádica: o PRIMEIRO elemento de qualquer tupla, sem listar comprimentos. */
export type First<T extends readonly unknown[]> = T extends readonly [infer Head, ...unknown[]]
  ? Head
  : never;

/** Runtime puro: extrai os :params do padrão e preenche com os valores do caminho. */
export function parseRoute(pattern: string, path: string): Record<string, string> {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  const params: Record<string, string> = {};

  patternParts.forEach((part, index) => {
    if (!part.startsWith(':')) {
      return;
    }
    const name = part.slice(1);
    const value = pathParts[index];
    if (value !== undefined && value !== '') {
      params[name] = value;
    }
  });

  return params;
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const STATIC_EXAMPLES: ReadonlyArray<{ readonly type: string; readonly result: string }> = [
  { type: "RouteParams<'/users/:id'>", result: '{ id: string }' },
  { type: "RouteParams<'/users/:id/posts/:postId'>", result: '{ id: string; postId: string }' },
  { type: "RouteParams<'/about'>", result: 'Record<never, string> (sem params)' },
  { type: 'Getters<Article>', result: '{ getId, getTitle, getViews } (key remapping)' },
  { type: 'First<[string, number, boolean]>', result: 'string (tupla variádica)' },
];

export function init(root: HTMLElement): Cleanup {
  const controller = new AbortController();
  const { signal } = controller;

  const patternInput = h('input', {
    attrs: { type: 'text', value: '/users/:id/posts/:postId', 'aria-label': 'Padrão da rota' },
  });
  const pathInput = h('input', {
    attrs: { type: 'text', value: '/users/42/posts/7', 'aria-label': 'Caminho acessado' },
  });
  for (const input of [patternInput, pathInput]) {
    input.classList.add('btn');
  }

  const output = h('code');
  output.classList.add('error-card__line');

  const render = (): void => {
    const params = parseRoute(patternInput.value, pathInput.value);
    const keys = Object.keys(params);
    output.textContent =
      keys.length === 0
        ? '{}  — sem :params no padrão'
        : `{ ${keys.map((key) => `${key}: "${params[key] ?? ''}"`).join(', ')} }`;
  };

  for (const input of [patternInput, pathInput]) {
    input.addEventListener('input', render, { signal });
  }

  const table = h('table', { attrs: { 'aria-label': 'Tipos calculados em nível de tipo' } });
  table.classList.add('doc-table');
  const body = h('tbody');
  for (const row of STATIC_EXAMPLES) {
    body.append(
      h('tr', {
        children: [
          h('td', { children: [h('code', { text: row.type })] }),
          h('td', { children: [h('code', { text: row.result })] }),
        ],
      }),
    );
  }
  table.append(body);

  root.replaceChildren(
    h('div', { children: [patternInput, pathInput] }),
    h('p', { text: 'Parâmetros extraídos em runtime:' }),
    output,
    h('p', {
      text: 'O MESMO cálculo existe em nível de tipo (RouteParams) — compilado, não executado:',
    }),
    table,
  );
  render();

  return () => {
    controller.abort();
  };
}
