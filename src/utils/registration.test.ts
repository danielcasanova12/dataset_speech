import { createGuestPassword, normalizeHousingHistory, validateRegistrationData } from './registration';

const validRegistration = {
  email: 'pessoa@example.com',
  password: 'senha-segura',
  nome_completo: 'Pessoa Teste',
  data_nascimento: '1990-01-01',
  genero: 'Outro',
  language: 'pt-BR',
  cidade_nascimento: { cidade: 'São Paulo', estado: 'SP' },
  cidade_atual: { cidade: 'Campinas', estado: 'SP' },
  historico_moradia: [],
  familiares: [],
};

test('requires the language and both complete addresses', () => {
  expect(validateRegistrationData({ ...validRegistration, language: '' })).toBe('Selecione o idioma principal.');
  expect(validateRegistrationData({
    ...validRegistration,
    cidade_atual: { cidade: '', estado: 'SP' },
  })).toBe('Informe o estado e a cidade atual.');
});

test('removes only completely empty housing history entries', () => {
  expect(normalizeHousingHistory([
    { periodo: '', endereco: { estado: '', cidade: '' } },
    { periodo: '2 anos', endereco: { estado: 'SP', cidade: 'Santos' } },
  ])).toEqual([
    { periodo: '2 anos', endereco: { estado: 'SP', cidade: 'Santos' } },
  ]);
});

test('creates strong per-visitor passwords instead of a shared credential', () => {
  const originalCrypto = globalThis.crypto;
  let seed = 0;
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      getRandomValues: (bytes: Uint8Array) => {
        seed += 1;
        bytes.fill(seed);
        return bytes;
      },
    },
  });

  const first = createGuestPassword();
  const second = createGuestPassword();

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: originalCrypto,
  });

  expect(first).toMatch(/^Visitante-[a-f0-9]{32}-Aa1!$/);
  expect(second).not.toBe(first);
  expect(first).not.toContain('DEFAULT_GUEST_PASSWORD');
});
