/**
 * @file 10-typed-dom-and-events.ts
 * @purpose Demonstração 10: DOM e eventos tipados — qs/qsa/h, EventBus com mapa de
 *          eventos, sobrecargas de função e custom element via declaration merging.
 * @techniques Declaration merging (HTMLElementTagNameMap); InstanceType; método genérico
 *            em EventBus; sobrecargas; h() com tags customizadas.
 * @usedBy main.ts (loader), index.html (seção 10), code-peek.
 */
import type { Cleanup } from '@/core/demo-registry';
import { h, qs, qsa } from '@/core/dom';
import { createEventBus, type Unsubscribe } from '@/core/event-bus';

// ---------------------------------------------------------------------------
// Declaration merging: o mapa de tags conhece a nossa tag customizada
// ---------------------------------------------------------------------------

declare global {
  interface HTMLElementTagNameMap {
    'demo-status-pill': DemoStatusPill;
  }
}

export const TAG_STATUS_PILL = 'demo-status-pill';

/** Mini custom element — o MESMO padrão dos componentes oficiais da página. */
export class DemoStatusPill extends HTMLElement {
  static readonly observedAttributes: readonly string[] = ['tone'];

  connectedCallback(): void {
    this.classList.add('demo-status-pill');
    if (this.getAttribute('tone') === null) {
      this.setAttribute('tone', 'neutral');
    }
  }

  attributeChangedCallback(name: string): void {
    if (name === 'tone') {
      this.classList.toggle('demo-status-pill--accent', this.getAttribute('tone') === 'accent');
    }
  }
}

/** InstanceType: o tipo de uma INSTÂNCIA a partir do construtor — sem escrever à mão. */
export type StatusPillElement = InstanceType<typeof DemoStatusPill>;

// ---------------------------------------------------------------------------
// Lógica pura (testável sem DOM)
// ---------------------------------------------------------------------------

/**
 * Sobrecargas GENUÍNAS: as duas assinaturas diferem em DUAS posições (tipo do 2º
 * parâmetro E existência do 3º) — a regra unified-signatures do ESLint só sugere
 * unificação quando há UMA diferença, então este par permanece legal e didático.
 */
export function joinTruncated(items: readonly string[], maxLength: number): string;
export function joinTruncated(
  items: readonly string[],
  separator: string,
  maxLength: number,
): string;
export function joinTruncated(
  items: readonly string[],
  modeOrSeparator: number | string,
  explicitMaxLength?: number,
): string {
  const separator = typeof modeOrSeparator === 'string' ? modeOrSeparator : ' · ';
  const maxLength =
    typeof modeOrSeparator === 'number' ? modeOrSeparator : (explicitMaxLength ?? 0);
  const joined = items.join(separator);
  if (joined.length <= maxLength) {
    return joined;
  }
  return `${joined.slice(0, Math.max(0, maxLength - 1))}…`;
}

/** Mapa de eventos do widget: nome → payload — emit errado o payload não compila. */
export interface WidgetEvents {
  readonly 'pill:added': { readonly label: string; readonly total: number };
  readonly 'log:cleared': undefined;
}

export const SAMPLE_TAGS: readonly string[] = ['typescript', 'strict', 'vite', 'vitest', 'eslint'];

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

export function init(root: HTMLElement): Cleanup {
  const controller = new AbortController();
  const { signal } = controller;

  // Registro idempotente do elemento (HMR/remontagem não podem redefinir).
  if (customElements.get(TAG_STATUS_PILL) === undefined) {
    customElements.define(TAG_STATUS_PILL, DemoStatusPill);
  }

  const bus = createEventBus<WidgetEvents>();
  const subscriptions: Unsubscribe[] = [];

  // --- Área montada com h() + consultas com qs/qsa ---
  const pillsBox = h('div');
  pillsBox.classList.add('demo-slot__controls');
  const logBox = h('ul');
  const counter = h('output', { text: '0 pills' });

  const addPill = (): void => {
    // h('demo-status-pill') devolve DemoStatusPill — declaration merging em ação.
    const pill: StatusPillElement = h('demo-status-pill');
    const total = qsa(TAG_STATUS_PILL, pillsBox).length + 1;
    const label = `pill-${total}`;
    pill.textContent = label;
    pill.setAttribute('tone', total % 2 === 0 ? 'accent' : 'neutral');
    pillsBox.append(pill);
    counter.textContent = `${total} pills`;
    bus.emit('pill:added', { label, total });
  };

  // Logador: assina o mapa tipado — payload já chega tipado, sem cast.
  // O handler consulta a UL com qs RAIZADO no root (nunca document global) e trata null.
  subscriptions.push(
    bus.on('pill:added', (payload) => {
      const list = qs<HTMLUListElement>('ul', root);
      if (list !== null) {
        list.append(h('li', { text: `pill:added → ${payload.label} (total ${payload.total})` }));
      }
    }),
  );

  const addButton = h('button', { attrs: { type: 'button', text: 'h() → adicionar pill' } });
  addButton.classList.add('btn', 'btn--primary');
  addButton.addEventListener('click', addPill, { signal });

  const clearButton = h('button', { attrs: { type: 'button', text: 'Limpar log' } });
  clearButton.classList.add('btn');
  clearButton.addEventListener(
    'click',
    () => {
      const list = qs<HTMLUListElement>('ul', root);
      if (list !== null) {
        list.replaceChildren();
      }
      bus.emit('log:cleared', undefined);
    },
    { signal },
  );

  // --- Sobrecrega ao vivo ---
  const lengthInput = h('input', {
    attrs: { type: 'number', value: '30', 'aria-label': 'Tamanho máximo da lista' },
  });
  lengthInput.classList.add('btn');
  const truncOutput = h('code');
  truncOutput.classList.add('error-card__line');
  const renderTruncated = (): void => {
    const maxLength = Number(lengthInput.value);
    // 2 args usa a 1ª sobrecarga; (lista, separador, limite), a 2ª — ambas tipadas.
    truncOutput.textContent = `${joinTruncated(SAMPLE_TAGS, Number.isNaN(maxLength) ? 40 : maxLength)}\n${joinTruncated(SAMPLE_TAGS, ' / ', 40)}`;
  };
  lengthInput.addEventListener('input', renderTruncated, { signal });

  const controls = h('div', { children: [addButton, clearButton, lengthInput] });
  controls.classList.add('demo-slot__controls');

  root.replaceChildren(
    h('p', {
      text: 'Widget montado com h(), consultado com qs/qsa e comunicado por um EventBus<WidgetEvents> — tudo tipado até o payload.',
    }),
    controls,
    pillsBox,
    counter,
    h('h4', { text: 'Log do event bus' }),
    logBox,
    h('h4', { text: 'joinTruncated (sobrecargas)' }),
    truncOutput,
  );

  // qs dentro da demo: se o elemento não existir, o guard trata — sem `!`.
  renderTruncated();

  return () => {
    controller.abort();
    for (const unsubscribe of subscriptions) {
      unsubscribe();
    }
    bus.emit('log:cleared', undefined);
  };
}
