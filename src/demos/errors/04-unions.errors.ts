/**
 * @file 04-unions.errors.ts
 * @purpose Código que DEVE falhar: um estado novo (e um evento novo) fora da união
 *          discriminada — exatamente o que o switch exaustivo do demo 04 impede.
 * @techniques União discriminada fechada; discriminated excess property em chamada.
 * @usedBy src/components/error-showcase.ts (seção 04), npm run typecheck.
 */
import { describeState, transition } from '@/demos/04-discriminated-unions';

// Convenção: descrição após a diretiva = mensagem exibida pela UI.

// @ts-expect-error 'paused' não existe em RequestState — o reducer não teria ramo para ele
transition({ status: 'paused' }, { type: 'fetch', at: 0 });

// @ts-expect-error 'pause' não existe em RequestEvent — uniões fechadas dos DOIS lados
transition({ status: 'idle' }, { type: 'pause' });

// @ts-expect-error `message` só existe no ramo 'error' — em união inteira é erro
describeState({ status: 'success', data: 'x', message: 'extra' });
