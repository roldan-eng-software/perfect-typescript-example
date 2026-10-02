/**
 * @file lang-toggle.ts
 * @purpose Custom element <lang-toggle>: alterna en-US ⇄ pt-BR, aplica as traduções em
 *          TODOS os elementos data-i18n da página e persiste a escolha.
 * @techniques Declaration merging; walkers de atributos customizados (data-i18n,
 *            data-i18n-aria, data-i18n-content); guard de chave traduzível;
 *            localStorage com try/catch.
 * @usedBy index.html (cabeçalho), src/main.ts (registro).
 */
import { qsa } from '@/core/dom';
import {
  changeLanguage,
  getLanguage,
  isTranslationKey,
  onLanguageChange,
  translate,
  type Language,
} from '@/core/i18n';

declare global {
  interface HTMLElementTagNameMap {
    'lang-toggle': LangToggle;
  }
}

export const TAG_LANG_TOGGLE = 'lang-toggle';

const LANG_STORAGE_KEY = 'lang';

/** Endônimos: nomes de idioma nunca são traduzidos (ex.: "Português (Brasil)"). */
const LANGUAGE_ENDONYMS: Readonly<Record<Language, string>> = {
  'en-US': 'English (US)',
  'pt-BR': 'Português (Brasil)',
};

function isLanguage(value: string | null): value is Language {
  return value === 'en-US' || value === 'pt-BR';
}

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return isLanguage(stored) ? stored : 'en-US';
  } catch {
    return 'en-US'; // sem armazenamento, fica no idioma padrão da página
  }
}

/**
 * Aplica o dicionário no DOM: texto (data-i18n), rótulo acessível (data-i18n-aria)
 * e atributo content (data-i18n-content, ex.: meta description). Também atualiza
 * <html lang> e o <title>. ÚNICO ponto que varre o documento inteiro — este é um
 * componente, então a regra de camadas ("document" só em dom.ts/components/demos) vale.
 */
function applyDocument(language: Language): void {
  const root = document.documentElement;
  root.lang = language;

  for (const element of qsa<HTMLElement>('[data-i18n]')) {
    const key = element.getAttribute('data-i18n');
    if (key !== null && isTranslationKey(key)) {
      // textContent (nunca innerHTML): as traduções são texto puro, sem interpretação.
      element.textContent = translate(key);
    }
  }

  for (const element of qsa<HTMLElement>('[data-i18n-aria]')) {
    const key = element.getAttribute('data-i18n-aria');
    if (key !== null && isTranslationKey(key)) {
      element.setAttribute('aria-label', translate(key));
    }
  }

  for (const element of qsa<HTMLElement>('[data-i18n-content]')) {
    const key = element.getAttribute('data-i18n-content');
    if (key !== null && isTranslationKey(key)) {
      element.setAttribute('content', translate(key));
    }
  }
}

export class LangToggle extends HTMLElement {
  #button: HTMLButtonElement | null = null;

  connectedCallback(): void {
    if (this.#button !== null) {
      return; // já construído (idempotente para upgrade/HMR)
    }

    this.#button = document.createElement('button');
    this.#button.type = 'button';
    this.#button.classList.add('btn');
    this.#button.addEventListener('click', () => {
      const next: Language = getLanguage() === 'en-US' ? 'pt-BR' : 'en-US';
      this.activate(next);
    });
    this.append(this.#button);

    // Estado inicial: idioma persistido (ou en-US) aplicado a toda a página.
    this.activate(readStoredLanguage());

    // Componentes montados DEPOIS da troca também precisam de updates — o bus cobre
    // textos internos; o walker acima cobre o HTML estático.
    onLanguageChange(() => {
      this.#renderButton();
    });
  }

  /** Aplica o idioma: estado global → walker no DOM → persistência → label do botão. */
  activate(language: Language): void {
    changeLanguage(language);
    applyDocument(language);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, language);
    } catch {
      // Sem armazenamento, o idioma vale só para esta sessão.
    }
    this.#renderButton();
  }

  #renderButton(): void {
    if (this.#button === null) {
      return;
    }
    // O botão PROMETE o outro idioma: clicando, o visitante chega nele.
    // O texto visível já é o nome acessível do idioma (endônimo) — não precisa de aria-label.
    const target = getLanguage() === 'en-US' ? 'pt-BR' : 'en-US';
    this.#button.textContent = LANGUAGE_ENDONYMS[target];
  }
}
