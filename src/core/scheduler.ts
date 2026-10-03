/**
 * @file scheduler.ts
 * @purpose Enfileira trabalho para executar UM item por frame de animação.
 * @techniques Fila com requestAnimationFrame; drenagem incremental.
 * @usedBy src/main.ts (montagem das demos), src/components/code-peek.ts,
 *          src/components/error-showcase.ts.
 */

/**
 * O callback do IntersectionObserver recebe TODOS os alvos de uma vez quando o
 * scroll é instantâneo (comportamento do Lighthouse e de qualquer scroll programático):
 * montar 12 demos/shells no MESMO task virava long task de até ~1,7 s medido sob
 * throttling (auditoria: TBT oscilava entre 0 ms e 1670 ms). Com um item por frame,
 * cada task fica pequeno e a sequência completa leva ~200 ms — invisível para o
 * visitante e para o orçamento de TBT.
 */
const frameQueue: Array<() => void> = [];
let draining = false;

function drain(): void {
  const task = frameQueue.shift();
  if (task !== undefined) {
    task();
  }
  if (frameQueue.length > 0) {
    requestAnimationFrame(drain);
  } else {
    draining = false;
  }
}

/** Agenda `task` para o próximo frame (um por frame, na ordem de chegada). */
export function schedulePerFrame(task: () => void): void {
  frameQueue.push(task);
  if (!draining) {
    draining = true;
    requestAnimationFrame(drain);
  }
}
