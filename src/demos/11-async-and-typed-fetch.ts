/**
 * @file 11-async-and-typed-fetch.ts
 * @purpose Demonstração 11: cliente HTTP tipado — fetchJson<T> valida a resposta em
 *          runtime, com AbortController, timeout e retry. A "API" é um JSON local.
 * @techniques Promise/Awaited; AbortController + timeout; retry tipado; narrowing de
 *            unknown via validador; Result como contrato de falha.
 * @usedBy main.ts (loader), index.html (seção 11), tests/unit/fetch-json.test.ts, code-peek.
 */
import { h } from '@/core/dom';
import type { Cleanup } from '@/core/demo-registry';
import { err, ok, type Result } from '@/core/result';

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
}

/** Falha classificada: a UI traduz cada código (nunca string solta de runtime). */
export type FetchFailureCode =
  'http' | 'network' | 'timeout' | 'aborted' | 'invalid-json' | 'invalid-shape';

export interface FetchFailure {
  readonly code: FetchFailureCode;
  readonly detail: string;
}

export type Validator<T> = (input: unknown) => Result<T, string>;

export interface FetchJsonOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly retries?: number;
}

// ---------------------------------------------------------------------------
// Validação da "API" (o JSON chega como unknown — nunca como Product[])
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateProducts(input: unknown): Result<Product[], string> {
  if (!Array.isArray(input)) {
    return err(`esperado array, recebido ${typeof input}`);
  }
  const products: Product[] = [];
  for (const [index, item] of input.entries()) {
    if (!isRecord(item)) {
      return err(`[${index}]: esperado objeto`);
    }
    if (
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.price !== 'number'
    ) {
      return err(`[${index}]: id/name devem ser string e price number`);
    }
    products.push({ id: item.id, name: item.name, price: item.price });
  }
  return ok(products);
}

// ---------------------------------------------------------------------------
// O cliente
// ---------------------------------------------------------------------------

/**
 * Lê `aborted` por uma função: `AbortSignal.aborted` é `readonly` e o CFA afunila a
 * leitura para `false` após o guard do início — mas em runtime o sinal MUDA durante o
 * await. Passando por função com retorno `boolean`, cada leitura é honesta de novo.
 */
function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted ?? false;
}

/**
 * fetch com contrato: T sai validado, falha sai classificada. Cada tentativa tem
 * SEU AbortController (timeout) encadeado ao signal do chamador (cancelamento).
 * `retries` cobre apenas falhas transitórias (rede/timeout) — 404 não adianta repetir.
 */
export async function fetchJson<T>(
  url: string,
  validate: Validator<T>,
  options: FetchJsonOptions = {},
): Promise<Result<T, FetchFailure>> {
  const { timeoutMs = 4000, retries = 0, signal } = options;
  let lastFailure: FetchFailure = { code: 'network', detail: 'nenhuma tentativa executada' };

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (isAborted(signal)) {
      return err({ code: 'aborted', detail: 'cancelado antes da tentativa' });
    }

    const attemptController = new AbortController();
    const relayAbort = (): void => {
      attemptController.abort();
    };
    signal?.addEventListener('abort', relayAbort, { once: true });
    let timedOut = false;
    // Leitura por função: o CFA afunila `timedOut` para `false` (o valor do inicializador)
    // e ignora a atribuição feita DENTRO do setTimeout — a chamada devolve `boolean` de novo.
    const didTimeOut = (): boolean => timedOut;
    const timer = setTimeout(() => {
      timedOut = true;
      attemptController.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, { signal: attemptController.signal });
      if (!response.ok) {
        // HTTP 4xx/5xx não é transitório: devolve agora (repetir não mudaria nada).
        return err({ code: 'http', detail: `HTTP ${response.status}` });
      }
      // JSON.parse/response.json() devolvem `any` por especificação — convertemos
      // IMEDIATAMENTE para unknown (`as` justificado) para só a validação decidir.
      const text = await response.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch (error) {
        return err({ code: 'invalid-json', detail: error instanceof Error ? error.message : '?' });
      }
      const validated = validate(parsed);
      if (!validated.ok) {
        return err({ code: 'invalid-shape', detail: validated.error });
      }
      return ok(validated.value);
    } catch (error) {
      if (isAborted(signal)) {
        return err({ code: 'aborted', detail: 'cancelado pelo chamador' });
      }
      if (didTimeOut()) {
        lastFailure = { code: 'timeout', detail: `sem resposta em ${timeoutMs}ms` };
      } else {
        lastFailure = {
          code: 'network',
          detail: error instanceof Error ? error.message : String(error),
        };
      }
      // transitório → próxima tentativa (o finally limpa timer/listener)
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', relayAbort);
    }
  }

  return err(lastFailure);
}

// ---------------------------------------------------------------------------
// "API" local (public/data/products.json) e atalho com Awaited
// ---------------------------------------------------------------------------

export function productsUrl(): string {
  // BASE_URL do Vite: o caminho funciona em dev E no GitHub Pages.
  return `${import.meta.env.BASE_URL}data/products.json`;
}

export function loadProducts(signal?: AbortSignal): Promise<Result<Product[], FetchFailure>> {
  // Spread condicional: sob exactOptionalPropertyTypes, `signal: undefined` explícito
  // não é aceito em `signal?: AbortSignal` — a chave só existe quando há sinal.
  return fetchJson(productsUrl(), validateProducts, {
    ...(signal !== undefined ? { signal } : {}),
    retries: 1,
    timeoutMs: 4000,
  });
}

/** Awaited desembrulha a Promise — o tipo DEPOIS do await, derivado da função. */
export type LoadProductsResult = Awaited<ReturnType<typeof loadProducts>>;

export const FAILURE_LABELS: Readonly<Record<FetchFailureCode, string>> = {
  http: 'HTTP não-2xx — tente outra URL',
  network: 'falha de rede — o retry pode ajudar',
  timeout: 'timeout — abortado pelo relógio',
  aborted: 'cancelado pelo visitante',
  'invalid-json': 'resposta não é JSON válido',
  'invalid-shape': 'JSON válido, mas com formato errado',
};

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

export function init(root: HTMLElement): Cleanup {
  const controller = new AbortController();
  const { signal } = controller;
  let activeRequest: AbortController | null = null;

  const output = h('pre');
  output.classList.add('error-card__line');

  const loadButton = h('button', { attrs: { type: 'button' }, text: 'loadProducts()' });
  loadButton.classList.add('btn', 'btn--primary');
  loadButton.addEventListener(
    'click',
    () => {
      activeRequest?.abort();
      activeRequest = new AbortController();
      output.textContent = '… carregando (retries: 1, timeout: 4s)';
      void loadProducts(activeRequest.signal).then((result) => {
        if (result.ok) {
          output.textContent = result.value
            .map((product) => `${product.id} — ${product.name} — R$ ${product.price.toFixed(2)}`)
            .join('\n');
        } else {
          output.textContent = `✗ ${result.error.code}: ${result.error.detail}\n(${FAILURE_LABELS[result.error.code]})`;
        }
      });
    },
    { signal },
  );

  const cancelButton = h('button', { attrs: { type: 'button' }, text: 'abort()' });
  cancelButton.classList.add('btn');
  cancelButton.addEventListener(
    'click',
    () => {
      activeRequest?.abort();
      output.textContent = '✗ aborted: cancelado pelo chamador';
    },
    { signal },
  );

  const urlInput = h('input', {
    attrs: { type: 'text', value: 'data/nao-existe.json', 'aria-label': 'URL alternativa' },
  });
  urlInput.classList.add('btn');
  const httpFailButton = h('button', { attrs: { type: 'button' }, text: 'URL quebrada → http' });
  httpFailButton.classList.add('btn');
  httpFailButton.addEventListener(
    'click',
    () => {
      void fetchJson(urlInput.value, validateProducts, { retries: 0 }).then((result) => {
        output.textContent = result.ok
          ? '✓ ok (URL inesperadamente válida)'
          : `✗ ${result.error.code}: ${result.error.detail}\n(${FAILURE_LABELS[result.error.code]})`;
      });
    },
    { signal },
  );

  const shapeFailButton = h('button', {
    attrs: { type: 'button' },
    text: 'validador que rejeita → invalid-shape',
  });
  shapeFailButton.classList.add('btn');
  shapeFailButton.addEventListener(
    'click',
    () => {
      // Endpoint correto, validador rigoroso demais de propósito: JSON chega e a
      // FORMA é recusada — falha de domínio, não de rede.
      void fetchJson(productsUrl(), () => err('formato recusado de propósito'), {
        retries: 0,
      }).then((result) => {
        output.textContent = result.ok
          ? '✓ ok (não esperado neste botão)'
          : `✗ ${result.error.code}: ${result.error.detail}\n(${FAILURE_LABELS[result.error.code]})`;
      });
    },
    { signal },
  );

  const controls = h('div', {
    children: [loadButton, cancelButton, urlInput, httpFailButton, shapeFailButton],
  });
  controls.classList.add('demo-slot__controls');

  root.replaceChildren(
    h('p', {
      text: 'A "API" é public/data/products.json — sem rede externa. Resposta chega como unknown e só vira Product[] depois da validação; cancelamento e timeout usam AbortController.',
    }),
    controls,
    output,
  );
  output.textContent = 'Pronto — clique em loadProducts().';

  return () => {
    controller.abort();
    activeRequest?.abort();
  };
}
