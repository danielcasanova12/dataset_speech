export const API_BASE_URL = 'http://127.0.0.1:8000';

export interface CidadeEstado {
  cidade: string;
  estado: string;
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
  id: string; // Assuming session response has an ID
  dataset: string;
  // Add other fields if returned
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

  createSession: async (dataset: string, token: string): Promise<SessionResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ dataset }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create session');
    }

    return response.json();
  },
};
