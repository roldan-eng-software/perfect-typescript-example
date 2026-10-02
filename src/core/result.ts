/**
 * @file result.ts
 * @purpose Result<T, E> — falha como DADO, não como exceção: ok/err/match sem try/catch.
 * @techniques União discriminada pelo campo literal `ok`; type predicates (`is`);
 *            genéricos; readonly em todos os campos.
 * @usedBy core/demo-registry.ts, demos/09-result-error-handling.ts, tests.
 */

/**
 * Critério de forma (ver ARCHITECTURE.md): `interface` para formatos de objeto — mesmo
 * quando são constituintes de união (a regra consistent-type-definitions e as boas
 * mensagens de erro do tsc favorecem interface); `type` para a união e tipos computados.
 * `ok` é a LITERAL que discrimina — o compilador ramifica por ela, sem checagem manual.
 */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** União discriminada: todo valor tem exatamente um dos dois formatos, e `ok` diz qual. */
export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Type predicate (`result is Ok<T>`): a checagem de runtime vira NARROWING de tipo —
 * depois de `if (isOk(r))`, `r.value` existe no tipo, sem `as`.
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

export interface MatchArms<T, E, R> {
  readonly ok: (value: T) => R;
  readonly err: (error: E) => R;
}

/**
 * `match` exige OS DOIS ramos nos tipos: esquecer o `err` não compila, e um ramo
 * novo em `Result` só volta a compilar quando alguém trata o caso — exaustividade
 * em nível de API, não de switch.
 */
export function match<T, E, R>(result: Result<T, E>, arms: MatchArms<T, E, R>): R {
  // Narrowing pelo discriminante literal `ok` funciona até dentro de expressão condicional.
  return result.ok ? arms.ok(result.value) : arms.err(result.error);
}
