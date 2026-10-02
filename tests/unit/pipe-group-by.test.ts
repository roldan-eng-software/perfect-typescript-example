/**
 * @file pipe-group-by.test.ts
 * @purpose Testes de runtime do pipe (sobrecargas) e do groupBy (constraint + const K).
 * @techniques Validação das funções puras do demo 02 sem tocar em DOM.
 * @usedBy npm run test.
 */
import { describe, expect, it } from 'vitest';

import {
  DOUBLE_LIST,
  SAMPLE,
  SORT_ASC,
  SUM,
  groupBy,
  pipelineReference,
  pipe,
} from '@/demos/02-generics';

describe('pipe', () => {
  it('deve devolver o valor original quando não há estágios', () => {
    expect(pipe(42)).toBe(42);
  });

  it('deve aplicar os estágios na ordem encadeada', () => {
    expect(
      pipe(
        2,
        (n) => n + 1,
        (n) => n * 10,
      ),
    ).toBe(30);
  });

  it('deve compor a cadeia de 3 estágios do pipelineReference', () => {
    // SAMPLE [5,3,8,1] → DOUBLE [10,6,16,2] → SORT [2,6,10,16] → SUM = 34
    expect(DOUBLE_LIST(SAMPLE)).toEqual([10, 6, 16, 2]);
    expect(SORT_ASC(DOUBLE_LIST(SAMPLE))).toEqual([2, 6, 10, 16]);
    expect(pipelineReference()).toBe(34);
    expect(SUM([1, 2, 3])).toBe(6);
  });
});

describe('groupBy', () => {
  it('deve agrupar números por paridade com chaves literais', () => {
    const groups = groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? 'even' : 'odd'));
    // K inferido como 'even' | 'odd' (const type parameter) — acesso direto, sem | undefined.
    expect(groups.even).toEqual([2, 4]);
    expect(groups.odd).toEqual([1, 3]);
  });

  it('deve agrupar objetos pela propriedade escolhida', () => {
    const people = [
      { name: 'Ana', role: 'admin' },
      { name: 'Bia', role: 'guest' },
      { name: 'Caio', role: 'admin' },
    ];
    const byRole = groupBy(people, (person) => person.role);
    expect(byRole.admin).toEqual([
      { name: 'Ana', role: 'admin' },
      { name: 'Caio', role: 'admin' },
    ]);
    expect(byRole.guest).toEqual([{ name: 'Bia', role: 'guest' }]);
  });

  it('deve preservar a ordem de inserção das chaves', () => {
    const groups = groupBy([3, 1, 4, 1, 5], (n) => (n > 2 ? 'big' : 'small'));
    expect(Object.keys(groups)).toEqual(['big', 'small']);
  });

  it('deve devolver buckets vazios ausentes quando não há itens', () => {
    const groups = groupBy([], (n: number) => (n % 2 === 0 ? 'even' : 'odd'));
    expect(Object.keys(groups)).toEqual([]);
  });
});
