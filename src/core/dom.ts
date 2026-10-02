/**
 * @file dom.ts
 * @purpose Helpers tipados de acesso/criação de DOM — o único módulo de `core` que toca em `document`.
 * @techniques Genéricos com constraint e valor padrão; keyof + indexed access via HTMLElementTagNameMap.
 * @usedBy src/main.ts, src/components/*, init() das demos.
 */

/**
 * Genérico com CONSTRAINT: `extends Element` garante que o chamador só pede tipos de
 * elemento reais; o valor padrão `<T = Element>` evita repetir o tipo quando o detalhe
 * não importa. O retorno honesto `T | null` combina com `strict` + `noUncheckedIndexedAccess`:
 * quem chama trata a ausência sem `!` nem `as`.
 */
export function qs<T extends Element = Element>(
  selector: string,
  root: ParentNode = document,
): T | null {
  return root.querySelector<T>(selector);
}

/** Versão plural: `Array.from` converte NodeList em `T[]` — iterável e tipado de verdade. */
export function qsa<T extends Element = Element>(
  selector: string,
  root: ParentNode = document,
): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/**
 * Props de `h()`. `readonly` + campos opcionais: sob `exactOptionalPropertyTypes`,
 * passar `{ text: undefined }` explicitamente é erro — omita a chave em vez de
 * encher o objeto de `undefined`. `children` aceita `Node | string` porque é
 * repassado a `Element.append`, que aceita os dois.
 */
export interface ElementProps {
  readonly className?: string;
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, string>>;
  readonly children?: ReadonlyArray<Node | string>;
}

/**
 * `keyof HTMLElementTagNameMap` + indexed access: a CHAVE (`tag`) determina o tipo de
 * retorno — `h('canvas')` devolve `HTMLCanvasElement` sem nenhum cast.
 * É a mesma técnica que deixa `<canvas>` acessível como `HTMLCanvasElement` no DOM nativo.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (props.className !== undefined) {
    element.className = props.className;
  }
  if (props.text !== undefined) {
    element.textContent = props.text;
  }
  if (props.attrs !== undefined) {
    for (const [name, value] of Object.entries(props.attrs)) {
      element.setAttribute(name, value);
    }
  }
  if (props.children !== undefined) {
    for (const child of props.children) {
      element.append(child);
    }
  }

  return element;
}
