export const API_BASE_URL = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');

// Gerenciador interno de token (Memória - mais seguro que localStorage)
let memoryToken: string | null = null;

export const setApiToken = (token: string | null) => {
  memoryToken = token;
};

export const getApiToken = () => memoryToken || sessionStorage.getItem('access_token') || null;

const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;
const LOCAL_RECORDING_API_BASE_URL = (process.env.REACT_APP_LOCAL_RECORDING_API_URL || 'http://localhost:9000').replace(/\/+$/, '');

const getHeaders = (contentType: string | null = 'application/json') => {
  const headers: HeadersInit = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  const token = getApiToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const readResponseBody = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => '');
  return text || null;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const FIELD_LABELS: Record<string, string> = {
  email: 'E-mail',
  password: 'Senha',
  language: 'Idioma',
  cidade_nascimento: 'Cidade de nascimento',
  cidade_atual: 'Cidade atual',
  data_nascimento: 'Data de nascimento',
};

const getApiError = async (response: Response, fallback: string): Promise<ApiRequestError> => {
  const data = await readResponseBody(response);

  if (!data) return new ApiRequestError(fallback, response.status);

  if (typeof data === 'string') return new ApiRequestError(data, response.status);

  const envelope = data.error && typeof data.error === 'object' ? data.error : data;
  const fieldErrors = envelope.field_errors && typeof envelope.field_errors === 'object'
    ? envelope.field_errors as Record<string, string[]>
    : undefined;
  const fieldMessage = fieldErrors
    ? Object.entries(fieldErrors)
        .flatMap(([field, messages]) => {
          const label = FIELD_LABELS[field] || field;
          const normalizedMessages = Array.isArray(messages) ? messages : [String(messages)];
          return normalizedMessages.map(message => `${label}: ${message}`);
        })
        .join(' ')
    : '';

  const detail = envelope.detail;
  let message = '';
  if (typeof detail === 'string') message = detail;
  if (Array.isArray(detail)) {
    message = detail
      .map(item => item?.msg || item?.message)
      .filter(Boolean)
      .join(' ');
  }
  if (!message && detail && typeof detail === 'object') {
    message = detail.message || detail.detail || JSON.stringify(detail);
  }
  if (!message) message = envelope.message || fallback;
  if (fieldMessage) message = `${message} ${fieldMessage}`.trim();

  return new ApiRequestError(message, response.status, envelope.code, fieldErrors);
};

const getErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  return (await getApiError(response, fallback)).message;
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

export interface CurrentUser {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
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

export interface UserSession extends SessionResponse {
  termos?: boolean;
  recordings_count?: number;
}

export interface MusicListItem {
  id: number;
  nome: string;
  genero: string;
  bpm: number | null;
  time_signature: string | null;
  has_vocal_audio: boolean;
  has_instrumental_audio: boolean;
  vocal_audio_url?: string | null;
  instrumental_audio_url?: string | null;
}

export interface MusicDetails extends MusicListItem {
  texto: string | null;
  vocal_audio_url: string | null;
  instrumental_audio_url: string | null;
}

export type MusicAudioKind = 'vocal' | 'instrumental';

export interface MusicAudioAccessResponse {
  music_id: number;
  kind: MusicAudioKind;
  audio_available: boolean;
  audio_url: string | null;
  expires_in: number | null;
  mime_type: string | null;
  size_bytes: number | null;
}

export interface LocalMicrophone {
  id?: string | number;
  microphone_id?: string | number;
  index?: string | number;
  device_id?: string | number;
  name?: string;
  label?: string;
  is_default?: boolean;
  selected?: boolean;
}

export interface LocalRecordingMetadata {
  id_recordings?: number | string;
  recording_id?: number | string;
  user_id?: number | string;
  session_id?: number | string;
  duration?: number;
  sample_rate?: number;
  format?: string;
  path?: string;
  audio_path?: string;
  [key: string]: any;
}

export interface LocalRecordingStartPayload {
  user_id: string;
  session_id: number;
  id_recordings: number;
  dataset_id: number;
  bloco_id: number;
  created_at: string;
  audio_id: string;
  step_type: 'music' | 'spoken';
  frase_content: string;
  text_prompt?: string;
  background_audio_url?: string;
}

export interface LocalRecordingStopPayload {
  user_id: string;
  session_id: number;
  id_recordings: number;
}

export interface MusicUpsertPayload {
  nome?: string;
  genero?: string;
  texto?: string;
  bpm?: number | null;
  time_signature?: string | null;
  vocal_audio_file?: File | null;
  instrumental_audio_file?: File | null;
}

export interface RecordingAudioRead {
  id_recordings: number;
  session_id: number;
  dataset_id: number;
  bloco_id: number;
  frase_id: number | null;
  duration: number | null;
  format: string | null;
  sample_rate: number | null;
  frase_content: string | null;
  is_test: boolean;
  created_at: string;
  audio_url?: string | null;
  audio_source?: 's3' | 'local' | null;
  audio_available?: boolean;
  expires_in?: number | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  room_tone_start?: number | null;
  room_tone_end?: number | null;
  extra_info?: Record<string, any> | null;
}

export interface RecordingListResponse {
  total: number;
  page: number;
  page_size: number;
  items: RecordingAudioRead[];
}

export interface RecordingAudioAccessResponse {
  recording_id: number;
  audio_available: boolean;
  audio_url: string | null;
  expires_in: number | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string | null;
}

export interface RecordingListFilters {
  recording_id?: number | null;
  session_id?: number | null;
  user_id?: string | null;
  latest_session?: boolean;
  page?: number;
  page_size?: number;
  order?: 'asc' | 'desc';
  has_audio?: boolean | null;
}

export const api = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await secureFetch(buildApiUrl('/auth/jwt/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!response.ok) {
        throw await getApiError(response, 'Falha no login. Verifique suas credenciais.');
    }

    const data = await response.json();
    setApiToken(data.access_token); // Armazena na memória
    return data;
  },

  register: async (data: UserRegistrationData): Promise<void> => {
    const response = await secureFetch(buildApiUrl('/auth/register'), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw await getApiError(response, 'Falha no cadastro. Verifique os dados informados.');
    }
  },

  logout: async (): Promise<void> => {
    const response = await secureFetch(buildApiUrl('/auth/jwt/logout'), {
      method: 'POST',
      headers: getHeaders(),
    }, 0);

    if (!response.ok && response.status !== 401) {
      throw await getApiError(response, 'Não foi possível encerrar a sessão no servidor.');
    }
  },

  getCurrentUser: async (): Promise<CurrentUser> => {
    const response = await secureFetch(buildApiUrl('/users/me'), {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw await getApiError(response, 'Não foi possível carregar o usuário atual.');
    }

    return response.json();
  },

  createSession: async (
    dataset_id: number,
    termos: boolean,
  ): Promise<SessionResponse> => {
    const response = await secureFetch(buildApiUrl('/api/v1/sessions'), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ dataset_id, termos }),
    });

    if (!response.ok) {
      const errorData = await readResponseBody(response);
      const envelope = errorData?.error && typeof errorData.error === 'object' ? errorData.error : errorData;
      const detail = envelope?.detail;
      const existingSession = detail?.session || envelope?.session;
      if (response.status === 409 && existingSession) {
        const error = new ApiRequestError(
          detail?.message || envelope?.message || 'Já existe uma sessão ativa para este usuário.',
          response.status,
          envelope?.code,
        ) as ApiRequestError & { session: SessionResponse };
        error.session = existingSession;
        throw error;
      }

      const message = typeof detail === 'string'
        ? detail
        : detail?.message || detail?.detail || envelope?.message || 'Não foi possível criar a sessão.';
      throw new ApiRequestError(message, response.status, envelope?.code, envelope?.field_errors);
    }
    return response.json();
  },

  getUserSessions: async (userId: string): Promise<UserSession[]> => {
    const response = await secureFetch(buildApiUrl(`/api/v1/sessions/active-${encodeURIComponent(userId)}`), {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível carregar as sessões do usuário.'));
    }

    return response.json();
  },

  forgotPassword: async (email: string): Promise<void> => {
    const response = await secureFetch(buildApiUrl('/auth/forgot-password'), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    });

    if (response.status !== 202) {
      throw await getApiError(response, 'Falha ao enviar o e-mail de redefinição de senha.');
    }
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    const response = await secureFetch(buildApiUrl('/auth/reset-password'), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      throw await getApiError(response, 'Falha ao redefinir a senha.');
    }
  },

  put: async (path: string, data: any): Promise<any> => {
    const response = await secureFetch(buildApiUrl(`/api/v1${path}`), {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`Failed to PUT ${path}`);
    return response.json();
  },

  listMusics: async (genero?: string | null): Promise<MusicListItem[]> => {
    const query = new URLSearchParams();
    if (genero && genero.trim()) {
      query.append('genero', genero.trim());
    }

    const querySuffix = query.toString() ? `?${query.toString()}` : '';
    const response = await secureFetch(buildApiUrl(`/api/v1/musics${querySuffix}`), {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Não foi possível carregar a lista de músicas.');
    }

    return response.json();
  },

  getMusic: async (id: number): Promise<MusicDetails> => {
    const response = await secureFetch(buildApiUrl(`/api/v1/musics/${id}`), {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Não foi possível carregar os detalhes da música ${id}.`);
    }

    return response.json();
  },

  getMusicAudio: async (id: number, kind: MusicAudioKind): Promise<MusicAudioAccessResponse> => {
    const query = new URLSearchParams({ kind });
    const response = await secureFetch(buildApiUrl(`/api/v1/musics/${id}/audio?${query.toString()}`), {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, `Não foi possível carregar o áudio ${kind} da música ${id}.`));
    }

    return response.json();
  },

  createMusic: async (payload: MusicUpsertPayload): Promise<MusicListItem> => {
    const formData = new FormData();

    if (payload.nome !== undefined) formData.append('nome', payload.nome);
    if (payload.genero !== undefined) formData.append('genero', payload.genero);
    if (payload.texto !== undefined) formData.append('texto', payload.texto);
    if (payload.bpm !== undefined && payload.bpm !== null) formData.append('bpm', String(payload.bpm));
    if (payload.time_signature !== undefined && payload.time_signature !== null && payload.time_signature.trim()) {
      formData.append('time_signature', payload.time_signature.trim());
    }
    if (payload.vocal_audio_file) formData.append('vocal_audio_file', payload.vocal_audio_file);
    if (payload.instrumental_audio_file) formData.append('instrumental_audio_file', payload.instrumental_audio_file);

    const response = await secureFetch(buildApiUrl('/api/v1/musics'), {
      method: 'POST',
      headers: getHeaders(null),
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível cadastrar a música.'));
    }

    return response.json();
  },

  updateMusic: async (id: number, payload: MusicUpsertPayload): Promise<MusicListItem> => {
    const formData = new FormData();

    if (payload.nome !== undefined) formData.append('nome', payload.nome);
    if (payload.genero !== undefined) formData.append('genero', payload.genero);
    if (payload.texto !== undefined) formData.append('texto', payload.texto);
    if (payload.bpm !== undefined && payload.bpm !== null) formData.append('bpm', String(payload.bpm));
    if (payload.time_signature !== undefined && payload.time_signature !== null && payload.time_signature.trim()) {
      formData.append('time_signature', payload.time_signature.trim());
    }
    if (payload.vocal_audio_file) formData.append('vocal_audio_file', payload.vocal_audio_file);
    if (payload.instrumental_audio_file) formData.append('instrumental_audio_file', payload.instrumental_audio_file);

    const response = await secureFetch(buildApiUrl(`/api/v1/musics/${id}`), {
      method: 'PATCH',
      headers: getHeaders(null),
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, `Não foi possível atualizar a música ${id}.`));
    }

    return response.json();
  },

  listRecordings: async (filters: RecordingListFilters = {}): Promise<RecordingListResponse> => {
    const query = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });

    const querySuffix = query.toString() ? `?${query.toString()}` : '';
    const response = await secureFetch(buildApiUrl(`/api/v1/recordings${querySuffix}`), {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível carregar as gravações.'));
    }

    return response.json();
  },

  getRecordingAudio: async (id: number): Promise<RecordingAudioAccessResponse> => {
    const response = await secureFetch(buildApiUrl(`/api/v1/recordings/${id}/audio`), {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, `Não foi possível carregar o áudio da gravação ${id}.`));
    }

    return response.json();
  },

  getAdminUserIdByEmail: async (email: string): Promise<string> => {
    const query = new URLSearchParams({ email });
    const response = await secureFetch(buildApiUrl(`/admin/users/id-by-email?${query.toString()}`), {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível localizar o usuário por e-mail.'));
    }

    return response.json();
  },

  getAdminSessionRecordings: async (sessionId: number): Promise<RecordingAudioRead[]> => {
    const response = await secureFetch(buildApiUrl(`/api/v1/recordings/sessions/${sessionId}/audios`), {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível carregar as gravações da sessão.'));
    }

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
    phraseId?: number,
    frase_content?: string,
    room_tone_type?: 'start' | 'end',
  ): Promise<any> => {
    const formData = new FormData();
    formData.append('session_id', sessionId.toString());
    formData.append('dataset_id', datasetId.toString());
    formData.append('bloco_id', blockId.toString());
    formData.append('duration', duration.toString());
    formData.append('format', format);
    formData.append('sample_rate', sampleRate.toString());
    formData.append('audio_file', audioBlob, 'recording.wav');
    formData.append('is_test', 'false');
    formData.append('room_tone_start', room_tone_type === 'start' ? '1' : '0');
    formData.append('room_tone_end', room_tone_type === 'end' ? '1' : '0');

    if (phraseId) formData.append('frase_id', phraseId.toString());
    if (frase_content) formData.append('frase_content', frase_content);

    const response = await secureFetch(buildApiUrl('/api/v1/recordings'), {
      method: 'POST',
      headers: getHeaders(null), // null para deixar o browser definir boundary do FormData
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Failed to upload recording'));
    }
    return response.json();
  },

  localRecordingHealth: async (): Promise<void> => {
    const response = await fetch(`${LOCAL_RECORDING_API_BASE_URL}/health`, { method: 'GET' });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'API local de gravação indisponível.'));
    }
  },

  listLocalMicrophones: async (): Promise<LocalMicrophone[]> => {
    const response = await fetch(`${LOCAL_RECORDING_API_BASE_URL}/api/microphones`, { method: 'GET' });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível listar microfones na API local.'));
    }

    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.microphones)) return data.microphones;
    if (Array.isArray(data.devices)) return data.devices;
    return [];
  },

  getSelectedLocalMicrophone: async (): Promise<LocalMicrophone | null> => {
    const response = await fetch(`${LOCAL_RECORDING_API_BASE_URL}/api/microphones/selected`, { method: 'GET' });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível consultar o microfone selecionado na API local.'));
    }

    return response.json();
  },

  selectLocalMicrophone: async (microphoneId: string | number): Promise<void> => {
    const response = await fetch(`${LOCAL_RECORDING_API_BASE_URL}/api/microphones/selected`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        microphone_id: microphoneId,
      }),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível selecionar o microfone na API local.'));
    }
  },

  startLocalRecording: async (payload: LocalRecordingStartPayload): Promise<LocalRecordingMetadata> => {
    const response = await fetch(`${LOCAL_RECORDING_API_BASE_URL}/api/recordings/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível iniciar a gravação na API local.'));
    }

    const data = await response.json().catch(() => ({}));
    if (data && data.success === false) {
      const error = new Error(data.message || 'Não foi possível iniciar a gravação na API local.') as Error & {
        active_recording?: LocalRecordingStopPayload;
      };
      error.active_recording = data.active_recording;
      throw error;
    }
    return data;
  },

  stopLocalRecording: async (payload: LocalRecordingStopPayload): Promise<LocalRecordingMetadata> => {
    const response = await fetch(`${LOCAL_RECORDING_API_BASE_URL}/api/recordings/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível parar a gravação na API local.'));
    }

    const data = await response.json().catch(() => ({}));
    if (data && data.success === false) {
      throw new Error(data.message || 'Não foi possível parar a gravação na API local.');
    }
    return data;
  },

  getLatestLocalRecording: async (userId: string | number): Promise<LocalRecordingMetadata> => {
    const response = await fetch(`${LOCAL_RECORDING_API_BASE_URL}/api/recordings/latest/${encodeURIComponent(userId)}`, { method: 'GET' });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível carregar a última gravação local.'));
    }

    return response.json();
  },

  getLatestLocalRecordingAudio: async (userId: string | number): Promise<Blob> => {
    const response = await fetch(`${LOCAL_RECORDING_API_BASE_URL}/api/recordings/latest/${encodeURIComponent(userId)}/audio`, { method: 'GET' });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível carregar o áudio local gravado.'));
    }

    return response.blob();
  },

  getLocalRecordingAudio: async (idRecordings: number): Promise<Blob> => {
    const response = await fetch(`${LOCAL_RECORDING_API_BASE_URL}/api/recordings/${idRecordings}/audio`, { method: 'GET' });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível carregar o áudio local gravado.'));
    }

    return response.blob();
  },

  uploadLatestLocalRecording: async (userId: string | number): Promise<any> => {
    const token = getApiToken();
    const response = await fetch(`${LOCAL_RECORDING_API_BASE_URL}/api/recordings/latest/${encodeURIComponent(userId)}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível enviar a gravação local para a API remota.'));
    }

    const data = await response.json().catch(() => ({}));
    if (data && data.success === false) {
      throw new Error(data.message || 'Não foi possível enviar a gravação local para a API remota.');
    }
    return data;
  },

  uploadLocalRecording: async (idRecordings: number, userId: string): Promise<any> => {
    const token = getApiToken();
    const response = await fetch(`${LOCAL_RECORDING_API_BASE_URL}/api/recordings/${idRecordings}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Não foi possível enviar a gravação local para a API remota.'));
    }

    return { ok: true, status: response.status };
  },

  heartbeat: async (): Promise<void> => {
    try {
      await fetch(buildApiUrl('/'), { method: 'GET' });
    } catch (e) {
      console.warn('API Heartbeat failed:', e);
    }
  },
};
