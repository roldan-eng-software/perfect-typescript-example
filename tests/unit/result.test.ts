/**
 * @file result.test.ts
 * @purpose Testes de runtime do Result<T, E> (core/result.ts): ok, err, guards e match.
 * @techniques União discriminada exercitada em runtime; type predicates.
 * @usedBy npm run test.
 */
import { describe, expect, it } from 'vitest';

import { err, isErr, isOk, match, ok, type Result } from '@/core/result';

/**
 * O CFA do TS afunila `const x: Result<...> = ok(5)` para `Ok<number>` — e aí `match`
 * perde o tipo de E. Passando por uma função com retorno anotado, o tipo largo sobrevive
 * (mesmo truque usado em tests/types/type-assertions.test-d.ts).
 */
function makeSuccess(): Result<number, string> {
  return ok(5);
}

function makeFailure(): Result<number, string> {
  return err('boom');
}

describe('result', () => {
  it('deve criar ok com value e discriminador ok=true', () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
  });

  it('deve criar err com error e discriminador ok=false', () => {
    const result = err('boom');
    expect(result).toEqual({ ok: false, error: 'boom' });
    expect(isOk(result)).toBe(false);
    expect(isErr(result)).toBe(true);
  });

  it('deve executar o ramo ok no match', () => {
    const label = match(makeSuccess(), {
      ok: (value) => `sucesso: ${value}`,
      err: (error) => `falha: ${error}`,
    });
    expect(label).toBe('sucesso: 5');
  });

  it('deve executar o ramo err no match', () => {
    const label = match(makeFailure(), {
      ok: (value) => `sucesso: ${value}`,
      err: (error) => `falha: ${error}`,
    });
    expect(label).toBe('falha: boom');
  });

  it('deve preservar o valor original em ok sem o transformar', () => {
    const user = { id: 'u1', name: 'Sandro' };
    const result: Result<typeof user, string> = ok(user);
    expect(result).toEqual({ ok: true, value: user });
  });
});
