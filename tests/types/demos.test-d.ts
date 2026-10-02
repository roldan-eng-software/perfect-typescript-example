/**
 * @file demos.test-d.ts
 * @purpose Provas em nível de tipo das demos: RouteParams extrai parâmetros, Money não
 *          aceita number puro e o union de estados é totalmente coberto (never).
 * @techniques expectTypeOf; Expect/Equal; Exclude para exaustividade; not.toBeAssignableTo.
 * @usedBy npm run test:types.
 */
import { describe, expectTypeOf, it } from 'vitest';

import type { RequestState } from '@/demos/04-discriminated-unions';
import type { Money, OrderId, UserId } from '@/demos/08-branded-types';
import type { RouteParams } from '@/demos/06-mapped-conditional-template';
import type { Product } from '@/demos/11-async-and-typed-fetch';
import type { Equal, Expect } from '@/utils/type-assertions';

describe('route params (demo 06)', () => {
  it('deve extrair { id } de /users/:id', () => {
    expectTypeOf<RouteParams<'/users/:id'>>().toEqualTypeOf<{ id: string }>();
  });

  it('deve extrair múltiplos parâmetros na ordem do caminho', () => {
    expectTypeOf<RouteParams<'/users/:id/posts/:postId'>>().toEqualTypeOf<{
      id: string;
      postId: string;
    }>();
  });

  it('deve devolver o tipo vazio para rotas sem params', () => {
    // As duas linhas são o comportamento sob teste: rota sem :params É o objeto vazio
    // (a regra resolve o alias até `{}` e marcaria — por isso o disable apontado).
    // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- rota sem params = objeto vazio (comportamento esperado)
    expectTypeOf<keyof RouteParams<'/about'>>().toEqualTypeOf<never>();
    // eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- idem: prova o mesmo ramo com Expect/Equal
    expectTypeOf<Expect<Equal<keyof RouteParams<'/about'>, never>>>().toEqualTypeOf<true>();
  });
});

/** Assignability em nível de tipo: `A extends B` decide true/false sem executar. */
type IsAssignable<A, B> = A extends B ? true : false;

describe('branded types (demo 08)', () => {
  it('deve impedir que number puro seja aceito onde se pede Money', () => {
    expectTypeOf<IsAssignable<number, Money>>().toEqualTypeOf<false>();
    // E a marca torna Money DIFERENTE de number (não é só um alias).
    expectTypeOf<Equal<Money, number>>().toEqualTypeOf<false>();
  });

  it('deve impedir trocar UserId por OrderId (marcas distintas)', () => {
    expectTypeOf<IsAssignable<UserId, OrderId>>().toEqualTypeOf<false>();
    expectTypeOf<IsAssignable<OrderId, UserId>>().toEqualTypeOf<false>();
  });
});

describe('exaustividade (demo 04)', () => {
  it('deve cobrir RequestState por completo — o que sobra para assertNever é never', () => {
    type Untreated = Exclude<
      RequestState,
      | { readonly status: 'idle' }
      | { readonly status: 'loading'; readonly startedAt: number }
      | { readonly status: 'success'; readonly data: string }
      | { readonly status: 'error'; readonly message: string }
    >;
    expectTypeOf<Untreated>().toEqualTypeOf<never>();
    expectTypeOf<Expect<Equal<Untreated, never>>>().toEqualTypeOf<true>();
  });
});

describe('fetch tipado (demo 11)', () => {
  it('deve manter Product como contrato de saída validada', () => {
    expectTypeOf<Product['price']>().toEqualTypeOf<number>();
    expectTypeOf<Product['name']>().toEqualTypeOf<string>();
  });
});
