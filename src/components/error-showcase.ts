/**
 * @file error-showcase.ts
 * @purpose Custom element <error-showcase>: mostra o que o compilador RECUSA — pareia cada
 *          diretiva @ts-expect-error do arquivo real com a mensagem do erro suprimido.
 * @techniques Declaration merging; IntersectionObserver (carga só quando visível);
 *            parse de arquivo-fonte carregado via ?raw; textos reativos ao idioma.
 * @usedBy index.html (seções 02, 04 e 08), src/main.ts (registro).
 */
import { h } from '@/core/dom';
import { onLanguageChange, translate } from '@/core/i18n';
import { schedulePerFrame } from '@/core/scheduler';
import { loadRawSource } from './code-peek';

declare global {
  interface HTMLElementTagNameMap {
    'error-showcase': ErrorShowcase;
  }
}

export const TAG_ERROR_SHOWCASE = 'error-showcase';

/** Um cartão: a linha da diretiva (destacada), a linha de código que falha e o erro. */
interface ErrorCard {
  readonly directive: string;
  readonly code: string;
  readonly message: string;
}

/**
 * Extrai os pares @ts-expect-error → linha seguinte do arquivo real.
 * Convenção do projeto: `// @ts-expect-error <descrição do erro>` logo ACIMA da linha
 * que não compila — a descrição após a diretiva é a mensagem exibida.
 */
function parseErrorCards(source: string): ErrorCard[] {
  const lines = source.split('\n');
  const cards: ErrorCard[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    // Só comentários de LINHA iniciados com a diretiva: menções em prosa (ex.: o
    // próprio cabeçalho @purpose do arquivo) não são cartões — auditoria da página
    // real pegou esse caso (11 cartões para 10 diretivas).
    if (!trimmed.startsWith('//') || !trimmed.includes('@ts-expect-error')) {
      return;
    }
    const directiveIndex = trimmed.indexOf('@ts-expect-error');
    const description = trimmed.slice(directiveIndex + '@ts-expect-error'.length).trim();
    const code = (lines[index + 1] ?? '').trim();
    cards.push({
      directive: trimmed,
      code,
      message: description.length > 0 ? description : translate('errors.expected'),
    });
  });

  return cards;
}

export class ErrorShowcase extends HTMLElement {
  static readonly observedAttributes: readonly string[] = ['src'];

  #titleElement: HTMLElement | null = null;
  #introElement: HTMLElement | null = null;
  #listElement: HTMLElement | null = null;
  #cards: ErrorCard[] = [];
  #requested = false;

  connectedCallback(): void {
    if (this.#listElement !== null) {
      return; // já construído (idempotente para upgrade/HMR)
    }

    /**
     * Construção ADIADA até a seção chegar perto da viewport (mesmo motivo do
     * <code-peek>): montar os 3 cartões-parede junto do load gerava long tasks
     * no Lighthouse. Depois do shell pronto, o IO de CARGA do arquivo começa.
     */
    const shellObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          shellObserver.disconnect();
          // Um shell por frame (mesmo motivo do <code-peek> — ver core/scheduler.ts).
          schedulePerFrame(() => {
            this.#buildShell();
            this.#observeForLoad();
          });
        }
      },
      { rootMargin: '80px 0px' },
    );
    shellObserver.observe(this);
  }

  #buildShell(): void {
    this.classList.add('error-showcase');

    this.#titleElement = h('h3', { text: '' });
    this.#titleElement.classList.add('error-showcase__title');
    this.#introElement = h('p', { text: '' });
    this.#introElement.classList.add('error-showcase__intro');
    this.#listElement = h('div');
    this.#listElement.classList.add('error-showcase__list');
    this.append(this.#titleElement, this.#introElement, this.#listElement);

    this.#renderTexts();
    onLanguageChange(() => {
      this.#renderTexts();
      this.#renderCards();
    });
  }

  #observeForLoad(): void {
    // IntersectionObserver: o arquivo só é buscado quando a seção está perto da
    // viewport (performance: nenhum custo de I/O para quem não chega até aqui).
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void this.#load();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(this);
  }

  #renderTexts(): void {
    if (this.#titleElement !== null) {
      this.#titleElement.textContent = translate('errors.title');
    }
    if (this.#introElement !== null) {
      this.#introElement.textContent = translate('errors.intro');
    }
  }

  async #load(): Promise<void> {
    if (this.#requested) {
      return;
    }
    this.#requested = true;
    const path = this.getAttribute('src');
    if (path === null) {
      return;
    }

    const result = await loadRawSource(path);
    if (result.ok) {
      this.#cards = parseErrorCards(result.value);
      this.#renderCards();
    } else {
      // Arquivo ausente (ex.: demos/errors ainda não criadas): nada a mostrar —
      // o elemento permanece vazio em vez de exibir erro quebrado.
      this.#cards = [];
      this.#renderCards();
    }
  }

  #renderCards(): void {
    if (this.#listElement === null) {
      return;
    }
    this.#listElement.replaceChildren();

    for (const card of this.#cards) {
      const wrapper = h('div');
      wrapper.classList.add('error-card');

      const directive = h('code', { text: card.directive });
      directive.classList.add('error-card__line', 'error-card__line--expect');
      const code = h('code', { text: card.code });
      code.classList.add('error-card__line');
      const message = h('p');
      message.classList.add('error-card__message');
      const label = h('strong', { text: `${translate('errors.expected')}: ` });
      message.append(label, card.message);

      wrapper.append(directive, code, message);
      this.#listElement.append(wrapper);
    }
  }
}
