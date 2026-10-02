/**
 * @file 09-result-error-handling.ts
 * @purpose Demonstração 09: parser de datas/números que FALHA COMO DADO — ok/err/match
 *          sem try/catch — comparado lado a lado com o estilo exceção.
 * @techniques Result<T, E> do core; classe abstrata com implements e override;
 *            match() exaustivo; hierarquia de erros como classes.
 * @usedBy main.ts (loader), index.html (seção 09), code-peek.
 */
import { h } from '@/core/dom';
import type { Cleanup } from '@/core/demo-registry';
import { err, match, ok, type Result } from '@/core/result';
import { formatDate } from '@/utils/format';

// ---------------------------------------------------------------------------
// Lógica pura (testável sem DOM)
// ---------------------------------------------------------------------------

/** Contrato de objeto — implementado pela hierarquia de issues abaixo. */
export interface Describable {
  describe(): string;
}

/**
 * Erro como VALOR: abstrata + implements mostram classes de verdade — o compilador
 * exige `override` em cada code da subclasse (noImplicitOverride está ligado).
 */
export abstract class ParseIssue implements Describable {
  public constructor(public readonly input: string) {}

  public abstract readonly code: string;

  public describe(): string {
    return `${this.code}: "${this.input}"`;
  }
}

export class InvalidDateIssue extends ParseIssue {
  override readonly code = 'invalid-date';
}

export class InvalidNumberIssue extends ParseIssue {
  override readonly code = 'invalid-number';
}

export function parseDate(input: string): Result<Date, ParseIssue> {
  const trimmed = input.trim();
  if (trimmed === '') {
    return err(new InvalidDateIssue(input));
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return err(new InvalidDateIssue(input));
  }
  return ok(date);
}

const PT_BR_DECIMAL = /^-?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^-?\d+(?:,\d{1,2})?$/;

export function parseDecimalPtBr(input: string): Result<number, ParseIssue> {
  const trimmed = input.trim();
  if (!PT_BR_DECIMAL.test(trimmed)) {
    return err(new InvalidNumberIssue(input));
  }
  const value = Number(trimmed.replace(/\./g, '').replace(',', '.'));
  if (Number.isNaN(value)) {
    return err(new InvalidNumberIssue(input));
  }
  return ok(value);
}

/** Comparação exibida na UI: o MESMO fluxo com exceção (para lembrar o custo). */
export const TRY_CATCH_COMPARISON: ReadonlyArray<{
  readonly withResult: string;
  readonly withTryCatch: string;
}> = [
  {
    withResult: 'const r = parseDate(x); match(r, { ok, err }) // falha no TIPO',
    withTryCatch: 'try { parseDate(x) } catch (e) { /* e: unknown — trate às cegas */ }',
  },
  {
    withResult: 'ok e err são dados: logar, compor e retentar sem desempilhar stack',
    withTryCatch: 'exceção corta o fluxo: só um catch por volta, stack sempre presente',
  },
  {
    withResult: 'Result<Date, ParseIssue> — você SABE o formato do erro',
    withTryCatch: 'catch (e) — desconhecido até e instanceof ser escrito',
  },
];

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

export function init(root: HTMLElement): Cleanup {
  const controller = new AbortController();
  const { signal } = controller;

  const dateInput = h('input', {
    attrs: { type: 'text', value: '2026-10-02', 'aria-label': 'Data para parse' },
  });
  const numberInput = h('input', {
    attrs: { type: 'text', value: '1.234,56', 'aria-label': 'Número pt-BR para parse' },
  });
  for (const input of [dateInput, numberInput]) {
    input.classList.add('btn');
  }

  const dateOutput = h('pre');
  const numberOutput = h('pre');
  for (const pre of [dateOutput, numberOutput]) {
    pre.classList.add('error-card__line');
  }

  const renderResult = <T>(result: Result<T, ParseIssue>, format: (value: T) => string): string =>
    match(result, {
      ok: (value) => `✓ ok(${format(value)})`,
      // err tipado: a classe é conhecida — instanceof abaixo é narrowing real
      err: (issue) =>
        `✗ err — ${issue.describe()}${
          issue instanceof InvalidDateIssue ? ' (subclasse InvalidDateIssue)' : ''
        }`,
    });

  const dateButton = h('button', { attrs: { type: 'button' }, text: 'parseDate' });
  dateButton.classList.add('btn', 'btn--primary');
  dateButton.addEventListener(
    'click',
    () => {
      dateOutput.textContent = renderResult(parseDate(dateInput.value), (date) => formatDate(date));
    },
    { signal },
  );

  const numberButton = h('button', { attrs: { type: 'button' }, text: 'parseDecimalPtBr' });
  numberButton.classList.add('btn', 'btn--primary');
  numberButton.addEventListener(
    'click',
    () => {
      numberOutput.textContent = renderResult(parseDecimalPtBr(numberInput.value), (value) =>
        value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      );
    },
    { signal },
  );

  const controls = h('div', { children: [dateInput, dateButton, numberInput, numberButton] });
  controls.classList.add('demo-slot__controls');

  const table = h('table', { attrs: { 'aria-label': 'Result versus try/catch' } });
  table.classList.add('doc-table');
  const body = h('tbody');
  for (const row of TRY_CATCH_COMPARISON) {
    body.append(
      h('tr', {
        children: [h('td', { text: row.withResult }), h('td', { text: row.withTryCatch })],
      }),
    );
  }
  table.append(
    h('thead', {
      children: [
        h('tr', { children: [h('th', { text: 'Result<T, E>' }), h('th', { text: 'try/catch' })] }),
      ],
    }),
    body,
  );

  root.replaceChildren(
    h('p', {
      text: 'Nenhum try/catch aqui embaixo: falha é valor (err), não exceção. O parser abaixo devolve Result e o match obrigatório trata os dois ramos.',
    }),
    controls,
    dateOutput,
    numberOutput,
    table,
  );

  // Estado inicial já com um fluxo executado.
  dateOutput.textContent = renderResult(parseDate(dateInput.value), (date) => formatDate(date));
  numberOutput.textContent = renderResult(parseDecimalPtBr(numberInput.value), (value) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
  );

  return () => {
    controller.abort();
  };
}
