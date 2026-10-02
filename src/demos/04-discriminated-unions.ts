/**
 * @file 04-discriminated-unions.ts
 * @purpose Demonstração 04: máquina de estados de requisição com switch exaustivo —
 *          acrescentar um estado sem tratá-lo NÃO compila.
 * @techniques União discriminada pelo campo `status`; reducer tipado; switch exaustivo
 *            fechado com assertNever; narrowing por discriminante.
 * @usedBy main.ts (loader), index.html (seção 04), errors/04-unions.errors.ts, code-peek.
 */
import { h } from '@/core/dom';
import type { Cleanup } from '@/core/demo-registry';
import { assertNever } from '@/utils/assert-never';

// ---------------------------------------------------------------------------
// Lógica pura (testável sem DOM)
// ---------------------------------------------------------------------------

/** União discriminada: `status` é o discriminante — cada ramo tem campos próprios. */
export type RequestState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly startedAt: number }
  | { readonly status: 'success'; readonly data: string }
  | { readonly status: 'error'; readonly message: string };

export type RequestEvent =
  | { readonly type: 'fetch'; readonly at: number }
  | { readonly type: 'resolve'; readonly data: string }
  | { readonly type: 'reject'; readonly message: string }
  | { readonly type: 'reset' };

export const IDLE_STATE: RequestState = { status: 'idle' };

/**
 * Reducer puro: cada evento transita a união. O `default` chama `assertNever(event)` —
 * acrescentar um evento novo em RequestEvent sem tratá-lo NÃO compila (o que sobra
 * após os quatro `case` não é `never`). `state` participa: re-disparar durante
 * loading é no-op (idempotência).
 */
export function transition(state: RequestState, event: RequestEvent): RequestState {
  switch (event.type) {
    case 'reset':
      return IDLE_STATE;
    case 'fetch':
      return state.status === 'loading' ? state : { status: 'loading', startedAt: event.at };
    case 'resolve':
      return { status: 'success', data: event.data };
    case 'reject':
      return { status: 'error', message: event.message };
    default:
      return assertNever(event, 'Evento sem tratamento');
  }
}

/**
 * Descrição exaustiva: o `switch` cobre TODOS os status; o default recebe
 * `state: never` (o compilador esgotou a união) e é fechado por assertNever.
 */
export function describeState(state: RequestState): string {
  switch (state.status) {
    case 'idle':
      return 'idle — aguardando disparo';
    case 'loading':
      return `loading — iniciado em ${state.startedAt}`;
    case 'success':
      return `success — "${state.data}"`;
    case 'error':
      return `error — ${state.message}`;
    default:
      return assertNever(state, 'Estado sem tratamento');
  }
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

export function init(root: HTMLElement): Cleanup {
  const controller = new AbortController();
  const { signal } = controller;

  let state: RequestState = IDLE_STATE;
  const description = h('p');
  const raw = h('code');
  raw.classList.add('error-card__line');

  const render = (): void => {
    description.textContent = describeState(state);
    raw.textContent = JSON.stringify(state);
  };

  const dispatch = (event: RequestEvent): void => {
    state = transition(state, event);
    render();
  };

  const makeButton = (text: string, event: RequestEvent): HTMLButtonElement => {
    const button = h('button', { attrs: { type: 'button' }, text });
    button.classList.add('btn');
    button.addEventListener(
      'click',
      () => {
        dispatch(event);
      },
      { signal },
    );
    return button;
  };

  const controls = h('div', {
    children: [
      makeButton('fetch', { type: 'fetch', at: Date.now() }),
      makeButton('resolve', { type: 'resolve', data: 'payload ok' }),
      makeButton('reject', { type: 'reject', message: 'HTTP 500' }),
      makeButton('reset', { type: 'reset' }),
    ],
  });
  controls.classList.add('demo-slot__controls');

  root.replaceChildren(
    h('p', {
      text: 'O switch abaixo cobre os 4 status; o default usa assertNever(state) — um 5º estado sem caso não compila.',
    }),
    controls,
    description,
    raw,
  );
  render();

  return () => {
    controller.abort();
  };
}
