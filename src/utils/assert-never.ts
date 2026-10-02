/**
 * @file assert-never.ts
 * @purpose Exaustividade: transforma "esqueci de tratar um caso" em erro de COMPILAÇÃO.
 * @techniques Tipo `never` como parâmetro obrigatório — só aceito quando a união foi esgotada.
 * @usedBy demos/04-discriminated-unions.ts, demos/* (switchs exaustivos), tests.
 */

/**
 * O parâmetro é `never`: dentro de um `switch` exaustivo sobre união discriminada,
 * o `default: assertNever(estado)` só compila se TODOS os ramos já tiverem sido
 * consumidos — acrescentar um estado novo sem tratá-lo quebra o `tsc`.
 *
 * Em runtime o valor nunca deveria chegar aqui; se chegar, é bug — e o erro é alto
 * de propósito (exceção para falha inesperada, conforme a política do projeto).
 */
export function assertNever(value: never, message = 'Unhandled union member'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
