/**
 * @file event-bus.ts
 * @purpose Emissor de eventos com mapa tipado: `emit('user:saved', payload)` exige o payload
 *          correto para cada evento — trocar o nome ou o formato é erro de compilação.
 * @techniques Constraint `extends object`; keyof; indexed access Events[K]; método genérico; unknown.
 * @usedBy components/*, demos/10-typed-dom-and-events.ts, tests/unit/event-bus.test.ts.
 */

/** Mesma semântica de `Store['subscribe']`: remove o listener. */
export type Unsubscribe = () => void;

/**
 * O contrato do bus. A constraint é `object` — e NÃO `Record<string, unknown>`:
 * interfaces (o formato usual de mapas de eventos) não têm index signature implícita
 * e não satisfariam `Record`, o que quebraria qualquer `interface Events { ... }` do chamador.
 */
export interface EventBus<Events extends object> {
  /**
   * Método genérico: `K` é amarrado ao primeiro argumento, então o listener é
   * `(payload: Events[K]) => void` — errar o payload é errar o tipo.
   */
  on<K extends keyof Events>(type: K, listener: (payload: Events[K]) => void): Unsubscribe;
  emit<K extends keyof Events>(type: K, payload: Events[K]): void;
}

export function createEventBus<Events extends object>(): EventBus<Events> {
  /** Armazenamento heterogêneo: o `unknown` aqui é deliberado (ver comentário no cast abaixo). */
  type InternalListener = (payload: unknown) => void;
  const listeners = new Map<keyof Events, Set<InternalListener>>();

  return {
    on<K extends keyof Events>(type: K, listener: (payload: Events[K]) => void): Unsubscribe {
      const wrapped: InternalListener = (payload) => {
        /**
         * `as` justificado: este wrapper só é invocado por `emit()` registrado sob o
         * MESMO `K`, logo o payload é `Events[K]` em runtime. O `unknown` existe apenas
         * para o Map guardar eventos de tipos diferentes num único campo.
         */
        listener(payload as Events[K]);
      };

      const existing = listeners.get(type);
      const group = existing ?? new Set<InternalListener>();
      if (existing === undefined) {
        listeners.set(type, group);
      }
      group.add(wrapped);

      return () => {
        group.delete(wrapped);
      };
    },

    emit<K extends keyof Events>(type: K, payload: Events[K]): void {
      const group = listeners.get(type);
      if (group === undefined) {
        return; // emit para evento sem ouvintes é no-op, não erro.
      }
      // Cópia antes de disparar (mesmo motivo do store: unsubscribe durante a notificação).
      for (const listener of Array.from(group)) {
        listener(payload);
      }
    },
  };
}
