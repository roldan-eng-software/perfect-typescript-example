/**
 * @file 08-branded-types.ts
 * @purpose Demonstração 08: tipos marcados (branded) — UserId, OrderId e Money são
 *          NOMINALMENTE distintos; trocar um pelo outro não compila.
 * @techniques Brand/intersection types; fábricas como ÚNICO ponto de as; genérico
 *            Brand<T, Label>; reuso do formatador Intl.
 * @usedBy main.ts (loader), index.html (seção 08), errors/08-branded.errors.ts,
 *          tests/types (Money × number), code-peek.
 */
import { h } from '@/core/dom';
import type { Cleanup } from '@/core/demo-registry';
import { formatCurrency } from '@/utils/format';

// ---------------------------------------------------------------------------
// Lógica pura (testável sem DOM)
// ---------------------------------------------------------------------------

/**
 * `Brand` cruza um primitivo com uma propriedade privada de marca:
 * `UserId` e `OrderId` são AMBOS `string` em runtime, mas incompatíveis no tipo —
 * nominal typing de verdade, sem classes.
 */
export type Brand<T, Label extends string> = T & { readonly __brand: Label };

export type UserId = Brand<string, 'UserId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type Money = Brand<number, 'Money'>;

/**
 * FÁBRICAS: os ÚNICOS lugares do projeto com `as` de marca — é aqui que a validação
 * (e a criação da marca) acontece; depois disso, o tipo garante o resto.
 */
export function createUserId(raw: string): UserId {
  return raw as UserId; // `as` justificado: fábrica única — valida e aplica a marca
}

export function createOrderId(raw: string): OrderId {
  return raw as OrderId; // `as` justificado: mesma razão da fábrica acima
}

export function money(amount: number): Money {
  return amount as Money; // `as` justificado: fábrica única de Money
}

/** Só UserId aqui embaixo — passar um OrderId é erro de compilação (ver errors/08). */
export function fetchUser(id: UserId): string {
  return `GET /users/${id}`;
}

export function addMoney(a: Money, b: Money): Money {
  return (a + b) as Money; // `as` justificado: soma de Money continua Money (fechamento)
}

export function formatMoney(value: Money): string {
  return formatCurrency(value);
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

export function init(root: HTMLElement): Cleanup {
  const controller = new AbortController();
  const { signal } = controller;

  const output = h('pre');
  output.classList.add('error-card__line');

  const run = (label: string, run_: () => string): void => {
    output.textContent = `${label}\n${run_()}`;
  };

  const correctButton = h('button', {
    attrs: { type: 'button' },
    text: 'fetchUser(createUserId(…))  ✓',
  });
  correctButton.classList.add('btn', 'btn--primary');
  correctButton.addEventListener(
    'click',
    () => {
      run('Chamada correta:', () => fetchUser(createUserId('usr_1')));
    },
    { signal },
  );

  const wrongButton = h('button', {
    attrs: { type: 'button' },
    text: 'fetchUser(createOrderId(…)) em runtime  ⚠',
  });
  wrongButton.classList.add('btn');
  wrongButton.addEventListener(
    'click',
    () => {
      // Este call NÃO compilaria com um argumento OrderId — por isso a fábrica do
      // usuário é convertida de volta: em runtime as marcas são apagadas, e é EXATAMENTE
      // isso que o compilador impede (o cartão ao lado mostra o erro real).
      const orderIdAsId = createUserId(String(createOrderId('ord_1')));
      run('Runtime executou (marcas apagadas) — o ERRO seria no compilador:', () =>
        fetchUser(orderIdAsId),
      );
    },
    { signal },
  );

  const moneyInput = h('input', {
    attrs: { type: 'number', value: '1234.56', 'aria-label': 'Valor em reais' },
  });
  moneyInput.classList.add('btn');
  const moneyButton = h('button', { attrs: { type: 'button' }, text: 'formatMoney(money(…))  ✓' });
  moneyButton.classList.add('btn');
  moneyButton.addEventListener(
    'click',
    () => {
      const amount = Number(moneyInput.value);
      run('Soma fechada em Money:', () => formatMoney(addMoney(money(amount), money(0.01))));
    },
    { signal },
  );

  const controls = h('div', { children: [correctButton, wrongButton, moneyInput, moneyButton] });
  controls.classList.add('demo-slot__controls');

  root.replaceChildren(
    h('p', {
      text: 'UserId, OrderId e Money são a MESMA coisa em runtime (string/número) e COISAS DIFERENTES no tipo. Os cartões abaixo vêm do compilador, não de mim:',
    }),
    controls,
    output,
  );

  return () => {
    controller.abort();
  };
}
