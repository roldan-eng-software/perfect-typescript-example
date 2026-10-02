/**
 * @file theme-toggle.ts
 * @purpose Custom element <theme-toggle>: controle segmentado de tema com três estados —
 *          claro (padrão), escuro e padrão do sistema do visitante.
 * @techniques Declaration merging; campos #private; AbortController em listener de
 *            matchMedia; localStorage com try/catch (modo privado pode bloquear).
 * @usedBy index.html (cabeçalho), src/main.ts (registro).
 */
import { h, qs } from '@/core/dom';
import { onLanguageChange, translate } from '@/core/i18n';

declare global {
  interface HTMLElementTagNameMap {
    'theme-toggle': ThemeToggle;
  }
}

export const TAG_THEME_TOGGLE = 'theme-toggle';

/** Três estados possíveis — o default do projeto é 'light' (requisito da landing). */
export type ThemeChoice = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'theme';
const DARK_COLOR = '#0d1117';
const LIGHT_COLOR = '#ffffff';

function isThemeChoice(value: string | null): value is ThemeChoice {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readStoredTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : 'light';
  } catch {
    // localStorage pode lançar (modo privado/cookies bloqueados) — padrão é claro.
    return 'light';
  }
}

export class ThemeToggle extends HTMLElement {
  static readonly observedAttributes: readonly string[] = [];

  #group: HTMLElement | null = null;
  #buttons = new Map<ThemeChoice, HTMLButtonElement>();
  #choice: ThemeChoice = 'light';
  /** AbortController do listener de matchMedia — cancela tudo de uma vez se necessário. */
  #mediaController: AbortController | null = null;

  connectedCallback(): void {
    if (this.#group !== null) {
      return; // já construído (idempotente para upgrade/HMR)
    }

    this.#build();
    this.#choice = readStoredTheme();
    this.#applyTheme();

    // Escuta a mudança de preferência do SO — só importa quando o modo é 'system'.
    this.#mediaController = new AbortController();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener(
      'change',
      () => {
        if (this.#choice === 'system') {
          this.#updateThemeColor();
        }
      },
      { signal: this.#mediaController.signal },
    );

    onLanguageChange(() => {
      this.#renderLabels();
    });
  }

  disconnectedCallback(): void {
    this.#mediaController?.abort();
    this.#mediaController = null;
  }

  #build(): void {
    this.#group = h('div', { attrs: { role: 'group' } });
    this.#group.classList.add('segmented');

    for (const choice of ['light', 'dark', 'system'] satisfies ThemeChoice[]) {
      const button = h('button', {
        attrs: { type: 'button', 'aria-pressed': 'false' },
      });
      button.classList.add('segmented__option');
      button.addEventListener('click', () => {
        this.#choice = choice;
        this.#applyTheme();
      });
      this.#buttons.set(choice, button);
      this.#group.append(button);
    }

    this.append(this.#group);
  }

  #applyTheme(): void {
    // O script inline do <head> já garante o valor inicial antes do primeiro paint;
    // aqui apenas sincronizamos a UI e persistimos a escolha do visitante.
    document.documentElement.dataset.theme = this.#choice;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, this.#choice);
    } catch {
      // Sem armazenamento persistente o tema ainda vale para esta sessão.
    }
    for (const [choice, button] of this.#buttons) {
      button.setAttribute('aria-pressed', String(choice === this.#choice));
    }
    this.#renderLabels();
    this.#updateThemeColor();
  }

  #renderLabels(): void {
    this.#group?.setAttribute('aria-label', translate('theme.group'));
    const labels: Readonly<Record<ThemeChoice, string>> = {
      light: translate('theme.light'),
      dark: translate('theme.dark'),
      system: translate('theme.system'),
    };
    for (const [choice, button] of this.#buttons) {
      button.textContent = labels[choice];
    }
  }

  /** meta theme-color acompanha o tema RESOLVIDO (system depende do SO na hora). */
  #updateThemeColor(): void {
    const meta = qs<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta === null) {
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedDark = this.#choice === 'dark' || (this.#choice === 'system' && prefersDark);
    meta.setAttribute('content', resolvedDark ? DARK_COLOR : LIGHT_COLOR);
  }
}
