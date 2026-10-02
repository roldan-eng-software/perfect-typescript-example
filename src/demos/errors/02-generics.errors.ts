/**
 * @file 02-generics.errors.ts
 * @purpose Código que DEVE falhar na compilação — cada @ts-expect-error é validado pelo
 *          próprio tsc: se o erro deixar de acontecer, a build quebra ("Unused directive").
 * @techniques Genéricos: mismatch de estágio do pipe, violação de constraint e índice
 *            fora do Record literal.
 * @usedBy src/components/error-showcase.ts (seção 02), npm run typecheck.
 */
import { groupBy, pipe } from '@/demos/02-generics';

// Convenção: a descrição DEPOIS da diretiva de expect-error é a mensagem exibida pela UI.
// Nota: o Prettier expande chamadas com VÁRIOS arrows em várias linhas, e a diretiva só
// cobre a linha seguinte — por isso o estágio 1 é uma referência nomeada (uma linha só).

const double = (n: number): number => n * 2;

// @ts-expect-error estágio 2 recebe number (saída do estágio 1), não string
pipe(1, double, (n) => n.toUpperCase());

// @ts-expect-error keyOf deve retornar PropertyKey (constraint K extends PropertyKey)
groupBy([1, 2, 3], (n) => ({ n }));

// @ts-expect-error Record<'big' | 'small'> não indexa com 'missing'
groupBy([1, 2], (n) => (n > 1 ? 'big' : 'small')).missing;
