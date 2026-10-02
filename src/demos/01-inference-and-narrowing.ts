/**
 * @file 01-inference-and-narrowing.ts
 * @purpose Demonstração 01: inferência de tipos e narrowing — typeof (com a pegadinha
 *          do null), in, instanceof, literais com `as const` e `readonly`.
 * @techniques typeof narrowing; in narrowing; instanceof narrowing; as const; readonly;
 *            assertNever como fechamento exaustivo; classe com #private e modificadores.
 * @usedBy main.ts (loader), index.html (seção 01), code-peek.
 */
import { h } from '@/core/dom';
import type { Cleanup } from '@/core/demo-registry';
import { assertNever } from '@/utils/assert-never';

// ---------------------------------------------------------------------------
// Lógica pura (testável sem DOM)
// ---------------------------------------------------------------------------

/** União de entrada: o que o campo de texto pode produzir após o parse. */
export type Scalar = string | number | boolean | null;

export function parseScalar(raw: string): Scalar {
  const trimmed = raw.trim();
  if (trimmed === 'null') {
    return null;
  }
  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
    return Number(trimmed);
  }
  return raw;
}

export interface NarrowingReport {
  readonly label: string;
  readonly result: string;
}

/**
 * Narrowing por `typeof` — a ordem importa: `typeof null === 'object'`, então o guard
 * de null vem ANTES. Os quatro ramos cobrem a união inteira; o que sobra é `never`
 * (fechado por assertNever — adicionar um tipo novo quebra a compilação).
 */
export function describeTypeof(value: Scalar): NarrowingReport {
  if (value === null) {
    return {
      label: 'value === null',
      result: 'null (typeof diria "object" — a pegadinha clássica)',
    };
  }
  if (typeof value === 'string') {
    return { label: 'typeof value === "string"', result: `string — "${value}"` };
  }
  if (typeof value === 'number') {
    return { label: 'typeof value === "number"', result: `number — ${value}` };
  }
  if (typeof value === 'boolean') {
    return { label: 'typeof value === "boolean"', result: `boolean — ${value}` };
  }
  return assertNever(value, 'Scalar sem ramo tratado');
}

// --- Narrowing com `in`: sem literais compartilhados, só a PRESENÇA da chave ---

export interface Bird {
  readonly name: string;
  readonly wings: number;
}

export interface Fish {
  readonly name: string;
  readonly fins: number;
}

export type Creature = Bird | Fish;

export function describeIn(creature: Creature): NarrowingReport {
  // `'wings' in creature` restringe a união ao membro que tem aquela propriedade.
  if ('wings' in creature) {
    return {
      label: "'wings' in creature",
      result: `Bird — ${creature.name} (${creature.wings} asas)`,
    };
  }
  return {
    label: "'wings' in creature",
    result: `Fish — ${creature.name} (${creature.fins} nadadeiras)`,
  };
}

// --- Narrowing com `instanceof`: checa a HIERARQUIA de classes ---------------

export class Timestamp {
  readonly #instant: Date;
  private readonly label: string;

  public constructor(instant: Date, label = 'ts') {
    this.#instant = instant;
    this.label = label;
  }

  public format(): string {
    return `${this.label}@${this.#instant.toISOString().slice(0, 19)}Z`;
  }
}

export function describeInstanceof(value: Date | Timestamp | string): NarrowingReport {
  if (value instanceof Timestamp) {
    // Narrowing: `value` é Timestamp — métodos da classe estão disponíveis.
    return { label: 'value instanceof Timestamp', result: `Timestamp — ${value.format()}` };
  }
  if (value instanceof Date) {
    return { label: 'value instanceof Date', result: `Date — ${value.toISOString().slice(0, 10)}` };
  }
  return { label: 'não é instância de nada', result: `string — "${value}"` };
}

// --- Literais com `as const` + readonly --------------------------------------

/**
 * `as const` (deep readonly + literais preservados) e `readonly` no array:
 * sem `as const`, `FLIGHT_STATUS.ready` seria `string`; com ele, a LITERAL 'ready'.
 */
export const FLIGHT_STATUS = { ready: 'ready', loading: 'loading' } as const;
export const QUEUE: readonly string[] = ['parse', 'validate', 'emit'];

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const INSTANCEOF_SAMPLES: ReadonlyArray<Date | Timestamp | string> = [
  new Date('2026-01-15T12:00:00Z'),
  new Timestamp(new Date('2026-01-15T12:00:00Z'), 'launch'),
  'não é um objeto',
];

export function init(root: HTMLElement): Cleanup {
  const controller = new AbortController();
  const { signal } = controller;

  const table = h('table', { attrs: { 'aria-label': 'Narrowing checks' } });
  table.classList.add('doc-table');
  const body = h('tbody');

  const rows = new Map<string, HTMLTableCellElement>();
  const addRow = (label: string, initial: string): void => {
    const resultCell = h('td', { text: initial });
    body.append(h('tr', { children: [h('td', { text: label }), resultCell] }));
    rows.set(label, resultCell);
  };

  const update = (label: string, report: NarrowingReport): void => {
    const cell = rows.get(label);
    if (cell !== undefined) {
      cell.textContent = `${report.label} → ${report.result}`;
    }
  };

  addRow('typeof', '—');
  addRow('in', '—');
  addRow('instanceof', '—');
  addRow(
    'as const',
    `${FLIGHT_STATUS.ready}: literal 'ready' · QUEUE é readonly (length ${QUEUE.length})`,
  );
  table.append(body);

  // --- Campo: string | number | boolean | null via parse ---
  const input = h('input', {
    attrs: {
      type: 'text',
      value: '42',
      'aria-label': 'Valor para o parse (ex.: 42, true, null, texto)',
    },
  });
  input.classList.add('btn');
  input.addEventListener(
    'input',
    () => {
      update('typeof', describeTypeof(parseScalar(input.value)));
    },
    { signal },
  );

  // --- Botão: alterna Bird/Fish (narrowing com `in`) ---
  const creatures: readonly Creature[] = [
    { name: 'Toco', wings: 2 },
    { name: 'Nemo', fins: 3 },
  ];
  let creatureIndex = 0;
  const inButton = h('button', { attrs: { type: 'button' }, text: 'Alternar Bird/Fish' });
  inButton.classList.add('btn');
  inButton.addEventListener(
    'click',
    () => {
      creatureIndex = (creatureIndex + 1) % creatures.length;
      const creature = creatures[creatureIndex];
      if (creature !== undefined) {
        update('in', describeIn(creature));
      }
    },
    { signal },
  );

  // --- Botão: cicla Date / Timestamp / string (narrowing com `instanceof`) ---
  let sampleIndex = 0;
  const instanceButton = h('button', { attrs: { type: 'button' }, text: 'Próxima amostra' });
  instanceButton.classList.add('btn');
  instanceButton.addEventListener(
    'click',
    () => {
      sampleIndex = (sampleIndex + 1) % INSTANCEOF_SAMPLES.length;
      const sample = INSTANCEOF_SAMPLES[sampleIndex];
      if (sample !== undefined) {
        update('instanceof', describeInstanceof(sample));
      }
    },
    { signal },
  );

  const controls = h('div', { children: [input, inButton, instanceButton] });
  controls.classList.add('demo-slot__controls');

  root.replaceChildren(controls, table);
  // Estado inicial das linhas interativas.
  update('typeof', describeTypeof(parseScalar(input.value)));
  const firstCreature = creatures[0];
  if (firstCreature !== undefined) {
    update('in', describeIn(firstCreature));
  }
  const firstSample = INSTANCEOF_SAMPLES[0];
  if (firstSample !== undefined) {
    update('instanceof', describeInstanceof(firstSample));
  }

  // Cleanup obrigatório: aborta TODOS os listeners registrados com o signal.
  return () => {
    controller.abort();
  };
}
