/**
 * @file 02-generics.ts
 * @purpose Demonstração 02: genéricos na prática — `pipe` (sobrecargas), `groupBy`
 *          (constraint + const type parameter) e um store reativo genérico.
 * @techniques Genéricos com constraint (extends PropertyKey); const type parameters
 *            (recursos de TIPO puro — suportado pelo TS 6.0.3, sem fallback de runtime);
 *            sobrecargas de função; reuso de createStore<T> do core.
 * @usedBy main.ts (loader), index.html (seção 02), errors/02-generics.errors.ts,
 *          tests/unit/pipe-group-by.test.ts.
 */
import { h } from '@/core/dom';
import type { Cleanup } from '@/core/demo-registry';
import { createStore, type Unsubscribe } from '@/core/store';

// ---------------------------------------------------------------------------
// Lógica pura (testável sem DOM)
// ---------------------------------------------------------------------------

/**
 * `pipe` com SOBRECARGAS: cada assinatura descreve um estágio, e a saída de um
 * estágio vira a entrada do próximo — errar o tipo no MEIO da cadeia não compila.
 */
export function pipe<A>(value: A): A;
export function pipe<A, B>(value: A, fn1: (input: A) => B): B;
export function pipe<A, B, C>(value: A, fn1: (input: A) => B, fn2: (input: B) => C): C;
export function pipe<A, B, C, D>(
  value: A,
  fn1: (input: A) => B,
  fn2: (input: B) => C,
  fn3: (input: C) => D,
): D;
export function pipe(value: unknown, ...fns: Array<(input: never) => unknown>): unknown {
  // `as` justificado: a assinatura interna guarda funções como `(input: never) => unknown`
  // (contravariância permite qualquer estágio entrar); em runtime cada função recebe o
  // valor do estágio anterior — o contrato real é dado pelas SOBRECARGAS públicas acima.
  const steps = fns as Array<(input: unknown) => unknown>;
  return steps.reduce<unknown>((accumulator, step) => step(accumulator), value);
}

/**
 * `groupBy` com CONSTRAINT (`extends PropertyKey`: só string/number/symbol podem ser
 * chave de Record) e `const K`: a chave infere como LITERAL ('odd' | 'even') em vez de
 * `string` largado — o Record resultante expõe exatamente aquelas chaves.
 */
export function groupBy<T, const K extends PropertyKey>(
  items: readonly T[],
  keyOf: (item: T) => K,
): Record<K, T[]> {
  // Map primeiro: `Map.get` devolve `T[] | undefined` honesto (nada de as aqui);
  // o Record final é montado no fim — e a anotação `Record<K, T[]>` é o contrato.
  const buckets = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const existing = buckets.get(key);
    if (existing === undefined) {
      buckets.set(key, [item]);
    } else {
      existing.push(item);
    }
  }

  // `as` justificado: um objeto literal vazio não satisfaz `Record<K, T[]>` por si só;
  // o cast declara a intenção correta, preenchida logo abaixo a partir do Map.
  const groups = {} as Record<K, T[]>;
  for (const [key, bucket] of buckets) {
    groups[key] = bucket;
  }
  return groups;
}

// --- Estágios da pipeline (funções puras, tipadas) ---

export type NumberList = readonly number[];

export const DOUBLE_LIST = (list: NumberList): NumberList => list.map((n) => n * 2);
export const SORT_ASC = (list: NumberList): NumberList => [...list].sort((a, b) => a - b);
export const SUM = (list: NumberList): number => list.reduce((total, n) => total + n, 0);

export const SAMPLE: NumberList = [5, 3, 8, 1];

/** Cadeia estática de 3 estágios: a assinatura de 3 fns faz o tipo sair `number`. */
export function pipelineReference(): number {
  return pipe(SAMPLE, DOUBLE_LIST, SORT_ASC, SUM);
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

export function init(root: HTMLElement): Cleanup {
  const controller = new AbortController();
  const { signal } = controller;

  // --- Pipe interativo: as caixas montam a cadeia na ordem fixa das operações ---
  const pipeOutput = h('code', { text: '' });
  const pipeChain = h('p', { text: '' });

  const doubleBox = h('input', { attrs: { type: 'checkbox', id: 'g-double' } });
  const sortBox = h('input', { attrs: { type: 'checkbox', id: 'g-sort', checked: '' } });
  const sumBox = h('input', { attrs: { type: 'checkbox', id: 'g-sum' } });

  const renderPipe = (): void => {
    const labels: string[] = ['SAMPLE'];
    // Cada estágio é uma chamada `pipe` individual — o overload garante o tipo do estágio.
    let stage: NumberList = SAMPLE;
    if (doubleBox.checked) {
      stage = pipe(stage, DOUBLE_LIST);
      labels.push('DOUBLE_LIST');
    }
    if (sortBox.checked) {
      stage = pipe(stage, SORT_ASC);
      labels.push('SORT_ASC');
    }
    pipeChain.textContent = `pipe(${labels.join(', ')})`;
    if (sumBox.checked) {
      // SUM muda o tipo da cadeia: NumberList → number.
      labels.push('SUM');
      pipeChain.textContent = `pipe(${labels.join(', ')})`;
      pipeOutput.textContent = String(pipe(stage, SUM));
    } else {
      pipeOutput.textContent = `[${stage.join(', ')}]`;
    }
  };

  for (const box of [doubleBox, sortBox, sumBox]) {
    box.addEventListener('change', renderPipe, { signal });
  }

  const pipeControls = h('div', {
    children: [
      label('double', doubleBox, 'DOUBLE_LIST'),
      label('sort', sortBox, 'SORT_ASC'),
      label('sum', sumBox, 'SUM'),
    ],
  });
  pipeControls.classList.add('demo-slot__controls');

  // --- groupBy interativo: troca a função de chave e mostra os grupos ---
  const groupOutput = h('div');
  const groupSelect = h('select', { attrs: { 'aria-label': 'Função de chave do groupBy' } });
  groupSelect.classList.add('btn');
  const parityOption = h('option', { attrs: { value: 'parity' }, text: "n % 2 ('even' | 'odd')" });
  const sizeOption = h('option', { attrs: { value: 'size' }, text: "n >= 5 ('big' | 'small')" });
  groupSelect.append(parityOption, sizeOption);

  const renderGroups = (): void => {
    const keyOf =
      groupSelect.value === 'parity'
        ? (n: number): 'even' | 'odd' => (n % 2 === 0 ? 'even' : 'odd')
        : (n: number): 'big' | 'small' => (n >= 5 ? 'big' : 'small');
    const groups = groupBy(SAMPLE, keyOf);
    groupOutput.replaceChildren();
    for (const [key, bucket] of Object.entries(groups)) {
      const line = h('p');
      line.append(h('strong', { text: `${key}: ` }), `[${bucket.join(', ')}]`);
      groupOutput.append(line);
    }
  };
  groupSelect.addEventListener('change', renderGroups, { signal });

  // --- Store reativo genérico: dois assinantes + desinscrição ---
  const store = createStore(0);
  const storeValue = h('output', { text: '0' });
  const storeParity = h('output', { text: 'par' });
  const listenerCount = h('output', { text: '2 assinantes' });

  const updateParity = (value: number): void => {
    storeParity.textContent = value % 2 === 0 ? 'par' : 'ímpar';
  };

  const unsubscribeValue = store.subscribe((value) => {
    storeValue.textContent = String(value);
  });
  let parityUnsubscribe: Unsubscribe = store.subscribe(updateParity);
  let parityActive = true;

  const incButton = h('button', { attrs: { type: 'button' }, text: '+1' });
  incButton.classList.add('btn');
  incButton.addEventListener(
    'click',
    () => {
      store.set((previous) => previous + 1);
    },
    { signal },
  );

  const toggleParityButton = h('button', {
    attrs: { type: 'button' },
    text: 'Desinscrever paridade',
  });
  toggleParityButton.classList.add('btn');
  toggleParityButton.addEventListener(
    'click',
    () => {
      if (parityActive) {
        parityUnsubscribe();
        parityActive = false;
        toggleParityButton.textContent = 'Reinscrever (novo listener)';
        listenerCount.textContent = '1 assinante';
      } else {
        parityUnsubscribe = store.subscribe(updateParity);
        parityActive = true;
        toggleParityButton.textContent = 'Desinscrever paridade';
        listenerCount.textContent = '2 assinantes';
      }
    },
    { signal },
  );

  const storeControls = h('div', { children: [incButton, toggleParityButton] });
  storeControls.classList.add('demo-slot__controls');

  root.replaceChildren(
    h('h4', { text: 'pipe (sobrecargas)' }),
    pipeControls,
    pipeChain,
    pipeOutput,
    h('h4', { text: 'groupBy (constraint + const type parameter)' }),
    groupSelect,
    groupOutput,
    h('h4', { text: 'createStore<T> (genérico)' }),
    storeControls,
    h('p', {
      children: [
        h('span', { text: 'valor: ' }),
        storeValue,
        h('span', { text: ' · ' }),
        storeParity,
        h('span', { text: ' · ' }),
        listenerCount,
      ],
    }),
  );

  renderPipe();
  renderGroups();

  // Cleanup: cancela listeners da UI e desinscreve TODOS os assinantes do store.
  return () => {
    controller.abort();
    unsubscribeValue();
    parityUnsubscribe();
  };
}

/** Helper local: `<label><input> texto</label>` tipado. */
function label(forId: string, control: HTMLInputElement, text: string): HTMLLabelElement {
  const wrapper = h('label', { text: `${text} ` });
  wrapper.setAttribute('for', forId);
  wrapper.prepend(control);
  return wrapper;
}
