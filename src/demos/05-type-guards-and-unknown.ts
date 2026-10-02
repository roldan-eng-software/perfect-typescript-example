/**
 * @file 05-type-guards-and-unknown.ts
 * @purpose Demonstração 05: JSON colado pelo usuário chega como `unknown` e só sai
 *          validado — type predicates + assertion function + erros por caminho.
 * @techniques Type predicates (`value is T`); assertion functions (`asserts value is T`);
 *            narrowing de unknown com typeof/isRecord; Result<Payload, Issue[]>.
 * @usedBy main.ts (loader), index.html (seção 05), code-peek,
 *          tests/unit/json-validator.test.ts.
 */
import { h } from '@/core/dom';
import type { Cleanup } from '@/core/demo-registry';
import { err, ok, type Result } from '@/core/result';
import type { JsonObject } from '@/types/domain';

// ---------------------------------------------------------------------------
// Lógica pura (testável sem DOM)
// ---------------------------------------------------------------------------

export interface Payload {
  readonly id: string;
  readonly count: number;
  readonly tags: readonly string[];
  readonly meta: { readonly active: boolean };
}

/** Erro ANOTADO por caminho — a UI lista exatamente onde e por quê falhou. */
export interface ValidationIssue {
  readonly path: string;
  readonly expected: string;
  readonly actual: string;
}

/**
 * Type predicate: a declaração `value is JsonObject` é uma AFIRMAÇÃO verificável em
 * runtime — depois do guard, o compilador permite `value[key]`.
 */
export function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Assertion function: `asserts input is Payload` — após a chamada, input É Payload. */
export function assertPayload(input: unknown): asserts input is Payload {
  const result = validatePayload(input);
  if (!result.ok) {
    throw new Error(result.error.map((issue) => `${issue.path}: ${issue.expected}`).join('; '));
  }
}

function issue(path: string, expected: string, actual: unknown): ValidationIssue {
  const actualType = actual === null ? 'null' : Array.isArray(actual) ? 'array' : typeof actual;
  return { path, expected, actual: actualType };
}

/**
 * Valoração camada a camada: cada campo tem seu próprio predicado, e TODAS as
 * falhas são coletadas (nunca fail-fast) — Result carrega a lista de issues.
 */
export function validatePayload(input: unknown): Result<Payload, ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return err([issue('root', 'object', input)]);
  }

  if (typeof input.id !== 'string') {
    issues.push(issue('id', 'string', input.id));
  }
  if (typeof input.count !== 'number' || Number.isNaN(input.count)) {
    issues.push(issue('count', 'number', input.count));
  }
  if (!Array.isArray(input.tags) || input.tags.some((tag) => typeof tag !== 'string')) {
    issues.push(issue('tags', 'string[]', input.tags));
  }
  const meta = input.meta;
  if (!isRecord(meta) || typeof meta.active !== 'boolean') {
    issues.push(issue('meta.active', 'boolean', isRecord(meta) ? meta.active : meta));
  }

  if (issues.length > 0) {
    return err(issues);
  }

  // Narrowing completo: os predicados acima provaram cada campo — o cast abaixo é
  // a ÚNICA ponte, e ela é segura porque a validação é exaustiva (comentário de
  // primeiro uso de "validar then cast" — o padrão de qualquer parser de JSON).
  const value = input as unknown as {
    id: string;
    count: number;
    tags: string[];
    meta: { active: boolean };
  };
  return ok(value);
}

/** unknown vs any — texto exibido na UI (any não pode existir no código do repo). */
export const UNKNOWN_VS_ANY: ReadonlyArray<{ readonly any: string; readonly unknown: string }> = [
  {
    any: 'const x: any = JSON.parse(t); x.qualquer.coisa() // compila, explode em runtime',
    unknown: 'const x: unknown = JSON.parse(t); x.qualquer // ERRO: trate antes',
  },
  {
    any: 'silencia erros — propaga qualquer coisa',
    unknown: 'silencia erros — força você a validar',
  },
  { any: 'atribuível a qualquer tipo', unknown: 'só sai de unknown com narrowing explícito' },
];

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const SAMPLE_JSON =
  '{\n  "id": "abc-1",\n  "count": 42,\n  "tags": ["ts", "strict"],\n  "meta": { "active": true }\n}';

export function init(root: HTMLElement): Cleanup {
  const controller = new AbortController();
  const { signal } = controller;

  const textarea = h('textarea', {
    attrs: { 'aria-label': 'JSON para validar', rows: '8' },
    text: SAMPLE_JSON,
  });
  textarea.classList.add('btn');

  const resultBox = h('div');
  resultBox.classList.add('error-showcase__list');

  const showOk = (payload: Payload): void => {
    resultBox.replaceChildren(
      h('p', { children: [h('strong', { text: '✓ válido — ' }), 'unknown virou Payload tipado'] }),
      h('code', { text: JSON.stringify(payload, null, 2) }),
    );
  };

  const showErr = (issues: ValidationIssue[]): void => {
    resultBox.replaceChildren(
      h('p', { children: [h('strong', { text: `✗ ${issues.length} problema(s):` })] }),
    );
    for (const item of issues) {
      const line = h('p');
      line.classList.add('error-card__message');
      line.append(
        h('strong', { text: `${item.path} ` }),
        `esperado ${item.expected}, recebido ${item.actual}`,
      );
      resultBox.append(line);
    }
  };

  const validateButton = h('button', {
    attrs: { type: 'button' },
    text: 'Validar (type predicates)',
  });
  validateButton.classList.add('btn', 'btn--primary');
  validateButton.addEventListener(
    'click',
    () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(textarea.value);
      } catch (error) {
        showErr([
          {
            path: 'json',
            expected: 'JSON válido',
            actual: error instanceof Error ? error.message : 'erro desconhecido',
          },
        ]);
        return;
      }
      const result = validatePayload(parsed); // parsed é unknown — só a validação narrow
      if (result.ok) {
        showOk(result.value);
      } else {
        showErr(result.error);
      }
    },
    { signal },
  );

  const assertButton = h('button', {
    attrs: { type: 'button' },
    text: 'Validar (assertion function)',
  });
  assertButton.classList.add('btn');
  assertButton.addEventListener(
    'click',
    () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(textarea.value);
      } catch {
        showErr([{ path: 'json', expected: 'JSON válido', actual: 'sintaxe' }]);
        return;
      }
      try {
        assertPayload(parsed);
        // Depois da assertion: parsed É Payload (narrowing por `asserts`).
        showOk(parsed);
      } catch (error) {
        showErr([
          {
            path: 'assert',
            expected: 'Payload',
            actual: error instanceof Error ? error.message : '?',
          },
        ]);
      }
    },
    { signal },
  );

  const controls = h('div', { children: [validateButton, assertButton] });
  controls.classList.add('demo-slot__controls');

  const anyTable = h('table', { attrs: { 'aria-label': 'unknown versus any' } });
  anyTable.classList.add('doc-table');
  const anyBody = h('tbody');
  for (const row of UNKNOWN_VS_ANY) {
    anyBody.append(
      h('tr', { children: [h('td', { text: row.any }), h('td', { text: row.unknown })] }),
    );
  }
  anyTable.append(
    h('thead', {
      children: [h('tr', { children: [h('th', { text: 'any' }), h('th', { text: 'unknown' })] })],
    }),
    anyBody,
  );

  root.replaceChildren(
    h('label', { text: 'Cole um JSON (chega como unknown):' }),
    textarea,
    controls,
    resultBox,
    anyTable,
  );

  return () => {
    controller.abort();
  };
}
