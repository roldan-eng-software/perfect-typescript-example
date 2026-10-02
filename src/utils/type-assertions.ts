/**
 * @file type-assertions.ts
 * @purpose Helpers de teste em nível de tipo: provam equivalência EXATA entre tipos, sem executar nada.
 * @techniques Conditional types; type parameter com constraint (`T extends true`);
 *            truque de equivalência bidirecional pela assinatura de função.
 * @usedBy tests/types/*.test-d.ts.
 */

/**
 * `Equal<A, B>` compara tipos por EQUIVALÊNCIA EXATA (não por assignability —
 * `any` e literais largos passariam num simples `A extends B && B extends A`).
 * O truque: `() => A` só é mutuamente atribuível a `() => B` se A e B forem o mesmo tipo,
 * porque funções comparam parâmetros em posição inversa (contravariância).
 */
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/**
 * `Expect<T>` só é satisfazível quando `T` é `true`: escrever `Expect<Equal<X, Y>>`
 * com tipos diferentes NÃO compila, no próprio local do teste de tipo.
 */
export type Expect<T extends true> = T;
