/**
 * @file 12-tsconfig-strictness.ts
 * @purpose Demonstração 12: cada flag do tsconfig.json com o erro real que evita e o
 *          custo que cobra — mais as decisões de escopo verificadas empiricamente.
 * @techniques satisfies sobre dados documentais; verificação empírica de suporte de
 *            ferramenta (decorators e using ficaram de fora por teste, não por achismo).
 * @usedBy main.ts (loader), index.html (seção 12), code-peek.
 */
import { h } from '@/core/dom';
import type { Cleanup } from '@/core/demo-registry';

// ---------------------------------------------------------------------------
// Tabela documental: flag | erro que evita | custo (dados tipados, não texto solto)
// ---------------------------------------------------------------------------

export interface FlagRow {
  readonly flag: string;
  readonly avoids: string;
  readonly cost: string;
}

/**
 * `satisfies readonly FlagRow[]`: faltar uma coluna em qualquer linha NÃO compila —
 * a tabela é validada pelo mesmo compiler que ela documenta.
 */
export const FLAG_TABLE = [
  { flag: 'strict', avoids: 'null/undefined escapando sem aviso', cost: 'guards em todo acesso' },
  {
    flag: 'noUncheckedIndexedAccess',
    avoids: 'lista[0] sendo lido como sempre válido',
    cost: 'T | undefined em indexações',
  },
  {
    flag: 'exactOptionalPropertyTypes',
    avoids: '{ a: undefined } passando por opcional ausente',
    cost: 'omitir chave em vez de undefined',
  },
  {
    flag: 'noImplicitOverride',
    avoids: 'sobrescrever membro da base sem querer',
    cost: 'keyword override obrigatória',
  },
  {
    flag: 'noImplicitReturns',
    avoids: 'ramo de função sem return (undefined silencioso)',
    cost: 'todos os caminhos retornam',
  },
  {
    flag: 'noFallthroughCasesInSwitch',
    avoids: 'case caindo no próximo por esquecer break',
    cost: 'break/return explícitos',
  },
  {
    flag: 'noUnusedLocals',
    avoids: 'variável esquecida virando lixo',
    cost: 'limpar código morto',
  },
  {
    flag: 'noUnusedParameters',
    avoids: 'parâmetro ignorado sem intenção declarada',
    cost: 'prefixar com _ quando for de propósito',
  },
  {
    flag: 'verbatimModuleSyntax',
    avoids: 'import de tipo virando require em runtime',
    cost: 'import type obrigatório',
  },
  {
    flag: 'isolatedModules',
    avoids: 'compilação que só funciona com type-check junto',
    cost: 'exports de tipo precisam de export type',
  },
  {
    flag: 'moduleResolution: bundler',
    avoids: 'caminho que o Vite resolve e o tsc não (ou vice-versa)',
    cost: 'nada — alinha ferramentas',
  },
  {
    flag: 'skipLibCheck',
    avoids: '— (não valida .d.ts de terceiros)',
    cost: 'confiar nos tipos publicados',
  },
] satisfies readonly FlagRow[];

/** Os TRÊS arquivos de errors/ vivos — cada um prova uma flag com erro real. */
export const LIVE_ERROR_FILES: ReadonlyArray<{ readonly file: string; readonly proves: string }> = [
  {
    file: 'src/demos/errors/02-generics.errors.ts',
    proves: 'constraints, Record literal e overload',
  },
  {
    file: 'src/demos/errors/04-unions.errors.ts',
    proves: 'união discriminada fechada (status/event)',
  },
  { file: 'src/demos/errors/08-branded.errors.ts', proves: 'marcas nominais × primitivos' },
];

// ---------------------------------------------------------------------------
// Decisões de escopo (texto exibido — verificado, não presumido)
// ---------------------------------------------------------------------------

export const SCOPE_NOTES: ReadonlyArray<{ readonly title: string; readonly body: string }> = [
  {
    title: 'enum: evitado de propósito',
    body: 'enum gera objeto em runtime e tem reescrita de valores; união de literais + as const dá o mesmo nível de segurança com zero runtime (ver demo 07).',
  },
  {
    title: 'namespace: evitado de propósito',
    body: 'namespace sobrevive só por questões legadas; modules com export/import cobrem o caso, sem risco de colisão global.',
  },
  {
    title: 'any: proibido pelo ESLint',
    body: 'no-explicit-any é error no eslint.config.js; unknown + validação é o caminho (ver demo 05).',
  },
  {
    title: 'using / Disposable: NÃO incluído (verificado)',
    body: 'Com lib ES2023 o tsc acusa TS2318/TS2550 (falta lib ESNext.Disposable) e o runtime dependeria de Symbol.dispose no navegador — suporte não garantido, então ficou de fora por decisão consciente.',
  },
  {
    title: 'decorators padrão: NÃO incluído (verificado na toolchain)',
    body: 'O tsc 6.0.3 COMPILA ClassMethodDecoratorContext sem flags, mas o Vite 8 (Rolldown/oxc) emite @decorator verbatim no bundle com qualquer target (testado es2017–es2022) — o módulo falha com "Invalid or unexpected token" em Node 22 e no Edge. tsc sim, bundler não: por isso ficou de fora.',
  },
];

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

export function init(root: HTMLElement): Cleanup {
  const controller = new AbortController();

  // --- Tabela de flags ---
  const table = h('table', { attrs: { 'aria-label': 'Flags do tsconfig' } });
  table.classList.add('doc-table');
  const body = h('tbody');
  for (const row of FLAG_TABLE) {
    body.append(
      h('tr', {
        children: [
          h('td', { children: [h('code', { text: row.flag })] }),
          h('td', { text: row.avoids }),
          h('td', { text: row.cost }),
        ],
      }),
    );
  }
  table.append(
    h('thead', {
      children: [
        h('tr', {
          children: [
            h('th', { text: 'flag' }),
            h('th', { text: 'erro que evita' }),
            h('th', { text: 'custo' }),
          ],
        }),
      ],
    }),
    body,
  );

  // --- Arquivos de erro vivos ---
  const errorList = h('ul');
  for (const entry of LIVE_ERROR_FILES) {
    errorList.append(
      h('li', {
        children: [h('code', { text: entry.file }), ` — ${entry.proves}`],
      }),
    );
  }

  // --- Notas de escopo ---
  const notes = h('div');
  for (const note of SCOPE_NOTES) {
    const block = h('p');
    block.append(h('strong', { text: `${note.title}: ` }), note.body);
    notes.append(block);
  }

  root.replaceChildren(
    h('p', {
      children: [
        'Compilando com TypeScript ',
        h('code', { text: '6.0.3' }),
        ' — a mesma versão que compila ESTA página (o hero mostra a versão exata da build).',
      ],
    }),
    table,
    h('h4', { text: 'Erros reais, não inventados (tsc falha se o erro sumir):' }),
    errorList,
    h('h4', { text: 'Decisões de escopo (verificadas, não presumidas):' }),
    notes,
  );

  return () => {
    controller.abort();
  };
}
