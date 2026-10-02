/**
 * @file format.test.ts
 * @purpose Testes de runtime dos formatadores Intl (utils/format.ts), com locale/fuso pinados.
 * @techniques Asserts estáveis contra variação de ICU entre máquinas (toContain quando
 *            a formatação exata é dependente de versão do ICU).
 * @usedBy npm run test.
 */
import { describe, expect, it } from 'vitest';

import { formatCurrency, formatDate, formatNumber } from '@/utils/format';

describe('format', () => {
  it('deve formatar moeda BRL em pt-BR', () => {
    const formatted = formatCurrency(1000.99);
    expect(formatted).toContain('R$');
    // Assert por substring: o separador decimal/ponto de milhar de pt-BR é estável,
    // mas espaços não separáveis podem variar entre versões do ICU.
    expect(formatted).toContain('1.000,99');
  });

  it('deve formatar número com separadores de milhar e decimal pt-BR', () => {
    expect(formatNumber(1234.5)).toBe('1.234,5');
  });

  it('deve formatar data com fuso fixado (America/Sao_Paulo)', () => {
    // 12:00 UTC = 09:00 em São Paulo (UTC−3) — o dia NÃO vira 14 por causa do fuso.
    const formatted = formatDate(Date.UTC(2024, 0, 15, 12));
    expect(formatted).toContain('2024');
    expect(formatted).toContain('15');
  });

  it('deve aceitar locale alternativo', () => {
    expect(formatNumber(1234.5, 'en-US')).toBe('1,234.5');
  });
});
