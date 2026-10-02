/**
 * @file 08-branded.errors.ts
 * @purpose Código que DEVE falhar: misturar marcas nominais (OrderId onde se pede
 *          UserId, number puro onde se pede Money).
 * @techniques Brand types; subtyping assimétrico (number → Money é bloqueado).
 * @usedBy src/components/error-showcase.ts (seção 08), npm run typecheck.
 */
import { addMoney, createOrderId, fetchUser, formatMoney, money } from '@/demos/08-branded-types';

// Convenção: descrição após a diretiva = mensagem exibida pela UI.

// @ts-expect-error OrderId não é UserId — a marca __brand impede a mistura
fetchUser(createOrderId('ord_1'));

// @ts-expect-error number puro não é Money — só a fábrica money() cria a marca
formatMoney(100);

// @ts-expect-error um dos operandos não é Money — addMoney fecha o domínio
addMoney(money(10), 5);

// @ts-expect-error string crua não é UserId — use a fábrica createUserId
fetchUser('usr_raw');
