/**
 * @file code-peek.ts
 * @purpose Custom element <code-peek> que mostra o CÓDIGO REAL do repositório, com
 *          realce de sintaxe próprio, cópia e carregamento só ao abrir o painel.
 * @techniques Declaration merging (HTMLElementTagNameMap); import.meta.glob com ?raw;
 *            Result<T, E> para falhas de carga; narrowing de unknown; regex global
 *            para tokenização.
 * @usedBy index.html (12 ocorrências), src/main.ts (registro).
 */
import { h, qs } from '@/core/dom';
import { onLanguageChange, translate } from '@/core/i18n';
import { err, match, ok, type Result } from '@/core/result';
import { schedulePerFrame } from '@/core/scheduler';

/**
 * Declaration merging: aumenta o mapa global de tags do DOM — depois disto,
 * document.createElement('code-peek') e qs('code-peek') devolvem CodePeek, sem cast.
 */
declare global {
  interface HTMLElementTagNameMap {
    'code-peek': CodePeek;
  }
}

export const TAG_CODE_PEEK = 'code-peek';

/** Códigos de falha de carga — a UI traduz cada um (nunca string solta vira mensagem). */
export type RawSourceError = 'missing-src' | 'file-not-in-build' | 'load-failed';

// ---------------------------------------------------------------------------
// Carregamento do código real (compartilhado com <error-showcase>)
// ---------------------------------------------------------------------------

/**
 * Mapa gerado pelo Vite em build-time: cada chave é um caminho '/src/...' e cada valor
 * carrega o ARQUIVO COMO TEXTO (?raw) de forma preguiçosa — nenhum código entra no bundle
 * inicial. O tipo é `Promise<unknown>`: validamos em runtime em vez de confiar.
 */
const rawModules: Record<string, () => Promise<unknown>> = import.meta.glob('/src/**/*.ts', {
  query: '?raw',
  import: 'default',
});

/** Carrega um arquivo do repositório como string, devolvendo Result em vez de lançar. */
export async function loadRawSource(path: string): Promise<Result<string, RawSourceError>> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const loader = rawModules[normalized];
  if (loader === undefined) {
    return err('file-not-in-build');
  }
  try {
    const loaded: unknown = await loader();
    // Narrowing de `unknown`: o glob promete "módulo", só o typeof prova que é string.
    if (typeof loaded !== 'string') {
      return err('load-failed');
    }
    return ok(loaded);
  } catch {
    return err('load-failed');
  }
}

// ---------------------------------------------------------------------------
// Tokenizador de TypeScript (sem bibliotecas externas)
// ---------------------------------------------------------------------------

const TOKEN_KINDS = ['comment', 'string', 'decorator', 'number', 'keyword', 'type'] as const;
type TokenKind = (typeof TOKEN_KINDS)[number] | 'plain';

interface Token {
  readonly kind: TokenKind;
  readonly text: string;
}

const KEYWORDS =
  'const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|' +
  'class|interface|type|enum|extends|implements|import|export|default|from|as|async|await|' +
  'new|delete|typeof|instanceof|in|of|try|catch|finally|throw|void|never|unknown|any|' +
  'null|undefined|true|false|readonly|public|private|protected|static|abstract|override|' +
  'yield|satisfies|keyof|infer|is|asserts|declare|namespace';

/**
 * Ordem importa: comentário antes de string (senão `// "oi"` casaria como string).
 * Flag `g` (e não `y`): com global, o exec PULA o texto simples entre dois tokens —
 * com sticky ele pararia no primeiro caractere que não inicia token (espaço, `(`…).
 * Simplificação documentada: literais de regex não são reconhecidos, então a coloração
 * dentro de um `/regex/` pode ficar imprecisa — aceitável para o escopo desta página.
 */
const TOKEN_RE = new RegExp(
  String.raw`(?<comment>//[^\n]*|/\*[\s\S]*?\*/)` +
    String.raw`|(?<string>"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|` +
    '`(?:\\\\.|[^`\\\\])*`)' +
    String.raw`|(?<decorator>@[A-Za-z_$][\w$]*)` +
    String.raw`|(?<number>\b0[xX][0-9a-fA-F]+\b|\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b)` +
    String.raw`|(?<keyword>\b(?:${KEYWORDS})\b)` +
    String.raw`|(?<type>\b[A-Z][\w$]*\b|\b(?:string|number|boolean|symbol|bigint|object)\b)`,
  'g',
);

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const push = (kind: TokenKind, text: string): void => {
    if (text.length > 0) {
      tokens.push({ kind, text });
    }
  };

  let cursor = 0;
  TOKEN_RE.lastIndex = 0;
  let found = TOKEN_RE.exec(source);
  while (found !== null) {
    push('plain', source.slice(cursor, found.index));
    const groups = found.groups;
    const kind = TOKEN_KINDS.find((candidate) => groups?.[candidate] !== undefined) ?? 'plain';
    push(kind, found[0]);
    cursor = TOKEN_RE.lastIndex;
    found = TOKEN_RE.exec(source);
  }
  push('plain', source.slice(cursor));
  return tokens;
}

/** Renderiza tokens em DOM real (sem innerHTML — código nunca é interpretado como HTML). */
function buildCodeFragment(
  code: string,
  highlight: readonly [number, number] | null,
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  let lineNumber = 1;
  let lineElement: HTMLSpanElement | null = null;

  const ensureLine = (): HTMLSpanElement => {
    if (lineElement === null) {
      lineElement = document.createElement('span');
      const inRange =
        highlight !== null && lineNumber >= highlight[0] && lineNumber <= highlight[1];
      lineElement.className = inRange ? 'code-line line--highlight' : 'code-line';
      fragment.append(lineElement);
    }
    return lineElement;
  };

  for (const token of tokenize(code)) {
    const parts = token.text.split('\n');
    parts.forEach((part, index) => {
      if (index > 0) {
        lineNumber += 1;
        lineElement = null;
      }
      const line = ensureLine();
      if (part.length === 0) {
        return;
      }
      if (token.kind === 'plain') {
        line.append(part);
      } else {
        const span = document.createElement('span');
        span.className = `tok-${token.kind}`;
        span.textContent = part;
        line.append(span);
      }
    });
  }

  return fragment;
}

/** `lines="10-40"` → tupla [inicio, fim]; valor ausente/inválido → null (nunca lança). */
function parseLinesAttribute(value: string | null): readonly [number, number] | null {
  if (value === null) {
    return null;
  }
  const parts = /^(\d+)-(\d+)$/.exec(value);
  if (parts === null) {
    return null;
  }
  const start = Number(parts[1]); // regex garante o formato; NaN (se ocorrer) é rejeitado abaixo
  const end = Number(parts[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    return null;
  }
  const range: readonly [number, number] = [start, end];
  return range;
}

// ---------------------------------------------------------------------------
// O custom element
// ---------------------------------------------------------------------------

let instanceCounter = 0;

export class CodePeek extends HTMLElement {
  static readonly observedAttributes: readonly string[] = ['src', 'lines'];

  readonly #panelId = `code-peek-panel-${(instanceCounter += 1)}`;
  #toggleButton: HTMLButtonElement | null = null;
  #toggleLabel: HTMLSpanElement | null = null;
  #copyButton: HTMLButtonElement | null = null;
  #copyStatus: HTMLElement | null = null;
  #panel: HTMLElement | null = null;
  #codeRegion: HTMLElement | null = null;
  #preElement: HTMLPreElement | null = null;
  #code = '';
  #loaded = false;
  #isOpen = false;
  #path = '';

  connectedCallback(): void {
    if (this.#toggleButton !== null) {
      return; // já construído (idempotente para upgrade/HMR)
    }
    this.#path = this.getAttribute('src') ?? '';

    /**
     * Construção ADIADA até a seção chegar perto da viewport: os 12 painéis
     * construídos sincronamente no load viravam long tasks (medido: TBT ~330 ms
     * no Lighthouse). O IO dispara ANTES de o visitante conseguir rolar até aqui
     * (margem de 300 px), então o botão sempre existe quando ele chegar.
     */
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          // Um build por frame: 12 painéis no mesmo task (scroll instantâneo do
          // Lighthouse) geravam long tasks — ver core/scheduler.ts.
          schedulePerFrame(() => {
            this.#build();
            this.#renderLabels();
            // Re-renderiza os textos internos quando o idioma muda (barramento do i18n).
            onLanguageChange(() => {
              this.#renderLabels();
            });
          });
        }
      },
      { rootMargin: '80px 0px' },
    );
    observer.observe(this);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) {
      return;
    }
    if (name === 'src') {
      this.#path = newValue ?? '';
      this.#loaded = false;
      this.#code = '';
      const pathElement = qs('.code-peek__path', this);
      if (pathElement !== null) {
        pathElement.textContent = this.#path;
      }
    }
    if (name === 'lines' && this.#loaded) {
      this.#renderCode();
    }
  }

  #build(): void {
    this.classList.add('code-peek');

    this.#toggleButton = h('button', {
      attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': this.#panelId },
    });
    this.#toggleButton.classList.add('code-peek__summary');
    this.#toggleLabel = h('span', { text: '' });
    const path = h('span', { text: this.#path });
    path.classList.add('code-peek__path');
    this.#toggleButton.append(h('span', { text: '▸', attrs: { 'aria-hidden': 'true' } }));
    this.#toggleButton.append(this.#toggleLabel, path);
    this.#toggleButton.addEventListener('click', () => {
      void this.#onToggleClick();
    });

    this.#panel = h('div', { attrs: { id: this.#panelId, hidden: '' } });
    this.#panel.classList.add('code-peek__panel');

    const toolbar = h('div');
    toolbar.classList.add('code-peek__toolbar');
    this.#copyButton = h('button', { attrs: { type: 'button' } });
    this.#copyButton.classList.add('btn');
    this.#copyButton.addEventListener('click', () => {
      void this.#onCopyClick();
    });
    this.#copyStatus = h('span', { attrs: { 'aria-live': 'polite' } });
    this.#copyStatus.classList.add('code-peek__status');
    toolbar.append(this.#copyButton, this.#copyStatus);

    this.#preElement = h('pre', {
      attrs: { tabindex: '0', role: 'region', 'aria-label': '' },
    });
    this.#codeRegion = h('code');
    this.#preElement.append(this.#codeRegion);

    this.#panel.append(toolbar, this.#preElement);
    this.append(this.#toggleButton, this.#panel);

    // Escape fecha o painel e devolve o foco ao botão (acessibilidade por teclado).
    this.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.#isOpen) {
        this.#setOpen(false);
        this.#toggleButton?.focus();
      }
    });
  }

  #renderLabels(): void {
    if (this.#toggleLabel !== null) {
      this.#toggleLabel.textContent = translate(this.#isOpen ? 'code.collapse' : 'code.expand');
    }
    if (this.#copyButton !== null) {
      this.#copyButton.textContent = translate('code.copy');
    }
    if (this.#preElement !== null) {
      this.#preElement.setAttribute(
        'aria-label',
        `${translate('code.regionLabel')}: ${this.#path}`,
      );
    }
  }

  async #onToggleClick(): Promise<void> {
    if (this.#isOpen) {
      this.#setOpen(false);
      return;
    }
    if (!this.#loaded) {
      await this.#load();
    }
    if (this.#loaded) {
      this.#setOpen(true);
    }
  }

  #setOpen(open: boolean): void {
    this.#isOpen = open;
    if (this.#panel !== null) {
      this.#panel.hidden = !open;
    }
    this.#toggleButton?.setAttribute('aria-expanded', String(open));
    this.#renderLabels();
  }

  async #load(): Promise<void> {
    if (this.#path === '') {
      this.#showLoadError();
      return;
    }
    if (this.#copyStatus !== null) {
      this.#copyStatus.textContent = translate('code.loading');
    }

    const result = await loadRawSource(this.#path);
    match(result, {
      ok: (code) => {
        this.#code = code;
        this.#loaded = true;
        this.#renderCode();
        if (this.#copyStatus !== null) {
          this.#copyStatus.textContent = '';
        }
      },
      err: () => {
        this.#showLoadError();
      },
    });
  }

  #renderCode(): void {
    if (this.#codeRegion === null) {
      return;
    }
    this.#codeRegion.replaceChildren(
      buildCodeFragment(this.#code, parseLinesAttribute(this.getAttribute('lines'))),
    );
  }

  /** Falha amigável via Result: o painel abre com a mensagem, sem exceção no console. */
  #showLoadError(): void {
    if (this.#panel === null || this.#toggleButton === null) {
      return;
    }
    this.#panel.replaceChildren();
    const message = h('p', { text: translate('code.loadError') });
    message.classList.add('code-peek__error');
    this.#panel.append(message);
    this.#setOpen(true);
  }

  async #onCopyClick(): Promise<void> {
    const status = this.#copyStatus;
    if (status === null) {
      return;
    }
    try {
      const clipboard = getClipboard();
      if (clipboard === undefined) {
        throw new Error('Clipboard API unavailable');
      }
      await clipboard.writeText(this.#code);
      status.textContent = translate('code.copied');
    } catch {
      status.textContent = translate('code.copyFailed');
    }
  }
}

/**
 * O lib.dom declara `navigator.clipboard` como sempre presente, mas fora de contexto
 * seguro (HTTP) ele é `undefined` em runtime. Atribuir direto seria AFUNILADO pelo CFA
 * (inicializador tipado como Clipboard) e o guarda `=== undefined` viraria "impossível"
 * no lint — passando por função com retorno anotado `| undefined`, o guarda é legítimo.
 */
function getClipboard(): Clipboard | undefined {
  return navigator.clipboard;
}
