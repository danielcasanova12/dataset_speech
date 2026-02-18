export const API_BASE_URL = 'https://34.204.18.104';
// export const API_BASE_URL = 'http://127.0.0.1';
export interface CidadeEstado {
  cidade?: string;
  estado?: string;
}

export interface HistoricoMoradia {
  periodo: string;
  endereco: CidadeEstado;
}

export interface Familiar {
  nome: string;
  grau_parentesco: string;
  endereco: CidadeEstado;
}


export interface UserRegistrationData {
  email: string;
  password: string;
  nome_completo: string;
  data_nascimento: string;
  genero: string;
  language: string;
  cidade_nascimento: CidadeEstado;
  cidade_atual: CidadeEstado;
  historico_moradia: HistoricoMoradia[];
  familiares: Familiar[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface SessionResponse {
  id: number;
  user_id: string;
  dataset_id: number;
  started_at: string; // ou Date, se você for converter
  finished_at: string | null; // ou Date | null
  notes: string | null;
  vocal_health_note: string | null;
  termos: boolean;
  status: 'active' | 'cancelada' | 'finalizada';
  numero_frase: number;
}

export interface RecordingResponse {
  id_recordings: number;
  session_id: number;
  dataset_id: number;
  bloco_id: number;
  frase_id: number;
  path_local: string;
  audio_url_drive: string | null;
  audio_url_s3: string | null;
  is_test: boolean;
  duration: number;
  format: string;
  sample_rate: number;
  frase_content: string | null;
  room_tone_start: number | null;
  room_tone_end: number | null;
  created_at: string;
}

export const api = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/jwt/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
    }

    return response.json();
  },

  register: async (data: UserRegistrationData): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json();
        // Handle validation errors or other issues
        throw new Error(JSON.stringify(errorData) || 'Registration failed');
    }
  },

  createSession: async (dataset_id: number, termos: boolean, token: string): Promise<SessionResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ dataset_id, termos }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        // Se uma sessão ativa já existe, o backend retorna 409 com os detalhes
        if (response.status === 409 && errorData.detail && errorData.detail.session) {
            // Lança um erro customizado que a UI pode capturar
            const error = new Error(errorData.detail.message) as any;
            error.session = errorData.detail.session; // Anexa a sessão existente ao erro
            throw error;
        }
        throw new Error(errorData.detail || 'Failed to create session');
    }

    return response.json();
  },

  getSession: async (id: string, token: string): Promise<SessionResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch session');
    }

    return response.json();
  },

  getRecording: async (id: number, token: string): Promise<RecordingResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/recordings/${id}` , {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch recording');
    }

    return response.json();
  },

  forgotPassword: async (email: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (response.status !== 202) {
      throw new Error('Failed to send password reset email');
    }
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      throw new Error('Failed to reset password');
    }
  },

  patch: async (path: string, data: any, token: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to patch ${path}`);
    }

    return response.json();
  },

  put: async (path: string, data: any, token: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to PUT ${path}`);
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
    token: string,
    is_room_tone: boolean,
    phraseId?: number,
    frase_content?: string,
    room_tone_type?: 'start' | 'end'
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
    formData.append('is_room_tone', String(is_room_tone));

    if (phraseId) {
      formData.append('phrase_id', phraseId.toString());
    }
    if (frase_content) {
      formData.append('frase_content', frase_content);
    }


    const response = await fetch(`${API_BASE_URL}/api/v1/recordings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData.detail) || 'Failed to upload recording');
    }

    return response.json();
  },
};
// Force re-evaluation
