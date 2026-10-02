/**
 * @file vite.config.ts
 * @purpose Configuração única do Vite: base do GitHub Pages, alias de caminhos, injeção
 *          da versão real do TypeScript no bundle e configuração do Vitest.
 * @techniques Import de JSON do próprio Node via createRequire; `define` de build-time;
 *            alias de caminho resolvido com `new URL` (sem dependências de runtime).
 * @usedBy Scripts npm (dev, build, preview, test), .github/workflows/deploy.yml.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);

/**
 * Contrato mínimo do manifest de um pacote: só lemos a versão.
 * `as` justificado: `createRequire` devolve `any` para JSON importado dinamicamente;
 * anotamos exatamente o campo usado para que o restante do arquivo permaneça type-safe.
 */
interface PackageManifest {
  readonly version: string;
}

const tsManifest = require('typescript/package.json') as PackageManifest;

export default defineConfig({
  // Caminho base exigido pelo GitHub Pages do repositório "perfect-typescript-example".
  // Se o repositório for renomeado, este é o ÚNICO ponto a ajustar (ver README).
  base: '/perfect-typescript-example/',

  resolve: {
    // Alias "@" -> <raiz>/src: imports curtos e estáveis (ex.: `@/core/result`).
    // Resolvido com new URL para funcionar em qualquer SO sem path externo.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  define: {
    // Versão REAL instalada (não a faixa do package.json), injetada no build e
    // exibida no hero da landing page.
    __TS_VERSION__: JSON.stringify(tsManifest.version),
  },

  test: {
    // Testes de runtime puros: Node é suficiente (nenhum teste toca em DOM real).
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    typecheck: {
      // Só roda com o flag de CLI `--typecheck` (script `test:types`).
      enabled: false,
      include: ['tests/types/**/*.test-d.ts'],
      tsconfig: './tsconfig.json',
    },
  },
});
