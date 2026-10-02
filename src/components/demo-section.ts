/**
 * @file demo-section.ts
 * @purpose Custom element <demo-section>: moldura acessível de cada demonstração — região
 *          com rótulo traduzível, área de montagem para init() e status via aria-live.
 * @techniques Declaration merging; campos #private; atributo observado; tradução
 *            reativa ao idioma via event bus tipado.
 * @usedBy src/main.ts (cria um por .demo-slot e passa `section.content` para loadDemo).
 */
import { h } from '@/core/dom';
import { isTranslationKey, onLanguageChange, translate } from '@/core/i18n';

declare global {
  interface HTMLElementTagNameMap {
    'demo-section': DemoSection;
  }
}

export const TAG_DEMO_SECTION = 'demo-section';

export class DemoSection extends HTMLElement {
  static readonly observedAttributes: readonly string[] = ['label-key'];

  #statusElement: HTMLElement | null = null;
  #contentElement: HTMLElement | null = null;

  connectedCallback(): void {
    if (this.#contentElement !== null) {
      return; // já construído (idempotente para upgrade/HMR)
    }

    this.classList.add('demo-section');
    this.#statusElement = h('div', {
      attrs: { role: 'status', 'aria-live': 'polite' },
    });
    this.#statusElement.classList.add('demo-section__status');
    this.#contentElement = h('div');
    this.#contentElement.classList.add('demo-section__content');
    this.append(this.#statusElement, this.#contentElement);

    this.#applyLabel();
    onLanguageChange(() => {
      this.#applyLabel();
    });
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name === 'label-key' && oldValue !== newValue) {
      this.#applyLabel();
    }
  }

  /** Área onde a demo monta sua UI — é o `root` recebido por `init(root)`. */
  get content(): HTMLElement {
    if (this.#contentElement === null) {
      // Antes do connectedCallback (ou em detachedRoot): garante o DOM mínimo.
      this.connectedCallback();
    }
    if (this.#contentElement === null) {
      throw new Error('demo-section content is not available');
    }
    return this.#contentElement;
  }

  /** Mensagem de status traduzível exibida na região aria-live (vazio = sem anúncio). */
  setStatus(text: string): void {
    if (this.#statusElement !== null) {
      this.#statusElement.textContent = text;
    }
  }

  #applyLabel(): void {
    const key = this.getAttribute('label-key');
    if (key !== null && isTranslationKey(key)) {
      this.setAttribute('aria-label', translate(key));
    } else {
      this.setAttribute('aria-label', translate('section.label'));
    }
  }
}
