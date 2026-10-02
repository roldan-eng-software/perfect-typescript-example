/**
 * @file event-bus.test.ts
 * @purpose Testes de runtime do emissor com mapa de eventos tipado (core/event-bus.ts).
 * @techniques Mapa de eventos como interface do chamador; payload tipado por evento.
 * @usedBy npm run test.
 */
import { describe, expect, it } from 'vitest';

import { createEventBus } from '@/core/event-bus';

interface TestEvents {
  'user:saved': { id: string };
  'count:changed': number;
  ping: undefined;
}

describe('event-bus', () => {
  it('deve entregar o payload apenas aos handlers do evento', () => {
    const bus = createEventBus<TestEvents>();
    const saved: Array<{ id: string }> = [];
    const counts: number[] = [];

    bus.on('user:saved', (payload) => {
      saved.push(payload);
    });
    bus.on('count:changed', (payload) => {
      counts.push(payload);
    });

    bus.emit('user:saved', { id: 'u1' });

    expect(saved).toEqual([{ id: 'u1' }]);
    expect(counts).toEqual([]);
  });

  it('deve aceitar emit para evento sem handlers como no-op', () => {
    const bus = createEventBus<TestEvents>();
    expect(() => {
      bus.emit('ping', undefined);
    }).not.toThrow();
  });

  it('deve deixar de receber eventos depois do unsubscribe', () => {
    const bus = createEventBus<TestEvents>();
    const received: number[] = [];
    const unsubscribe = bus.on('count:changed', (payload) => {
      received.push(payload);
    });

    bus.emit('count:changed', 1);
    unsubscribe();
    bus.emit('count:changed', 2);

    expect(received).toEqual([1]);
  });

  it('deve notificar múltiplos handlers na ordem de registro', () => {
    const bus = createEventBus<TestEvents>();
    const order: string[] = [];
    bus.on('ping', () => {
      order.push('first');
    });
    bus.on('ping', () => {
      order.push('second');
    });

    bus.emit('ping', undefined);

    expect(order).toEqual(['first', 'second']);
  });
});
