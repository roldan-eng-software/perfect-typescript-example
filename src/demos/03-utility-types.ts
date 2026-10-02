/**
 * @file 03-utility-types.ts
 * @purpose Demonstração 03: doze utility types derivando um formulário completo de um
 *          único tipo `User` — uma fonte de verdade, muitas projeções.
 * @techniques Partial, Required, Readonly, Pick, Omit, Record, Extract, Exclude,
 *            NonNullable, ReturnType, Parameters, Awaited.
 * @usedBy main.ts (loader), index.html (seção 03), code-peek.
 */
import { h } from '@/core/dom';
import type { Cleanup } from '@/core/demo-registry';

// ---------------------------------------------------------------------------
// A fonte de verdade
// ---------------------------------------------------------------------------

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly role: 'admin' | 'user';
  readonly newsletter: boolean;
}

// --- As doze projeções (cada uma é mostrada na UI) ---

/** Edição parcial: qualquer subconjunto de User é válido para PATCH. */
export type UserPatch = Partial<User>;

/** Submissão de cadastro: tudo obrigatório (o form valida contra isto). */
export type UserRegistration = Required<User>;

/** Cópia imutável: nenhuma propriedade aceita reatribuição. */
export type FrozenUser = Readonly<User>;

/** Só o que o formulário coleta. */
export type UserFormFields = Pick<User, 'name' | 'email' | 'role'>;

/** O que o servidor aceita criar (sem id — ele é gerado lá). */
export type NewUser = Omit<User, 'id'>;

/** Todas as chaves viram um Record de labels traduzíveis. */
export type UserLabels = Record<keyof User, string>;

/** Só o ramo administrador da união de papéis. */
export type AdminRole = Extract<User['role'], 'admin'>;

/** Papéis comuns (união remanescente). */
export type RegularRole = Exclude<User['role'], 'admin'>;

/** Exige que um valor não seja nulo — útil em campos após validação. */
export type VerifiedEmail = NonNullable<User['email'] | null>;

/** A função de criação abaixo, projetada: retorno e parâmetros. */
export function createUser(input: NewUser): User {
  return { id: `usr_${input.name.length}_${input.email.length}`, ...input };
}
export type CreateUserReturn = ReturnType<typeof createUser>;
export type CreateUserInput = Parameters<typeof createUser>[0];

/** Awaited desembrulha a Promise: o tipo do resultado DEPOIS do await. */
export function saveUser(input: NewUser): Promise<User> {
  return Promise.resolve(createUser(input));
}
export type SavedUser = Awaited<ReturnType<typeof saveUser>>;

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

/** Tabela didática: utility → o que produz a partir de User (texto exibido). */
const UTILITY_ROWS: ReadonlyArray<{
  readonly name: string;
  readonly from: string;
  readonly to: string;
}> = [
  { name: 'Partial<User>', from: 'User completo', to: 'UserPatch — edição sem obrigatoriedade' },
  { name: 'Required<User>', from: 'User com opcionais', to: 'UserRegistration — tudo obrigatório' },
  { name: 'Readonly<User>', from: 'User mutável', to: 'FrozenUser — reatribuição vira erro' },
  { name: 'Pick<User, …>', from: 'todas as chaves', to: 'UserFormFields — só as do form' },
  { name: 'Omit<User, "id">', from: 'todas as chaves', to: 'NewUser — sem o id gerado' },
  { name: 'Record<keyof User, …>', from: 'chaves', to: 'UserLabels — label por campo' },
  { name: "Extract<'admin' | 'user', 'admin'>", from: 'união', to: "AdminRole = 'admin'" },
  { name: "Exclude<'admin' | 'user', 'admin'>", from: 'união', to: "RegularRole = 'user'" },
  { name: 'NonNullable<T | null>', from: 'união anulável', to: 'VerifiedEmail — string' },
  { name: 'ReturnType<typeof createUser>', from: 'assinatura', to: 'User' },
  { name: 'Parameters<typeof createUser>[0]', from: 'assinatura', to: 'NewUser' },
  { name: 'Awaited<Promise<User>>', from: 'Promise', to: 'User (pós-await)' },
];

export function init(root: HTMLElement): Cleanup {
  const controller = new AbortController();
  const { signal } = controller;

  // --- Formulário: valida contra UserRegistration (Required<User>) ---
  const nameInput = h('input', {
    attrs: { type: 'text', placeholder: 'Sandro', 'aria-label': 'Nome' },
  });
  const emailInput = h('input', {
    attrs: { type: 'email', placeholder: 'sandro@exemplo.com', 'aria-label': 'E-mail' },
  });
  const roleSelect = h('select', { attrs: { 'aria-label': 'Papel' } });
  roleSelect.append(h('option', { attrs: { value: 'user' }, text: 'user' }));
  roleSelect.append(h('option', { attrs: { value: 'admin' }, text: 'admin' }));
  for (const field of [nameInput, emailInput]) {
    field.classList.add('btn');
  }
  roleSelect.classList.add('btn');

  const output = h('pre');
  output.classList.add('error-card__line');

  const submitButton = h('button', { attrs: { type: 'button' }, text: 'Cadastrar' });
  submitButton.classList.add('btn', 'btn--primary');
  submitButton.addEventListener(
    'click',
    () => {
      // Candidato a UserRegistration: o REQUIRED garante que nada vem vazio.
      const candidate: UserRegistration = {
        id: 'gerado-pelo-servidor',
        name: nameInput.value,
        email: emailInput.value,
        password: '••••••••',
        role: roleSelect.value === 'admin' ? 'admin' : 'user',
        newsletter: true,
      };
      if (candidate.name.trim() === '' || candidate.email.trim() === '') {
        output.textContent = '✗ Required<User>: name e email não podem ser vazios.';
        return;
      }
      const user = createUser(candidate); // NewUser é aceito: Omit<User, 'id'>
      // Pick protege a saída: expomos só os campos públicos — password nem entra.
      const safeUser: Pick<User, 'id' | 'name' | 'email' | 'role' | 'newsletter'> = user;
      output.textContent = JSON.stringify(safeUser, null, 2);
    },
    { signal },
  );

  const form = h('div', { children: [nameInput, emailInput, roleSelect, submitButton] });
  form.classList.add('demo-slot__controls');

  // --- Tabela das doze utility types ---
  const table = h('table', { attrs: { 'aria-label': 'Utility types derivados de User' } });
  table.classList.add('doc-table');
  const head = h('thead', {
    children: [
      h('tr', {
        children: [
          h('th', { text: 'Utility type' }),
          h('th', { text: 'Entrada' }),
          h('th', { text: 'Resultado' }),
        ],
      }),
    ],
  });
  const body = h('tbody');
  for (const row of UTILITY_ROWS) {
    body.append(
      h('tr', {
        children: [
          h('td', { children: [h('code', { text: row.name })] }),
          h('td', { text: row.from }),
          h('td', { text: row.to }),
        ],
      }),
    );
  }
  table.append(head, body);

  root.replaceChildren(form, output, table);
  return () => {
    controller.abort();
  };
}
