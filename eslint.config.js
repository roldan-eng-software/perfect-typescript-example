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

      // DESLIGADA de propósito: em APIs de nível de tipo (Equal<A,B>, Expect<T>) e em
      // helpers de DOM (qs<T>), o parâmetro de tipo É o contrato — é passado pelo chamador
      // e não tem como aparecer duas vezes na assinatura. A regra puniria o propósito.
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',

      // `T[]` para tipos simples; `Array<T>` para objetos/tuplas — legível e o que o
      // Prettier também prefere (ex.: Array<[string, string]>).
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],

      // Números em template literal são seguros e idiomáticos (`R$ ${value}`).
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },

  {
    // Arquivos de ERRO INTENCIONAL: o compilador está rejeitando o código de propósito,
    // então as expressões têm tipo "error/any" em runtime de análise. As regras que
    // leem tipos quebrados (no-unsafe-*) não têm o que verificar aqui — os DIRETIVOS
    // @ts-expect-error continuam sendo validados pelo tsc, que é a autoridade real.
    files: ['src/demos/errors/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/dot-notation': 'off',
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
