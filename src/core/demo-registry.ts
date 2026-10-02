/**
 * @file demo-registry.ts
 * @purpose Registro tipado das 12 demos: id em união de literais, título e loader dinâmico.
 * @techniques União de literais; Promise/async; void em tipo de retorno; Result<T, E>
 *            para falhas de carga; instanceof narrowing.
 * @usedBy src/main.ts (registro + carga sob demanda das demos).
 */
import { err, ok, type Result } from './result';

/**
 * Contrato de ciclo de vida de toda demo (padrão obrigatório do projeto):
 * `init` monta a UI dentro de `root` e devolve a função que DESFAZ tudo
 * (remove listeners via AbortController e cancela timers).
 */
export type Cleanup = () => void;

export interface DemoModule {
  init(root: HTMLElement): Cleanup;
}

/**
 * União de literais: os 12 ids existem em tempo de compilação — um id de demonstração
 * inexistente não passa pelo tipo (o Map usa `string` só para lookup vindo do DOM).
 */
export type DemoId =
  '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12';

/** Critério: interface para contratos de objeto (estendíveis); type para uniões (acima). */
export interface DemoEntry {
  readonly id: DemoId;
  readonly title: string;
  /** Loader dinâmico — na prática recebe `() => import('@/demos/01-inference-and-narrowing')`. */
  readonly load: () => Promise<DemoModule>;
}

/** Código como dado: a UI traduz cada código para o idioma ativo (i18n), não para string solta. */
export type DemoLoadErrorCode = 'not-registered' | 'import-failed' | 'init-failed';

export interface DemoLoadError {
  readonly id: string;
  readonly code: DemoLoadErrorCode;
  readonly detail: string;
}

/** Estado do registro: Map preserva a ordem de inserção (listagem na ordem 01→12). */
const registry = new Map<string, DemoEntry>();

export function registerDemo(entry: DemoEntry): void {
  if (registry.has(entry.id)) {
    // Exceção deliberada: registro duplicado é bug de programação, não falha de runtime esperada.
    throw new Error(`Demo "${entry.id}" is already registered`);
  }
  registry.set(entry.id, entry);
}

export function getDemo(id: string): DemoEntry | undefined {
  return registry.get(id);
}

export function listDemos(): readonly DemoEntry[] {
  return Array.from(registry.values());
}

/** instanceof narrowing: `Error` tem `.message`; qualquer outra coisa vira string legível. */
function detailOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Cada demo é importada SOB DEMANDA: a `Promise` tipada resolve o módulo dinâmico.
 * Toda falha esperada aqui vira `Result` (a UI mostra o problema sem derrubar a página);
 * exceções continuam reservadas para bugs de programação (ver registerDemo).
 */
export async function loadDemo(
  id: string,
  root: HTMLElement,
): Promise<Result<Cleanup, DemoLoadError>> {
  const entry = registry.get(id);
  if (entry === undefined) {
    return err({ id, code: 'not-registered', detail: `No demo registered under id "${id}"` });
  }

  let demoModule: DemoModule;
  try {
    demoModule = await entry.load();
  } catch (error) {
    return err({ id, code: 'import-failed', detail: detailOf(error) });
  }

  try {
    return ok(demoModule.init(root));
  } catch (error) {
    // init falhou: Result em vez de exceção — um erro de uma demo não quebra as outras.
    return err({ id, code: 'init-failed', detail: detailOf(error) });
  }
}
