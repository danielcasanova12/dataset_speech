
import axios from 'axios';
import { UserInfo } from '../components/UserInfoForm';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
});

// Add a request interceptor to include the token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Authentication Endpoints ---

export const loginUser = async (credentials: URLSearchParams) => {
  // The backend expects x-www-form-urlencoded for login
  const response = await api.post('/auth/jwt/login', credentials, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
};

export const registerUser = async (userData: any) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};


// --- Existing API Functions (Refactored) ---

export const getOrCreateSession = async (dataset: string): Promise<string> => {
  let sessionId = localStorage.getItem('recordingSessionId');
  if (sessionId) {
    console.log('Found existing session ID:', sessionId);
    return sessionId;
  }

  console.log('No session ID found, creating a new one.');
  
  try {
    const response = await api.post('/api/v1/sessions', { dataset });
    
    sessionId = response.data.id;
    if (!sessionId) {
      throw new Error("Session ID not found in API response.");
    }
    
    localStorage.setItem('recordingSessionId', sessionId);
    console.log('New session created and saved:', sessionId);
    return sessionId;

  } catch (error) {
    console.error("An error occurred during session creation:", error);
    throw error;
  }
};

export const uploadAudio = async (audioBlob: Blob, metadata: any, dataset: string) => {
  const sessionId = await getOrCreateSession(dataset);

  const formData = new FormData();
  const sanitizedType = audioBlob.type.split(';')[0];
  const sanitizedBlob = new Blob([audioBlob], { type: sanitizedType });

  formData.append("audio", sanitizedBlob, `recording.${metadata.format || 'webm'}`);
  formData.append("id_session", sessionId);
  
  const isEmotionDataset = metadata.datasetId === '3';
  formData.append("emocao", isEmotionDataset ? metadata.emotionId || "none" : "none");
  formData.append("claimed_duration", String(metadata.claimed_duration));

  try {
    const response = await api.post('/api/v1/recordings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log("Upload successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("An error occurred during the upload:", error);
    throw error;
  }
};

export const fetchPhrases = async (datasetId: string): Promise<any[]> => {
  try {
    const response = await api.get(`/api/v1/phrases/${datasetId}`);
    return response.data;
  } catch (error) {
    console.error("An error occurred while fetching phrases:", error);
    throw error;
  }
};
