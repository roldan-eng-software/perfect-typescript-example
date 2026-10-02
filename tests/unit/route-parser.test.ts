/**
 * @file route-parser.test.ts
 * @purpose Testes de runtime do parser de rotas (demo 06) — extração de :params.
 * @techniques Parse por segmentos com guarda de índice (noUncheckedIndexedAccess).
 * @usedBy npm run test.
 */
import { describe, expect, it } from 'vitest';

import { parseRoute } from '@/demos/06-mapped-conditional-template';

describe('parser de rotas', () => {
  it('deve extrair um parâmetro simples', () => {
    expect(parseRoute('/users/:id', '/users/42')).toEqual({ id: '42' });
  });

  it('deve extrair múltiplos parâmetros', () => {
    expect(parseRoute('/users/:id/posts/:postId', '/users/42/posts/7')).toEqual({
      id: '42',
      postId: '7',
    });
  });

  it('deve devolver objeto vazio quando o padrão não tem :params', () => {
    expect(parseRoute('/about', '/about')).toEqual({});
  });

  it('deve ignorar segmentos faltantes no caminho', () => {
    expect(parseRoute('/users/:id', '/users')).toEqual({});
  });

  it('deve ler o valor por ÍNDICE do padrão (segmentos estáticos não são comparados)', () => {
    // Comportamento documentado da demo: o parser extrai pela posição do ':param'.
    expect(parseRoute('/users/:id', '/qualquer-coisa/99')).toEqual({ id: '99' });
  });
});
