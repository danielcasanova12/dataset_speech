import { api, setApiToken } from './api';

const jsonResponse = (data: unknown, status = 200): Response => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => 'application/json' },
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
} as unknown as Response);

afterEach(() => {
  jest.restoreAllMocks();
  setApiToken(null);
  sessionStorage.clear();
});

test('confirms a local recording upload as soon as the server returns HTTP 200', async () => {
  const json = jest.fn(() => new Promise(() => undefined));
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json,
  } as unknown as Response);

  await expect(api.uploadLocalRecording(1784554457364, '42')).resolves.toEqual({
    ok: true,
    status: 200,
  });

  expect(json).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:9000/api/recordings/1784554457364/upload',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ user_id: '42' }),
    }),
  );
});

test('sends login credentials as form data and stores the returned token', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({
    access_token: 'login-token',
    token_type: 'bearer',
  }));

  await api.login('pessoa@example.com', 'senha-segura');
  await api.getCurrentUser();

  const loginCall = fetchMock.mock.calls[0];
  expect(String(loginCall[0])).toMatch(/\/auth\/jwt\/login$/);
  expect(loginCall[1]).toEqual(expect.objectContaining({
    method: 'POST',
    body: expect.any(URLSearchParams),
  }));
  expect(String(loginCall[1]?.body)).toBe('username=pessoa%40example.com&password=senha-segura');

  const currentUserCall = fetchMock.mock.calls[1];
  expect(currentUserCall[1]).toEqual(expect.objectContaining({
    headers: expect.objectContaining({ Authorization: 'Bearer login-token' }),
  }));
});

test('surfaces the API error envelope and field validation messages', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Verifique os campos informados.',
      field_errors: {
        language: ['Informe um texto maior.'],
      },
    },
  }, 422));

  await expect(api.register({
    email: 'pessoa@example.com',
    password: 'senha-segura',
    nome_completo: 'Pessoa Teste',
    data_nascimento: '1990-01-01',
    genero: 'Outro',
    language: '',
    cidade_nascimento: { cidade: 'São Paulo', estado: 'SP' },
    cidade_atual: { cidade: 'São Paulo', estado: 'SP' },
    historico_moradia: [],
    familiares: [],
  })).rejects.toMatchObject({
    status: 422,
    code: 'VALIDATION_ERROR',
    message: expect.stringMatching(/Idioma: Informe um texto maior/),
  });
});

test('uses a restored session token when logging out on the server', async () => {
  sessionStorage.setItem('access_token', 'restored-token');
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}));

  await api.logout();

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/auth\/jwt\/logout$/),
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer restored-token' }),
    }),
  );
});

test('creates sessions using only fields declared by the OpenAPI schema', async () => {
  setApiToken('session-token');
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ id: 10 }));

  await api.createSession(1, true);

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/v1\/sessions$/),
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ dataset_id: 1, termos: true }),
    }),
  );
});
