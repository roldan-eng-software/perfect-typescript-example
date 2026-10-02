/**
 * @file type-assertions.test-d.ts
 * @purpose Prova em nível de tipo que Equal/Expect funcionam e que Result/match tipam corretamente.
 * @techniques expectTypeOf (Vitest) + Expect/Equal (helpers do projeto); testes que só "rodam" no tsc.
 * @usedBy npm run test:types.
 */
import { describe, expectTypeOf, it } from 'vitest';

import { err, match, ok, type Ok, type Result } from '@/core/result';
import type { Equal, Expect } from '@/utils/type-assertions';

/**
 * O CFA do TS afunila `const x: Result<...> = ok(10)` para `Ok<number>` (narrowing pelo
 * inicializador). Passando por uma função com tipo de retorno ANOTADO, o tipo largo
 * sobrevive — é assim que obtemos um `Result` de verdade para testar.
 */
function makeSuccess(): Result<number, string> {
  return ok(10);
}

function makeFailure(): Result<number, string> {
  return err('boom');
}

describe('type-assertions', () => {
  it('deve provar equivalência estrita com Equal/Expect', () => {
    expectTypeOf<Expect<Equal<{ id: string }, { id: string }>>>().toEqualTypeOf<true>();
    expectTypeOf<Equal<string, number>>().toEqualTypeOf<false>();
    // Equal distingue literal do tipo largado: 'a' NÃO é igual a string.
    expectTypeOf<Equal<'a', string>>().toEqualTypeOf<false>();
  });

  it('deve tipar Result, ok/err e o retorno de match', () => {
    const success = makeSuccess();
    const failure = makeFailure();
    expectTypeOf(success).toEqualTypeOf<Result<number, string>>();
    expectTypeOf(failure).toEqualTypeOf<Result<number, string>>();

    // ok(10) devolve Ok<number> — o construtor nunca mente sobre o ramo.
    expectTypeOf(ok(10)).toEqualTypeOf<Ok<number>>();

    const doubled = match(success, {
      ok: (value) => value * 2,
      err: (message) => message.length,
    });
    // Ramo ok devolve number e ramo err devolve number ⇒ R unificado é number.
    expectTypeOf(doubled).toEqualTypeOf<number>();
  });
});
