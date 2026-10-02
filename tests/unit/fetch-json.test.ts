/**
 * @file fetch-json.test.ts
 * @purpose Testes de runtime do fetchJson<T> (demo 11) com fetch mockado: ok, http,
 *          invalid-shape, abort prévio, retry de rede e timeout determinístico.
 * @techniques vi.stubGlobal para mockar fetch; fake timers para timeout; AbortSignal.
 * @usedBy npm run test.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchJson, validateProducts } from '@/demos/11-async-and-typed-fetch';

const PRODUCTS = [
  { id: 'p-1', name: 'Teclado', price: 100 },
  { id: 'p-2', name: 'Mouse', price: 50 },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('fetchJson', () => {
  it('deve retornar ok com os dados validados', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(PRODUCTS))),
    );

    const result = await fetchJson('/api/products', validateProducts);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]?.name).toBe('Teclado');
    }
  });

  it('deve falhar com código http em resposta 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ message: 'not found' }, 404))),
    );

    const result = await fetchJson('/api/missing', validateProducts);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('http');
      expect(result.error.detail).toContain('404');
    }
  });

  it('deve falhar com invalid-shape quando o formato não bate', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({ não: 'é lista' }))),
    );

    const result = await fetchJson('/api/products', validateProducts);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid-shape');
    }
  });

  it('deve devolver aborted SEM chamar fetch quando o sinal já veio cancelado', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(jsonResponse(PRODUCTS)));
    vi.stubGlobal('fetch', fetchSpy);

    const controller = new AbortController();
    controller.abort();

    const result = await fetchJson('/api/products', validateProducts, {
      signal: controller.signal,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('aborted');
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('deve RETRAR falha de rede e recuperar na segunda tentativa', async () => {
    const fetchSpy = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(jsonResponse(PRODUCTS));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await fetchJson('/api/products', validateProducts, { retries: 1 });

    expect(result.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('deve abortar por TIMEOUT e reportar o código timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      ),
    );

    const pending = fetchJson('/api/lenta', validateProducts, { timeoutMs: 50, retries: 0 });
    await vi.advanceTimersByTimeAsync(60);
    const result = await pending;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('timeout');
    }
  });
});
