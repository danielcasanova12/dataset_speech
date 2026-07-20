import {
  clearIbgeCacheForTests,
  listBrazilianStates,
  listCitiesByState,
} from './ibge';

const ibgeResponse = (data: unknown): Response => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(data),
} as unknown as Response);

afterEach(() => {
  jest.restoreAllMocks();
  clearIbgeCacheForTests();
});

test('sorts and caches states so simultaneous selects share one request', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(ibgeResponse([
    { id: 2, sigla: 'SP', nome: 'São Paulo' },
    { id: 1, sigla: 'AC', nome: 'Acre' },
  ]));

  const [first, second] = await Promise.all([listBrazilianStates(), listBrazilianStates()]);

  expect(first.map(state => state.sigla)).toEqual(['AC', 'SP']);
  expect(second).toBe(first);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('loads cities with the normalized state code and caches the result', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(ibgeResponse([
    { id: 2, nome: 'Santos' },
    { id: 1, nome: 'Campinas' },
  ]));

  const cities = await listCitiesByState('sp');
  const cachedCities = await listCitiesByState('SP');

  expect(cities.map(city => city.nome)).toEqual(['Campinas', 'Santos']);
  expect(cachedCities).toBe(cities);
  expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/estados\/SP\/municipios$/);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('rejects an invalid state code without calling the network', async () => {
  const fetchMock = jest.spyOn(global, 'fetch');

  await expect(listCitiesByState('')).rejects.toThrow('Selecione um estado válido.');
  expect(fetchMock).not.toHaveBeenCalled();
});

test('keeps all states available from the local fallback when IBGE is offline', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));

  const states = await listBrazilianStates();

  expect(states).toHaveLength(27);
  expect(states).toEqual(expect.arrayContaining([
    expect.objectContaining({ sigla: 'SP', nome: 'São Paulo' }),
  ]));
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
