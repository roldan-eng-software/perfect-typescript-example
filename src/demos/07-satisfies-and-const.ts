/**
 * @file 07-satisfies-and-const.ts
 * @purpose Demonstração 07: configuração de tema validada com `satisfies` sem perder os
 *          tipos literais — comparada lado a lado com anotação e com `as`.
 * @techniques satisfies (valida sem anotar); as const; keyof typeof (tipo nível de tipo);
 *            narrowing de string via type predicate.
 * @usedBy main.ts (loader), index.html (seção 07), code-peek.
 */
import { h } from '@/core/dom';
import type { Cleanup } from '@/core/demo-registry';

// ---------------------------------------------------------------------------
// Lógica pura (testável sem DOM)
// ---------------------------------------------------------------------------

export interface ThemeColors {
  readonly background: string;
  readonly foreground: string;
  readonly accent: string;
}

export interface ThemeDefinition {
  readonly name: string;
  readonly colors: ThemeColors;
}

/**
 * `satisfies Record<string, ThemeDefinition>` valida a estrutura em tempo de
 * compilação (faltando campo ou tipando errado = erro) E preserva os tipos
 * LITERAIS: as chaves seguem 'ocean' | 'sunset' | 'forest', e name de cada tema
 * continua sendo a literal 'Ocean' etc. — uma anotação de tipo largaria tudo.
 */
export const themes = {
  ocean: {
    name: 'Ocean',
    colors: { background: '#001b2e', foreground: '#e8f4f8', accent: '#3fa7d6' },
  },
  sunset: {
    name: 'Sunset',
    colors: { background: '#2b1d33', foreground: '#ffe8d6', accent: '#e36414' },
  },
  forest: {
    name: 'Forest',
    colors: { background: '#102314', foreground: '#e7f5e9', accent: '#57a773' },
  },
} satisfies Record<string, ThemeDefinition>;

/** Derivado do objeto real: união de chaves criada pelo compilador, não escrita à mão. */
export type ThemeName = keyof typeof themes;

/** `as const`: o valor padrão é a LITERAL 'ocean', não string. */
export const DEFAULT_THEME = 'ocean' as const;

/** Type predicate: string só vira ThemeName depois de provada contra o objeto. */
export function isThemeName(value: string): value is ThemeName {
  return value in themes;
}

export function getTheme(name: ThemeName): ThemeDefinition {
  return themes[name];
}

/** Comparação exibida na UI — cada abordagem e o que ela perde. */
export const COMPARISON: ReadonlyArray<{
  readonly approach: string;
  readonly behavior: string;
  readonly verdict: string;
}> = [
  {
    approach: 'const t: ThemeDefinition = {…}',
    behavior: 'valida campos, mas AFUNILA name para string e descarta as chaves',
    verdict: '✗ perde keyof — themes[t.name] não compila',
  },
  {
    approach: 'const t = {…} as ThemeDefinition',
    behavior: 'NÃO valida nada (excesso/faltando passa batido) e também afunila',
    verdict: '✗ pior dos dois mundos',
  },
  {
    approach: 'const t = {…} satisfies ThemeDefinition',
    behavior: 'valida estrutura E preserva name: "Ocean" e chaves literais',
    verdict: '✓ keyof typeof funciona, literais intactos',
  },
];

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

export function init(root: HTMLElement): Cleanup {
  const controller = new AbortController();
  const { signal } = controller;

  const preview = h('div');
  preview.classList.add('demo-theme-preview');
  const title = h('strong', { text: '' });
  const keys = h('code');
  keys.classList.add('error-card__line');
  const accentSwatch = h('span');
  accentSwatch.classList.add('demo-theme-swatch');

  const applyTheme = (name: ThemeName): void => {
    const theme = getTheme(name);
    preview.style.setProperty('background', theme.colors.background);
    preview.style.setProperty('color', theme.colors.foreground);
    accentSwatch.style.setProperty('background', theme.colors.accent);
    title.textContent = `${theme.name} — satisfies preservou name como "${theme.name}"`;
    keys.textContent = `keyof typeof themes → ${Object.keys(themes).join(' | ')}`;
  };

  const controls = h('div');
  controls.classList.add('demo-slot__controls');
  for (const key of Object.keys(themes)) {
    if (!isThemeName(key)) {
      continue; // guarda real: Object.keys devolve string
    }
    const name = key;
    const button = h('button', { attrs: { type: 'button', text: themes[name].name } });
    button.classList.add('btn');
    button.addEventListener(
      'click',
      () => {
        applyTheme(name);
      },
      { signal },
    );
    controls.append(button);
  }

  const table = h('table', { attrs: { 'aria-label': 'Comparação das três abordagens' } });
  table.classList.add('doc-table');
  const body = h('tbody');
  for (const row of COMPARISON) {
    body.append(
      h('tr', {
        children: [
          h('td', { children: [h('code', { text: row.approach })] }),
          h('td', { text: row.behavior }),
          h('td', { text: row.verdict }),
        ],
      }),
    );
  }
  table.append(body);

  preview.append(
    title,
    h('p', { children: [accentSwatch, h('span', { text: ' swatch de destaque' })] }),
    keys,
  );

  root.replaceChildren(
    h('p', {
      text: 'O objeto abaixo passou no satisfies — troque de tema e veja os literais preservados:',
    }),
    controls,
    preview,
    table,
  );
  applyTheme(DEFAULT_THEME);

  return () => {
    controller.abort();
  };
}
