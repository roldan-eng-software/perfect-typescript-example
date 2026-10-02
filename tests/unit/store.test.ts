/**
 * @file store.test.ts
 * @purpose Testes de runtime do store reativo genérico (core/store.ts).
 * @techniques Testes unitários com Vitest; tupla como tipo de dado ordenado.
 * @usedBy npm run test.
 */
import { describe, expect, it } from 'vitest';

import { createStore } from '@/core/store';

describe('store', () => {
  it('deve iniciar com o valor fornecido', () => {
    const store = createStore({ count: 0 });
    expect(store.get()).toEqual({ count: 0 });
  });

  it('deve aceitar valor direto em set', () => {
    const store = createStore('a');
    store.set('b');
    expect(store.get()).toBe('b');
  });

  it('deve aceitar atualização funcional em set', () => {
    const store = createStore(1);
    store.set((previous) => previous + 1);
    expect(store.get()).toBe(2);
  });

  it('deve notificar assinantes com o valor novo e o anterior', () => {
    const store = createStore('a');
    // Tupla: a POSIÇÃO carrega semântica (novo, anterior) — trocar a ordem vira erro de tipo.
    const seen: Array<[string, string]> = [];
    store.subscribe((value, previous) => {
      seen.push([value, previous]);
    });
    store.set('b');
    expect(seen).toEqual([['b', 'a']]);
  });

  it('deve deixar de notificar depois do unsubscribe', () => {
    const store = createStore(0);
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    store.set(1);
    unsubscribe();
    store.set(2);
    expect(calls).toBe(1);
  });
});
