/**
 * @file domain.ts
 * @purpose Tipos de domínio compartilhados entre demos — o vocabulário JSON do projeto.
 * @techniques Tipos recursivos; Record; Extract para projetar o subtipo objeto.
 * @usedBy src/demos/05-type-guards-and-unknown.ts (isRecord),
 *          src/demos/11-async-and-typed-fetch.ts (validador).
 */

/**
 * Todo valor JSON válido, recursivamente — a forma que `JSON.parse` produz DEPOIS
 * de sair de `unknown`. Tipos recursivos permitem profundidade arbitrária sem
 * enumerar níveis (mesma técnica do RouteParams no demo 06).
 */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Subtipo "objeto" do Json — o que os validadores produzem ao fazer narrow. */
export type JsonObject = Record<string, Json>;
