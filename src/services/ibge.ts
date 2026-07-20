const IBGE_BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const REQUEST_TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 3;

export interface BrazilianState {
  id: number;
  sigla: string;
  nome: string;
}

export interface BrazilianCity {
  id: number;
  nome: string;
}

const FALLBACK_STATES: BrazilianState[] = [
  { id: 12, sigla: 'AC', nome: 'Acre' },
  { id: 27, sigla: 'AL', nome: 'Alagoas' },
  { id: 16, sigla: 'AP', nome: 'Amapá' },
  { id: 13, sigla: 'AM', nome: 'Amazonas' },
  { id: 29, sigla: 'BA', nome: 'Bahia' },
  { id: 23, sigla: 'CE', nome: 'Ceará' },
  { id: 53, sigla: 'DF', nome: 'Distrito Federal' },
  { id: 32, sigla: 'ES', nome: 'Espírito Santo' },
  { id: 52, sigla: 'GO', nome: 'Goiás' },
  { id: 21, sigla: 'MA', nome: 'Maranhão' },
  { id: 51, sigla: 'MT', nome: 'Mato Grosso' },
  { id: 50, sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { id: 31, sigla: 'MG', nome: 'Minas Gerais' },
  { id: 15, sigla: 'PA', nome: 'Pará' },
  { id: 25, sigla: 'PB', nome: 'Paraíba' },
  { id: 41, sigla: 'PR', nome: 'Paraná' },
  { id: 26, sigla: 'PE', nome: 'Pernambuco' },
  { id: 22, sigla: 'PI', nome: 'Piauí' },
  { id: 33, sigla: 'RJ', nome: 'Rio de Janeiro' },
  { id: 24, sigla: 'RN', nome: 'Rio Grande do Norte' },
  { id: 43, sigla: 'RS', nome: 'Rio Grande do Sul' },
  { id: 11, sigla: 'RO', nome: 'Rondônia' },
  { id: 14, sigla: 'RR', nome: 'Roraima' },
  { id: 42, sigla: 'SC', nome: 'Santa Catarina' },
  { id: 35, sigla: 'SP', nome: 'São Paulo' },
  { id: 28, sigla: 'SE', nome: 'Sergipe' },
  { id: 17, sigla: 'TO', nome: 'Tocantins' },
];

let statesCache: BrazilianState[] | null = null;
let statesRequest: Promise<BrazilianState[]> | null = null;
const citiesCache = new Map<string, BrazilianCity[]>();
const citiesRequests = new Map<string, Promise<BrazilianCity[]>>();

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

const fetchJson = async <T,>(url: string): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`IBGE respondeu com HTTP ${response.status}.`);
      }

      return await response.json() as T;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await wait(300 * attempt);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Não foi possível consultar o IBGE.');
};

const ensureArray = <T,>(value: T[], resourceName: string): T[] => {
  if (!Array.isArray(value)) {
    throw new Error(`A resposta de ${resourceName} do IBGE é inválida.`);
  }
  return value;
};

export const listBrazilianStates = async (forceReload = false): Promise<BrazilianState[]> => {
  if (forceReload) {
    statesCache = null;
    statesRequest = null;
  }
  if (statesCache) return statesCache;
  if (statesRequest) return statesRequest;

  statesRequest = fetchJson<BrazilianState[]>(`${IBGE_BASE_URL}/estados`)
    .then(data => ensureArray(data, 'estados').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
    .catch(() => FALLBACK_STATES)
    .then(data => {
      statesCache = data;
      return data;
    })
    .finally(() => {
      statesRequest = null;
    });

  return statesRequest;
};

export const listCitiesByState = async (stateCode: string, forceReload = false): Promise<BrazilianCity[]> => {
  const normalizedState = stateCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalizedState)) {
    throw new Error('Selecione um estado válido.');
  }

  if (forceReload) {
    citiesCache.delete(normalizedState);
    citiesRequests.delete(normalizedState);
  }
  const cached = citiesCache.get(normalizedState);
  if (cached) return cached;
  const inFlight = citiesRequests.get(normalizedState);
  if (inFlight) return inFlight;

  const request = fetchJson<BrazilianCity[]>(`${IBGE_BASE_URL}/estados/${encodeURIComponent(normalizedState)}/municipios`)
    .then(data => ensureArray(data, 'municípios').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
    .then(data => {
      citiesCache.set(normalizedState, data);
      return data;
    })
    .finally(() => {
      citiesRequests.delete(normalizedState);
    });

  citiesRequests.set(normalizedState, request);
  return request;
};

export const clearIbgeCacheForTests = () => {
  statesCache = null;
  statesRequest = null;
  citiesCache.clear();
  citiesRequests.clear();
};
