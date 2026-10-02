/**
 * @file json-validator.test.ts
 * @purpose Testes de runtime do validador com type predicates (demo 05) — casos válidos e inválidos.
 * @techniques Validação de unknown; erros anotados por caminho.
 * @usedBy npm run test.
 */
import { describe, expect, it } from 'vitest';

import { assertPayload, isRecord, validatePayload } from '@/demos/05-type-guards-and-unknown';

const VALID = {
  id: 'abc-1',
  count: 42,
  tags: ['ts', 'strict'],
  meta: { active: true },
} as const;

describe('validador de JSON', () => {
  it('deve aceitar um payload válido', () => {
    const result = validatePayload(VALID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.count).toBe(42);
      expect(result.value.tags).toEqual(['ts', 'strict']);
    }
  });

  it('deve aceitar o resultado de JSON.parse (unknown puro)', () => {
    const parsed: unknown = JSON.parse(JSON.stringify(VALID));
    const result = validatePayload(parsed);
    expect(result.ok).toBe(true);
  });

  it('deve rejeitar raiz que não é objeto com caminho root', () => {
    const result = validatePayload('não sou objeto');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error[0]?.path).toBe('root');
      expect(result.error[0]?.expected).toBe('object');
    }
  });

  it('deve apontar o caminho exato quando count tem tipo errado', () => {
    const result = validatePayload({ ...VALID, count: '42' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.map((issue) => issue.path)).toEqual(['count']);
      expect(result.error[0]?.actual).toBe('string');
    }
  });

  it('deve acumular TODOS os erros (nunca fail-fast)', () => {
    const result = validatePayload({ id: 1, count: 'x', tags: 'nao-array', meta: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.map((issue) => issue.path)).toEqual([
        'id',
        'count',
        'tags',
        'meta.active',
      ]);
    }
  });

  it('isRecord deve distinguir objetos de arrays e null', () => {
    expect(isRecord(VALID)).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('texto')).toBe(false);
  });

  it('assertPayload não deve lançar para payload válido e deve lançar para inválido', () => {
    expect(() => {
      assertPayload(VALID);
    }).not.toThrow();
    expect(() => {
      assertPayload({ id: 'x' });
    }).toThrow();
  });
});
