export const API_BASE_URL = process.env.REACT_APP_API_URL ;

// Gerenciador interno de token (Memória - mais seguro que localStorage)
let memoryToken: string | null = null;

export const setApiToken = (token: string | null) => {
  memoryToken = token;
};

const getHeaders = (contentType: string | null = 'application/json') => {
  const headers: HeadersInit = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (memoryToken) {
    headers['Authorization'] = `Bearer ${memoryToken}`;
  }
  return headers;
};

// Wrapper para fetch para centralizar segurança e credenciais com lógica de retry e timeout
const secureFetch = async (url: string, options: RequestInit = {}, retries = 3, backoff = 1000): Promise<Response> => {
  const timeout = 15000; // 15 segundos de timeout por tentativa
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    
    // Se a resposta não for OK e ainda houver retries, e for um erro de servidor (5xx) ou timeout (408)
    if (!response.ok && retries > 0 && (response.status >= 500 || response.status === 408)) {
      console.warn(`Request failed with status ${response.status}. Retrying in ${backoff}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return secureFetch(url, options, retries - 1, backoff * 2);
    }
    
    return response;
  } catch (error: any) {
    clearTimeout(id);
    // Se houver um erro de rede ou timeout (AbortError)
    if (retries > 0) {
      const isTimeout = error.name === 'AbortError';
      console.warn(`${isTimeout ? 'Timeout' : 'Network error'}: ${error}. Retrying in ${backoff}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return secureFetch(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
};

export interface UserRegistrationData {
  email: string;
  password: string;
  nome_completo: string;
  data_nascimento: string;
  genero: string;
  language: string;
  cidade_nascimento: { cidade?: string; estado?: string };
  cidade_atual: { cidade?: string; estado?: string };
  historico_moradia: any[];
  familiares: any[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface SessionResponse {
  id: number;
  user_id: string;
  dataset_id: number;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  status: 'active' | 'cancelled' | 'finished';
  numero_frase: number;
}

export const api = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await secureFetch(`${API_BASE_URL}/auth/jwt/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
    }

    const data = await response.json();
    setApiToken(data.access_token); // Armazena na memória
    return data;
  },

  register: async (data: UserRegistrationData): Promise<void> => {
    const response = await secureFetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData) || 'Registration failed');
    }
  },

  createSession: async (dataset_id: number, termos: boolean): Promise<SessionResponse> => {
    const response = await secureFetch(`${API_BASE_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ dataset_id, termos }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409 && errorData.detail?.session) {
            const error = new Error(errorData.detail.message) as any;
            error.session = errorData.detail.session;
            throw error;
        }
        throw new Error(errorData.detail || 'Failed to create session');
    }
    return response.json();
  },

  // Simplificado: Todas as funções agora usam getHeaders() interno
  getSession: async (id: string): Promise<SessionResponse> => {
    const response = await secureFetch(`${API_BASE_URL}/api/v1/sessions/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch session');
    return response.json();
  },

  forgotPassword: async (email: string): Promise<void> => {
    const response = await secureFetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    });

    if (response.status !== 202) {
      throw new Error('Failed to send password reset email');
    }
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    const response = await secureFetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      throw new Error('Failed to reset password');
    }
  },

  put: async (path: string, data: any): Promise<any> => {
    const response = await secureFetch(`${API_BASE_URL}/api/v1${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to PUT ${path}`);
    return response.json();
  },

  uploadRecording: async (
    sessionId: number,
    datasetId: number,
    blockId: number,
    audioBlob: Blob,
    duration: number,
    format: string,
    sampleRate: number,
    is_room_tone: boolean,
    phraseId?: number,
    frase_content?: string,
    room_tone_type?: 'start' | 'end',
    audioId?: string
  ): Promise<any> => {
    const formData = new FormData();
    formData.append('session_id', sessionId.toString());
    formData.append('dataset_id', datasetId.toString());
    formData.append('bloco_id', blockId.toString());
    formData.append('audio_id', audioId || '');
    formData.append('duration', duration.toString());
    formData.append('format', format);
    formData.append('sample_rate', sampleRate.toString());
    formData.append('audio_file', audioBlob, 'recording.wav');
    formData.append('is_test', 'false');
    formData.append('room_tone_start', room_tone_type === 'start' ? '1' : '0');
    formData.append('room_tone_end', room_tone_type === 'end' ? '1' : '0');
    formData.append('is_room_tone', String(is_room_tone));

    if (phraseId) formData.append('frase_id', phraseId.toString());
    if (frase_content) formData.append('frase_content', frase_content);

    const response = await secureFetch(`${API_BASE_URL}/api/v1/recordings`, {
      method: 'POST',
      headers: getHeaders(null), // null para deixar o browser definir boundary do FormData
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData.detail) || 'Failed to upload recording');
    }
    return response.json();
  },

  heartbeat: async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/`, { method: 'GET' });
    } catch (e) {
      console.warn('API Heartbeat failed:', e);
    }
  },
};
