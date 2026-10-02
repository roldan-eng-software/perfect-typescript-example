/**
 * @file eslint.config.js
 * @purpose Lint type-aware em modo estrito + enforcement da regra de dependência entre
 *          camadas (core/utils nunca importam demos/components).
 * @techniques Flat Config do ESLint 10; configs type-checked do typescript-eslint;
 *            no-restricted-imports com patterns glob por caminho de arquivo.
 * @usedBy npm run lint / npm run check / CI.
 */
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Arquivos fora do escopo do lint: build, cobertura e os próprios arquivos .js
  // (o projeto só produz TypeScript; o eslint.config.js é a única exceção).
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.claude/**', '**/*.js'] },

  {
    // Todo .ts do projeto é lintado com tipo (projeto real do tsconfig, não parser-only).
    files: ['**/*.ts'],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        // Type-aware linting precisa apontar para os tsconfigs reais do projeto.
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Regra do projeto: qualquer`any` explícito é erro (ver README / CRITÉRIOS DE ACEITE).
      '@typescript-eslint/no-explicit-any': 'error',

      // `@ts-ignore`/`@ts-nocheck` são proibidos; `@ts-expect-error` só com descrição
      // do erro esperado (e só nos arquivos de src/demos/errors/, validado pelo tsc).
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],

      // Prioriza `import type` de forma consistente (alinha com verbatimModuleSyntax).
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },

  {
    // REGRA DE CAMADAS: infraestrutura base (core/utils) não pode conhecer demos
    // nem components. Enforçada pelo ESLint — violação quebra o `npm run lint`.
    files: ['src/core/**/*.ts', 'src/utils/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/demos/*', '@/demos/**', '**/demos/*', '**/demos/**'],
              message:
                'Camada core/utils não pode importar demos (regra de dependências — ver ARCHITECTURE.md).',
            },
            {
              group: ['@/components/*', '@/components/**', '**/components/*', '**/components/**'],
              message:
                'Camada core/utils não pode importar components (regra de dependências — ver ARCHITECTURE.md).',
            },
          ],
        },
      ],
    },
  },
);
