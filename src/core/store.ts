/**
 * @file store.ts
 * @purpose Store reativa genérica mínima: estado tipado + notificação de mudança.
 * @techniques Genérico em função e interface; união valor/função em parâmetro; narrowing com typeof.
 * @usedBy demos/02-generics.ts (createStore<T>), demos/*, tests/unit/store.test.ts.
 */

/** Contrato de cancelamento: mesma forma de `Cleanup`, mas com semântica de "deixar de ouvir". */
export type Unsubscribe = () => void;

export type StoreListener<T> = (value: T, previous: T) => void;

export type Updater<T> = (previous: T) => T;

/**
 * União de "valor pronto" OU "função que calcula a partir do anterior" — o formato
 * clássico de API de estado (Redux/Zustand). Aceitar os dois evita que o chamador
 * precise ler o valor atual só para escrever o próximo.
 */
export type Settable<T> = T | Updater<T>;

export interface Store<T> {
  get(): T;
  set(next: Settable<T>): void;
  /** Devolve a função que remove o listener — desinscrição obrigatória nos cleanups das demos. */
  subscribe(listener: StoreListener<T>): Unsubscribe;
}

export function createStore<T>(initial: T): Store<T> {
  let current = initial;
  const listeners = new Set<StoreListener<T>>();

  return {
    get(): T {
      return current;
    },

    set(next: Settable<T>): void {
      const previous = current;
      /**
       * ARMADILHA documentada (comentário de primeiro uso de `typeof` narrowing):
       * `typeof x === 'function'` NÃO descarta `T` quando `T` é genérico — `T` pode
       * ser uma função em runtime. O cast é necessário e seguro aqui porque a única
       * forma de função aceita por `set` é justamente o updater da API.
       */
      current = typeof next === 'function' ? (next as Updater<T>)(previous) : next;
      // Copia antes de notificar: um listener pode se desinscrever durante a própria notificação.
      for (const listener of Array.from(listeners)) {
        listener(current, previous);
      }
    },

    subscribe(listener: StoreListener<T>): Unsubscribe {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
