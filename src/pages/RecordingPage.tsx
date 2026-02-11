import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Typography, Container, Paper, Box, Modal, Card, CardContent, CircularProgress, TextField } from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ConsentScreen from '../components/ConsentScreen';

import VoiceCheckScreen from '../components/VoiceCheckScreen';
import VoiceSampleScreen from '../components/VoiceSampleScreen';
import RoomToneScreen from '../components/RoomToneScreen';
import { useAuth } from '../contexts/AuthContext';
import { api, API_BASE_URL } from '../services/api';

const datasetNames: { [key: number]: string } = {
  1: "Dataset voz geral",
  2: "Dataset canto",
  3: "Dataset emoção",
};

interface Phrase {
  id: number; emocaoid: number; datasetid: number; text: string; videoSrc?: string;
}

const resolveVideoSrc = (src?: string): string | undefined => {
  if (!src) return undefined;
  const trimmed = src.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  if (trimmed.startsWith('/')) return `${base}${trimmed}`;
  return `${base}/${trimmed}`;
};

const modalStyle = {
  position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  width: 400, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4,
};

const uploadAudio = async (audioBlob: Blob, metadata: any, token: string, room_tone_end: boolean = false) => {
  const formData = new FormData();

  // Sanitize the MIME type by removing the ';codecs=...' part.
  const sanitizedType = audioBlob.type.split(';')[0];
  const sanitizedBlob = new Blob([audioBlob], { type: sanitizedType });

  formData.append("audio_file", sanitizedBlob, `recording.${metadata.format || 'webm'}`);
  formData.append("session_id", metadata.sessionId);
  formData.append("dataset_id", metadata.datasetId);
  if (metadata.blocoId) {
    formData.append("bloco_id", metadata.blocoId);
  } else {
    console.warn("bloco_id is missing for normal recording. Using placeholder '1'.");
    formData.append("bloco_id", "1"); // Fallback if not provided
  }
  if (metadata.phraseId) {
    formData.append("frase_id", metadata.phraseId);
  }
  formData.append("duration", metadata.duration.toString());
  formData.append("format", metadata.format || 'webm');
  formData.append("sample_rate", metadata.sampleRate.toString());
  // Add frase_content
  if (metadata.fraseContent) {
    formData.append("frase_content", metadata.fraseContent);
  }
  if (room_tone_end) {
    formData.append("room_tone_end", "1");
  }


  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/recordings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error ${response.status}:`, errorData.detail);
      throw new Error(`API Error: ${errorData.detail}`);
    }

    const result = await response.json();
    console.log("Upload successful:", result);
    return result;
  } catch (error) {
    console.error("An error occurred during the upload:", error);
    throw error;
  }
};

const uploadTestAudio = async (audioBlob: Blob, token: string, sessionId: string, datasetId: string, duration: number, room_tone_start: boolean = false) => {
  const formData = new FormData();

  const sanitizedType = audioBlob.type.split(';')[0];
  const format = sanitizedType.split('/')[1] || 'webm';
  const sanitizedBlob = new Blob([audioBlob], { type: sanitizedType });

  formData.append("audio_file", sanitizedBlob, `test_recording.${format}`);
  formData.append("is_test", "true");
  if (room_tone_start) {
    formData.append("room_tone_start", "1");
  }
  formData.append("session_id", sessionId);
  formData.append("dataset_id", datasetId);
  formData.append("bloco_id", "1"); // Placeholder for test recording
  formData.append("frase_id", "0"); // Placeholder for test recording
  formData.append("duration", duration.toString());
  formData.append("format", format);
  formData.append("sample_rate", "48000"); // Common sample rate, hardcoded for now.

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/recordings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error ${response.status}:`, errorData.detail);
      throw new Error(`API Error: ${errorData.detail}`);
    }

    const result = await response.json();
    console.log("Test audio upload successful:", result);
    return result;
  } catch (error) {
    console.error("An error occurred during the test audio upload:", error);
    throw error;
  }
};



const TutorialTooltip: React.FC<{ text: string; top: number; left: number; onNext: () => void; arrowTop?: string | number; }> = ({
  text,
  top,
  left,
  onNext,
  arrowTop = '50%',
}) => (
  <Box
    sx={{
      position: 'fixed',
      top,
      left,
      zIndex: 1400,
      transform: 'translateY(-50%)',
    }}
  >
    <Paper
      elevation={6}
      sx={{
        position: 'relative',
        p: 2,
        maxWidth: 260,
        bgcolor: 'background.paper',
        borderRadius: 2,
      }}
    >
      <Typography variant="body2" sx={{ mb: 2 }}>
        {text}
      </Typography>
      <Button onClick={onNext} variant="contained" size="small">
        Próximo
      </Button>

      {/* Seta azul apontando para a ESQUERDA */}
      <Box
        sx={{
          position: 'absolute',
          top: arrowTop,
          left: 0,
          transform: 'translate(-100%, -50%)',
          width: 0,
          height: 0,
          borderTop: '10px solid transparent',
          borderBottom: '10px solid transparent',
          borderRight: '10px solid #1976d2',
        }}
      />
    </Paper>
  </Box>
);

const convertGoogleDriveUrl = (url: string): string | null => {
  if (!url || !url.includes('drive.google.com')) return null;
  const match = url.match(/file\/d\/(.*?)\//);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return null;
};

// --- MAIN COMPONENT ---
const RecordingPage: React.FC = () => {
  // --- NAVIGATION & PARAMS ---
  const navigate = useNavigate();
  const { datasetId } = useParams<{ datasetId: string }>();

  // --- STATE ---
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isCountdownModalOpen, setIsCountdownModalOpen] = useState(false);
  const [openFinishModal, setOpenFinishModal] = useState(false);
  const [timer, setTimer] = useState(0);
  const [dbfs, setDbfs] = useState(-100);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isInitialPlayback, setIsInitialPlayback] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [voiceCheckOpen, setVoiceCheckOpen] = useState(false);
  const [voiceSampleStep, setVoiceSampleStep] = useState<'ready' | 'recording' | 'recorded' | 'playing'>('ready');
  const [voiceSampleUrl, setVoiceSampleUrl] = useState<string | null>(null);
  const [isVoiceSampleDone, setIsVoiceSampleDone] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [tooltipConfig, setTooltipConfig] = useState<{ open: boolean; text: string; top: number; left: number; arrowTop?: string | number; }>({ open: false, text: '', top: 0, left: 0 });
  const [currentCsvFile, setCurrentCsvFile] = useState('apresentacao.csv');
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [isPhraseVisible, setIsPhraseVisible] = useState(true);
  const [transitionMessage, setTransitionMessage] = useState({ title: '', body: '' });
  const [micPermissionStatus, setMicPermissionStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMicErrorModalOpen, setIsMicErrorModalOpen] = useState(false);
  const { token } = useAuth();
  const [showExistingSessionModal, setShowExistingSessionModal] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRoomToneScreenOpen, setIsRoomToneScreenOpen] = useState(false);
  const [roomToneCountdown, setRoomToneCountdown] = useState(5);
  const [isRecordingRoomTone, setIsRecordingRoomTone] = useState(false);
  const [initialCountdown, setInitialCountdown] = useState(3);
  const [initialCountdownActive, setInitialCountdownActive] = useState(false);
  const [hasCompletedVoiceCheck, setHasCompletedVoiceCheck] = useState(false);
  const [finalizationStep, setFinalizationStep] = useState<'idle' | 'room_tone' | 'notes'>('idle');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isRecordingFinalRoomTone, setIsRecordingFinalRoomTone] = useState(false);
  const [finalRoomToneCountdown, setFinalRoomToneCountdown] = useState(5);

  // --- REFS ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaRecorderSampleRef = useRef<MediaRecorder | null>(null);
  const audioChunksSampleRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0); // For precise duration
  const recordingSampleStartTimeRef = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const timerIntervalId = useRef<NodeJS.Timeout | null>(null);
  const phraseTextRef = useRef<HTMLElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ignoreButtonRef = useRef<HTMLButtonElement>(null);
  const homeButtonRef = useRef<HTMLAnchorElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentPhrase = phrases[currentPhraseIndex];
  const currentVideoSrc = resolveVideoSrc(currentPhrase?.videoSrc);
  const hasVideo = !!currentVideoSrc;

  // --- PERMISSION HANDLER ---
  const requestMicPermission = async () => {
    setMicPermissionStatus('pending');
    setIsMicErrorModalOpen(false); // Close modal when trying again
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop tracks immediately
      setMicPermissionStatus('granted');
      return true;
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setMicPermissionStatus('denied');
      setIsMicErrorModalOpen(true);
      return false;
    }
  };


  // --- EFFECTS ---

  // Effect for initial consent check and mic permission
  useEffect(() => {
    const hasConsented = sessionStorage.getItem('has_consented');
    if (!hasConsented) {
      setConsentModalOpen(true);
    } else {
      setConsentModalOpen(false);
      // Only show VoiceCheckScreen if mic permission is not granted AND we haven't completed the voice check yet
      if (micPermissionStatus !== 'granted' && !hasCompletedVoiceCheck) {
        setVoiceCheckOpen(true);
      } else {
        setVoiceCheckOpen(false); // Ensure it's closed if permission is granted or check completed
      }
    }
  }, [micPermissionStatus, hasCompletedVoiceCheck]);

  // Effect for session creation/resumption
  useEffect(() => {
    const createOrResumeSession = async () => {
      if (!token || !datasetId) return;

      const cachedSessionId = localStorage.getItem('session_id');
      const cachedDatasetId = localStorage.getItem('datasetId');

      if (cachedSessionId && cachedDatasetId === datasetId) {
        setSessionId(cachedSessionId);
        return;
      }

      try {
        const session = await api.createSession(datasetId, true, token);
        localStorage.setItem('session_id', session.id);
        localStorage.setItem('datasetId', datasetId);
        setSessionId(session.id);
      } catch (error: any) {
        try {
          const errorJson = JSON.parse(error.message);
          if (errorJson.session_id) {
            localStorage.setItem('session_id', errorJson.session_id);
            localStorage.setItem('datasetId', datasetId); // Assume current datasetId
            setSessionId(errorJson.session_id);
            setShowExistingSessionModal(true);
          }
        } catch (parseError) {
          console.error("Failed to parse session error:", parseError);
        }
      }
    };

    createOrResumeSession();
  }, [token, datasetId]);

  // Effect to fetch phrases
  useEffect(() => {
    if (!datasetId) return;
    const fetchPhrases = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/${currentCsvFile}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        const header = lines[0].split(',').map(h => h.trim());
        const phraseData: Phrase[] = lines.slice(1).map(line => {
            const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            return {
                id: parseInt(values[header.indexOf('id')] || '0'),
                emocaoid: parseInt(values[header.indexOf('emocaoId')] || '0'),
                datasetid: parseInt(values[header.indexOf('datasetId')] || '0'),
                text: values[header.indexOf('text')]?.replace(/"/g, '') || '',
                videoSrc: values[header.indexOf('videoSrc')]?.replace(/"/g, '') || undefined,
            };
        });
        
        let filteredPhrases = phraseData;
        if (currentCsvFile !== 'apresentacao.csv') {
          filteredPhrases = phraseData.filter(p => p.datasetid.toString() === datasetId);
        }

        const uniquePhrases = filteredPhrases.filter((phrase, index, self) =>
          index === self.findIndex(p =>
            p.text === phrase.text &&
            p.datasetid === phrase.datasetid &&
            (p.videoSrc || '') === (phrase.videoSrc || '')
          )
        );
        setPhrases(uniquePhrases);
      } catch (error) {
        console.error("Failed to load phrases:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPhrases();
  }, [datasetId, currentCsvFile]);
  
  // Effect to load progress
  useEffect(() => {
    if (phrases.length > 0) {
      const savedProgressRaw = localStorage.getItem('recording_progress');
      if (savedProgressRaw) {
        try {
          const savedProgress = JSON.parse(savedProgressRaw);
          if (savedProgress.sessionId === sessionId && savedProgress.datasetId === datasetId) {
            const phraseIndex = phrases.findIndex(p => p.id === savedProgress.phraseId);
            if (phraseIndex !== -1) {
              setCurrentPhraseIndex(phraseIndex);
            }
          }
        } catch (e) {
          console.error("Failed to parse saved progress", e);
          localStorage.removeItem('recording_progress');
        }
      }
    }
  }, [phrases, sessionId, datasetId]);

  // Effect to save progress
  useEffect(() => {
    if (sessionId && datasetId && currentPhrase?.id) {
      const progress = {
        sessionId: sessionId,
        datasetId: datasetId,
        phraseId: currentPhrase.id,
      };
      localStorage.setItem('recording_progress', JSON.stringify(progress));
    }
  }, [currentPhraseIndex, sessionId, datasetId, currentPhrase]);

  // Effect for tutorial steps
  useEffect(() => {
    // Definição dos passos do tutorial com referências e textos.
    const isReadingPart = currentCsvFile === 'phrases_leitura.csv';

    const tutorialSteps = isReadingPart
      ? [ // Tutorial simplificado para a parte de leitura
        { ref: phraseTextRef, text: "Nesta parte, você só precisa ler a frase em voz alta.", arrowPosition: '50%' },
        { ref: saveButtonRef, text: "Use este botão para salvar sua gravação e ir para a próxima frase.", arrowPosition: '50%' },
      ]
      : [ // Tutorial completo para a primeira parte
        { ref: timerRef, text: "Aqui você verá quando começar a gravar e o tempo decorrido da gravação desta frase.", arrowPosition: '60%' },
        { ref: phraseTextRef, text: "Quando começar a gravar, responda a esta pergunta em voz alta.", arrowPosition: '65%' },
        { ref: ignoreButtonRef, text: "Caso não queira gravar o áudio para esta frase, use este botão para pular para a próxima.", arrowPosition: '65%' },
        { ref: homeButtonRef, text: "A qualquer momento, você pode usar este botão para abandonar a sessão e voltar para a página inicial.", arrowPosition: '65%' },
        { ref: saveButtonRef, text: "Use este botão para salvar sua gravação e ir para a próxima frase.", arrowPosition: '65%' },
      ];

    // Limpa o destaque de todos os elementos ao mudar de passo.
    tutorialSteps.forEach(step => step.ref.current?.classList.remove('tutorial-highlight'));

    if (tutorialStep !== null && tutorialStep < tutorialSteps.length) {
      setTimeout(() => {
        const { ref, text, arrowPosition } = tutorialSteps[tutorialStep];
        if (ref.current) {
          // Adiciona a classe de destaque ao elemento atual.
          ref.current.classList.add('tutorial-highlight');

          // Configura e exibe o tooltip.
          const rect = ref.current.getBoundingClientRect();
          setTooltipConfig({ open: true, text, top: rect.top + window.scrollY, left: rect.right + window.scrollX + 15, arrowTop: arrowPosition ?? (rect.height / 2) });
        }
      }, 100);
    } else {
      // Esconde o tooltip e finaliza o tutorial.
      setTooltipConfig({ open: false, text: '', top: 0, left: 0 });
      if (tutorialStep !== null) {
        setTutorialStep(null);
      }
    }

    // Função de limpeza para remover o destaque quando o componente for desmontado.
    return () => tutorialSteps.forEach(step => step.ref.current?.classList.remove('tutorial-highlight'));
  }, [tutorialStep, currentCsvFile]);

  // Effect for general recording timer/visualization
  useEffect(() => {
    if (isRecording) {
      timerIntervalId.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
      visualize();
    } else {
      if (timerIntervalId.current) clearInterval(timerIntervalId.current);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }
    return () => {
      if (timerIntervalId.current) clearInterval(timerIntervalId.current);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isRecording]);

  // --- HANDLERS ---

  const handleAcceptConsent = () => {
    sessionStorage.setItem('has_consented', 'true');
    setConsentModalOpen(false);
    if (micPermissionStatus !== 'granted' && !hasCompletedVoiceCheck) {
      setVoiceCheckOpen(true);
    }
  };
  const handleDeclineConsent = () => navigate('/');

  const handleStartRoomToneRecording = () => {
    setInitialCountdownActive(true);
  };

  useEffect(() => {
    let initialInterval: NodeJS.Timeout | undefined;
    if (initialCountdownActive) {
      setInitialCountdown(3);
      initialInterval = setInterval(() => {
        setInitialCountdown(prev => {
          if (prev > 1) {
            return prev - 1;
          }
          clearInterval(initialInterval);
          setInitialCountdownActive(false);
          setIsRecordingRoomTone(true);
          return 0;
        });
      }, 1000);
    }
    return () => {
      if (initialInterval) clearInterval(initialInterval);
    };
  }, [initialCountdownActive]);
  
  const handleRoomToneRecordingComplete = useCallback(() => {
    setIsRoomToneScreenOpen(false);
    setIsRecordingRoomTone(false); // Reset for next time
    setTutorialStep(0); // Start the tutorial
  }, []);
  
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | undefined;
    if (isRecordingRoomTone) {
      setRoomToneCountdown(5);
  
      const startRecordingLogic = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioChunksSampleRef.current = [];
          const recorder = new MediaRecorder(stream);
          mediaRecorderSampleRef.current = recorder;
  
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksSampleRef.current.push(event.data);
            }
          };
  
          recorder.start();
  
          setTimeout(() => {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          }, 5000);
  
          recorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksSampleRef.current, { type: 'audio/webm' });
            if (token && sessionId && datasetId) {
              try {
                setIsUploading(true);
                await uploadTestAudio(audioBlob, token, sessionId, datasetId, 5, true);
              } catch (error) {
                console.error("Failed to upload room tone audio:", error);
              } finally {
                setIsUploading(false);
              }
            }
            stream.getTracks().forEach(track => track.stop());
            handleRoomToneRecordingComplete();
          };
        } catch (err) {
          console.error("Failed to start room tone recording:", err);
          setIsMicErrorModalOpen(true);
          setIsRecordingRoomTone(false);
        }
      };
  
      startRecordingLogic();
  
      countdownInterval = setInterval(() => {
        setRoomToneCountdown(prev => {
          if (prev > 1) {
            return prev - 1;
          }
          clearInterval(countdownInterval);
          return 0;
        });
      }, 1000);
    }
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [isRecordingRoomTone, token, sessionId, datasetId, handleRoomToneRecordingComplete]);

  const handleVoiceCheckSubmit = (voiceQuality: string) => {
    console.log('Voice quality:', voiceQuality); // Placeholder for future use
    setVoiceCheckOpen(false);
    setHasCompletedVoiceCheck(true); // Mark as completed
    requestMicPermission();
  };

  const handleStartSampleRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksSampleRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderSampleRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksSampleRef.current.push(event.data);
        }
      };
      recorder.start();
      recordingSampleStartTimeRef.current = performance.now(); // Start timer
      setVoiceSampleStep('recording');
    } catch (err) {
      console.error("Failed to start sample recording:", err);
      setIsMicErrorModalOpen(true);
    }
  };

  const handleStopSampleRecording = () => {
    if (mediaRecorderSampleRef.current && mediaRecorderSampleRef.current.state === 'recording') {
      mediaRecorderSampleRef.current.onstop = async () => {
        const durationInSeconds = (performance.now() - recordingSampleStartTimeRef.current) / 1000;
        const audioBlob = new Blob(audioChunksSampleRef.current, { type: 'audio/webm' });
        
        setVoiceSampleStep('recorded');
        
        // Always use the local blob for playback, as server URLs are unreliable.
        const localAudioUrl = URL.createObjectURL(audioBlob);
        setVoiceSampleUrl(localAudioUrl);

        if (token && sessionId && datasetId) {
          try {
            setIsUploading(true);
            // We still upload the test audio, but we don't use the response for playback.
            await uploadTestAudio(audioBlob, token, sessionId, datasetId, durationInSeconds);
          } catch (error) {
            console.error("Failed to upload test audio:", error);
          } finally {
            setIsUploading(false);
          }
        } else {
            console.warn("No session, token, or datasetId available for test audio upload.");
        }

        if (mediaRecorderSampleRef.current?.stream) {
          mediaRecorderSampleRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderSampleRef.current.stop();
    }
  };

  const handlePlaySample = () => {
    if (voiceSampleUrl) {
      setVoiceSampleStep('playing');
    }
  };

  const handleSamplePlaybackEnded = () => {
    setVoiceSampleStep('recorded');
  };

  const handleContinueFromSample = () => {
    setIsVoiceSampleDone(true);
    setIsRoomToneScreenOpen(true);
  };

  const handleNextTutorialStep = () => {
    const isReadingPart = currentCsvFile === 'phrases_leitura.csv';
    const isLastStep = tutorialStep === (isReadingPart ? 1 : 4);

    if (isLastStep) {
      setTutorialStep(null); // Finaliza o modo tutorial
      handleNextPhrase();    // Executa a ação de ir para a próxima frase
    } else {
      setTutorialStep(prev => (prev === null ? 0 : prev + 1));
    }
  };

  const isTutorialActive = tutorialStep !== null;

  const triggerPhraseAction = (index: number, onReady: () => void) => {
    const phrase = phrases[index];
    if (!phrase) return;

    const finalizeTransition = () => {
      onReady();
      if (!phrase.videoSrc) {
        startRecording();
      }
    };

    if (!phrase.videoSrc) {
      setIsVideoPlaying(false);
      setCountdown(3);
      setIsCountdownModalOpen(true);
      const countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev > 1) return prev - 1;
          clearInterval(countdownTimer);
          setIsCountdownModalOpen(false);
          finalizeTransition();
          return 0;
        });
      }, 1000);
    } else {
      setIsCountdownModalOpen(false);
      finalizeTransition();
    }
  };

  const stopRecording = (): Promise<Blob> => {
    return new Promise(resolve => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        resolve(new Blob());
        return;
      }
  
      mediaRecorderRef.current.onstop = () => {
        const originalType = audioChunks[0]?.type || 'audio/webm';
        const sanitizedType = originalType.split(';')[0];
        const blob = new Blob(audioChunks, { type: sanitizedType });
        
        if (sourceRef.current) {
          sourceRef.current.disconnect();
          sourceRef.current = null;
        }
  
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
          streamRef.current = null;
        }

        // Aggressively clean up the audio context and analyser
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        audioContextRef.current = null;
        analyserRef.current = null;
  
        resolve(blob);
      };
  
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    });
  };

  const triggerNextPhrase = async () => {
    if (currentPhraseIndex < phrases.length - 1) {
      const nextIndex = currentPhraseIndex + 1;
      setCurrentPhraseIndex(nextIndex);

      const nextPhrase = phrases[nextIndex];
      if (nextPhrase && !nextPhrase.videoSrc) {
        setCountdown(3);
        setIsCountdownModalOpen(true);
        const countdownTimer = setInterval(() => {
          setCountdown(prev => {
            if (prev > 1) {
              return prev - 1;
            }
            clearInterval(countdownTimer);
            setIsCountdownModalOpen(false);
            startRecording();
            return 0;
          });
        }, 1000);
      }
    } else {
      if (currentCsvFile === 'apresentacao.csv') {
        setTransitionMessage({
          title: 'Você concluiu a apresentação!',
          body: 'Agora vamos para a parte de leitura de frases.'
        });
        setIsTransitionModalOpen(true);
      } else {
        setFinalizationStep('room_tone');
      }
    }
  };

  const handleNextPhrase = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (isRecording) {
        const durationInSeconds = (performance.now() - recordingStartTimeRef.current) / 1000;
        const audioBlob = await stopRecording();

        if (audioBlob.size > 0) {
          setIsUploading(true);
          setUploadStatus('idle');
          try {
            const mimeType = audioBlob.type;
            const format = mimeType.split('/')[1]?.split(';')[0] || 'webm';
            if (sessionId && token) {
                const metadata = {
                    sessionId: sessionId,
                    datasetId: datasetId,
                    phraseId: currentPhrase.id,
                    duration: durationInSeconds,
                    recordedAt: new Date().toISOString(),
                    emotionId: currentPhrase.emocaoid,
                    format: format,
                    blocoId: "1", // Placeholder for normal recording
                    sampleRate: 48000, // Hardcoded for now
                    fraseContent: currentPhrase?.text, // Include frase_content
                };
                await uploadAudio(audioBlob, metadata, token, false);
                setUploadStatus('success');
            } else {
                console.error("Missing sessionId or token");
                setUploadStatus('error');
            }
          } catch (error) {
            setUploadStatus('error');
          } finally {
            setIsUploading(false);
          }
        }
      }

      await triggerNextPhrase();
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleIgnoreAndGoNext = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (isRecording) {
        await stopRecording();
      }
      await triggerNextPhrase();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreviousPhrase = async () => {
    // This is complex to implement correctly with the new sequential flow.
    // For now, we disable it to ensure stability. A proper implementation
    // would need to handle state rollback carefully.
    console.warn("Previous phrase functionality is currently disabled.");
  };

  const handleReplayVideo = async () => {
    if (isProcessing || !hasVideo) return;
    setIsProcessing(true);
    try {
      if (isRecording) {
        await stopRecording();
      }
      playVideo();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueToNextPart = () => {
    setIsTransitionModalOpen(false);
    if (currentCsvFile === 'apresentacao.csv') {
      setCurrentCsvFile('phrases_leitura.csv');
    }
    setCurrentPhraseIndex(0);
    setTutorialStep(0);
  };

  const startRecording = async () => {
    setAudioChunks([]); // Clear previous audio data before starting
    try {
      // Ensure all previous instances are stopped and cleaned up.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
      }
      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
  
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.start(250);
      recordingStartTimeRef.current = performance.now();
      setIsRecording(true);
      setTimer(0);

    } catch (err) {
      console.error("Failed to start recording:", err);
      setMicPermissionStatus('denied');
      setIsMicErrorModalOpen(true);
    }
  };

  const playVideo = (reload = false) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (reload) {
      videoElement.load();
    }

    setIsVideoPlaying(true);
    setIsInitialPlayback(true);
    setIsPhraseVisible(false);
    videoElement.currentTime = 0;
    const playPromise = videoElement.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.error("Video play failed:", err);
        setIsVideoPlaying(false);
        setIsInitialPlayback(false);
        setIsPhraseVisible(true);
      });
    }
  };

  useEffect(() => {
    if (!currentVideoSrc) {
      setIsVideoPlaying(false);
      setIsInitialPlayback(false);
      setIsPhraseVisible(true);
      return;
    }
    playVideo(true);
  }, [currentVideoSrc, currentPhraseIndex]);

  const handleVideoEnd = () => {
    setIsInitialPlayback(false);
    setIsVideoPlaying(false);
    setIsPhraseVisible(true);
    setIsCountdownModalOpen(false);
    startRecording();
  };

  const handleVideoError = () => {
    console.error("Failed to load video source:", currentVideoSrc);
    setIsVideoPlaying(false);
    setIsInitialPlayback(false);
    setIsPhraseVisible(true);
  };

  const visualize = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    analyserRef.current.fftSize = 2048;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      analyserRef.current?.getByteTimeDomainData(dataArray);
      
      let sumSquares = 0.0;
      for (let i = 0; i < dataArray.length; i++) {
        const amplitude = (dataArray[i] / 128.0) - 1.0;
        sumSquares += amplitude * amplitude;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);
      const db = 20 * Math.log10(rms);
      setDbfs(db);

      canvasCtx.fillStyle = '#1e1e1e';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#61dafb';
      canvasCtx.beginPath();
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);
        x += sliceWidth;
      }
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };
    draw();
  };

  const handleFinish = async () => {
    if (sessionId && token) {
      try {
        await api.patch(`/sessions/${sessionId}/finish`, {
          finished_at: new Date().toISOString(),
          notes: sessionNotes || "finalizada",
          room_tone_end: 1,
        }, token);
      } catch (error) {
        console.error("Failed to finish session:", error);
      } finally {
        localStorage.removeItem('session_id');
        localStorage.removeItem('recording_progress');
        setFinalizationStep('idle');
        setOpenFinishModal(true);
      }
    } else {
      localStorage.removeItem('session_id');
      localStorage.removeItem('recording_progress');
      navigate('/');
    }
  };

  const handleStartFinalRoomToneRecording = () => {
    setIsRecordingFinalRoomTone(true);
  };
  
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | undefined;
    if (isRecordingFinalRoomTone) {
      setFinalRoomToneCountdown(5);
  
      const startRecordingLogic = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioChunksSampleRef.current = [];
          const recorder = new MediaRecorder(stream);
  
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksSampleRef.current.push(event.data);
            }
          };
  
          recorder.start();
  
          setTimeout(() => {
            if (recorder.state === 'recording') recorder.stop();
          }, 5000);
  
          recorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksSampleRef.current, { type: 'audio/webm' });
            if (token && sessionId && datasetId) {
              try {
                const metadata = {
                  sessionId: sessionId,
                  datasetId: datasetId,
                  duration: 5,
                  format: 'webm',
                  sampleRate: 48000,
                };
                await uploadAudio(audioBlob, metadata, token, true);
              } catch (error) {
                console.error("Failed to upload final room tone audio:", error);
              }
            }
            stream.getTracks().forEach(track => track.stop());
            setIsRecordingFinalRoomTone(false);
            setFinalizationStep('notes');
          };
        } catch (err) {
          console.error("Failed to start final room tone recording:", err);
          setIsMicErrorModalOpen(true);
          setIsRecordingFinalRoomTone(false);
        }
      };
  
      startRecordingLogic();
  
      countdownInterval = setInterval(() => {
        setFinalRoomToneCountdown(prev => {
          if (prev > 1) return prev - 1;
          clearInterval(countdownInterval);
          return 0;
        });
      }, 1000);
    }
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [isRecordingFinalRoomTone, token, sessionId, datasetId]);

  const handleGoHome = () => {
    // We don't clear session_id here, so the user can come back.
    // If you want to abandon the session, you should use a different button/logic.
    navigate('/');
  };

  const handleCancelSession = () => {
    setIsCancelModalOpen(true);
  };

  const confirmCancelSession = async () => {
    if (sessionId && token) {
      try {
        await api.patch(`/sessions/${sessionId}/finish`, {
          finished_at: new Date().toISOString(),
          notes: "cancelada",
        }, token);
      } catch (error) {
        console.error("Failed to finish session:", error);
      } finally {
        localStorage.removeItem('session_id');
        localStorage.removeItem('datasetId');
        localStorage.removeItem('recording_progress');
        navigate('/');
      }
    } else {
      localStorage.removeItem('session_id');
      localStorage.removeItem('datasetId');
      localStorage.removeItem('recording_progress');
      navigate('/');
    }
  };

  const getDbfsColor = (dbfs: number) => dbfs > -20 ? 'red' : dbfs > -40 ? 'yellow' : 'green';
  const formatTime = (time: number) => `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`;

  // --- RENDER ---
  if (isLoading && !phrases.length) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Container>;
  }

  return (
    <Container maxWidth="lg">
      <Modal open={consentModalOpen} onClose={() => {}}>
        <ConsentScreen onAccept={handleAcceptConsent} onDecline={handleDeclineConsent} />
      </Modal>

      {voiceCheckOpen && <VoiceCheckScreen onSubmit={handleVoiceCheckSubmit} />}
      {micPermissionStatus === 'granted' && !isVoiceSampleDone && (
        <VoiceSampleScreen
          step={voiceSampleStep}
          audioUrl={voiceSampleUrl}
          onStartRecording={handleStartSampleRecording}
          onStopRecording={handleStopSampleRecording}
          onPlay={handlePlaySample}
          onContinue={handleContinueFromSample}
          onPlaybackEnded={handleSamplePlaybackEnded}
        />
      )}
      {isRoomToneScreenOpen && (
        <RoomToneScreen
          onStartRecording={handleStartRoomToneRecording}
          isRecording={isRecordingRoomTone}
          initialCountdownActive={initialCountdownActive}
          countdown={isRecordingRoomTone ? roomToneCountdown : initialCountdown}
        />
      )}
      {tooltipConfig.open && <TutorialTooltip text={tooltipConfig.text} top={tooltipConfig.top} left={tooltipConfig.left} onNext={handleNextTutorialStep} arrowTop={tooltipConfig.arrowTop} />}

      <Box sx={{
        filter: isTutorialActive ? 'brightness(0.7)' : 'none',
        transition: 'filter 0.3s',
        '@keyframes tutorial-glow': {
          '0%': { boxShadow: '0 0 0 0px rgba(25, 118, 210, 0.7)' },
          '70%': { boxShadow: '0 0 10px 10px rgba(25, 118, 210, 0)' },
          '100%': { boxShadow: '0 0 0 0px rgba(25, 118, 210, 0)' },
        },
        '.tutorial-highlight': {
          animation: 'tutorial-glow 1.5s infinite',
          borderRadius: '8px',
          zIndex: 1301,
          position: 'relative',
        }
      }}>
        <Typography variant="h3" component="h1" textAlign="center" sx={{ mt: 4, mb: 2 }}>
          Gravação de Fala ({datasetId ? datasetNames[parseInt(datasetId, 10)] : ''})
        </Typography>

        {phrases.length > 0 ? (
          <Paper elevation={3} sx={{ p: 4, pointerEvents: isTutorialActive ? 'none' : 'auto' }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  {isRecording && <FiberManualRecordIcon sx={{ color: 'red', animation: 'blinking 1s infinite' }} />}
                  <Typography variant="h6" sx={{ ml: 1 }}>{isRecording ? 'Gravando...' : isUploading ? 'Enviando...' : isVideoPlaying ? 'Reproduzindo Vídeo...' : 'Pronto'}</Typography>
                  <Box flexGrow={1} />
                  <Typography variant="h6" sx={{ color: getDbfsColor(dbfs), mr: 2, fontWeight: 'bold' }}>
                    {isRecording && isFinite(dbfs) ? `${dbfs.toFixed(2)} dBFS` : ''}
                  </Typography>
                  <Typography ref={timerRef} variant="h6">{formatTime(timer)}</Typography>
                </Box>
                <Box ref={waveformRef} sx={{ height: 100, backgroundColor: 'rgba(0,0,0,0.1)', mb: 2, borderRadius: 1 }}>
                  <canvas ref={canvasRef} width="600" height="100" style={{ width: '100%', height: '100%' }} />
                </Box>
                {hasVideo && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <video
                      ref={videoRef}
                      src={currentVideoSrc}
                      onEnded={handleVideoEnd}
                      onError={handleVideoError}
                      width="100%"
                      height="300"
                      controls
                    />
                  </Box>
                )}
                <Typography ref={phraseTextRef} variant="h4" sx={{ minHeight: 100, textAlign: 'center', my: 2 }}>
                  {isPhraseVisible ? currentPhrase?.text : ''}
                </Typography>
                <Box mt={4} display="flex" justifyContent="space-around" alignItems="center">
                  {hasVideo && <Button variant="outlined" color="info" onClick={handleReplayVideo} disabled={isTutorialActive || isInitialPlayback || isCountdownModalOpen || isUploading || isProcessing}>Repetir Vídeo</Button>}                  
                  <Button ref={ignoreButtonRef} variant="outlined" color="secondary" onClick={handleIgnoreAndGoNext} disabled={isTutorialActive || isInitialPlayback || isCountdownModalOpen || isUploading || isProcessing}>Ignorar Áudio</Button>
                  <Button ref={saveButtonRef} variant="contained" color="primary" onClick={handleNextPhrase} disabled={isTutorialActive || isInitialPlayback || isCountdownModalOpen || isUploading || isProcessing}>
                    {isUploading ? <CircularProgress size={24} color="inherit" /> : (currentPhraseIndex < phrases.length - 1 ? 'Salvar e Próxima' : 'Finalizar')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Paper>
        ) : (
          <Typography variant="h5" textAlign="center">Nenhuma frase encontrada para este dataset.</Typography>
        )}

        <Box mt={2} display="flex" justifyContent="center">
          <Button ref={homeButtonRef} component={Link} to="/" onClick={handleGoHome} sx={{ mr: 2 }}>
            Voltar para a Home
          </Button>
          <Button variant="outlined" color="error" onClick={handleCancelSession}>
            Cancelar Sessão
          </Button>
        </Box>
      </Box>

      {/* Modals */}
      <Modal open={isCountdownModalOpen}><Box sx={modalStyle}><Typography variant="h1" textAlign="center">{countdown}</Typography></Box></Modal>
      <Modal open={isTransitionModalOpen}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" textAlign="center">{transitionMessage.title}</Typography>
          <Typography sx={{ mt: 2, textAlign: 'center' }}>
            {transitionMessage.body}
          </Typography>
          <Box mt={3} display="flex" justifyContent="center">
            <Button onClick={handleContinueToNextPart} variant="contained">Continuar</Button>
          </Box>
        </Box>
      </Modal>
       <Modal open={finalizationStep === 'room_tone'}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2">Gravação Final de Som Ambiente</Typography>
          <Typography sx={{ mt: 2 }}>
            Para finalizar, vamos gravar mais 5 segundos de silêncio. Por favor, não fale.
          </Typography>
          {!isRecordingFinalRoomTone ? (
            <Button onClick={handleStartFinalRoomToneRecording} variant="contained" sx={{ mt: 2 }}>
              Iniciar Gravação
            </Button>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h2">{finalRoomToneCountdown}</Typography>
              <CircularProgress />
            </Box>
          )}
        </Box>
      </Modal>

      <Modal open={finalizationStep === 'notes'}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2">Notas da Sessão</Typography>
          <TextField
            label="Adicione suas notas aqui"
            multiline
            rows={4}
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            variant="outlined"
            fullWidth
            sx={{ mt: 2 }}
          />
          <Button 
            onClick={handleFinish} 
            variant="contained" 
            sx={{ mt: 2 }}
            disabled={!sessionNotes.trim()}
          >
            Finalizar Sessão
          </Button>
        </Box>
      </Modal>

      <Modal open={openFinishModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" textAlign="center">Sessão Finalizada!</Typography>
          <Typography sx={{ mt: 2, textAlign: 'center' }}>
            Obrigado pela sua participação!
          </Typography>
          <Box mt={2} display="flex" justifyContent="center">
            <Button component={Link} to="/" variant="contained">Voltar para a Home</Button>
          </Box>
        </Box>
      </Modal>
      <Modal open={isMicErrorModalOpen}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" textAlign="center">Acesso ao Microfone Bloqueado</Typography>
          <Typography sx={{ mt: 2, textAlign: 'center' }}>
            Para continuar, você precisa permitir o acesso ao microfone.
          </Typography>
          <Typography sx={{ mt: 2, textAlign: 'center' }}>
            Clique no ícone de cadeado 🔒 na barra de endereço do seu navegador, encontre a configuração do Microfone e mude para "Permitir".
          </Typography>
          <Typography sx={{ mt: 2, textAlign: 'center' }}>
            Depois de permitir, recarregue a página.
          </Typography>
          <Box mt={3} display="flex" justifyContent="center">
            <Button onClick={() => window.location.reload()} variant="contained">Recarregar a Página</Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={showExistingSessionModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" textAlign="center">Sessão Existente</Typography>
          <Typography sx={{ mt: 2, textAlign: 'center' }}>
            Você já tem uma sessão aberta.
          </Typography>
          <Box mt={3} display="flex" justifyContent="center">
            <Button onClick={() => setShowExistingSessionModal(false)} variant="contained">
              Retornar à sessão
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={isCancelModalOpen}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" textAlign="center">Cancelar Sessão</Typography>
          <Typography sx={{ mt: 2, textAlign: 'center' }}>
            Tem certeza que deseja cancelar a sessão? Todo o seu progresso será perdido.
          </Typography>
          <Box mt={3} display="flex" justifyContent="space-around">
            <Button onClick={() => setIsCancelModalOpen(false)} variant="outlined">
              Voltar
            </Button>
            <Button onClick={confirmCancelSession} variant="contained" color="error">
              Confirmar
            </Button>
          </Box>
        </Box>
      </Modal>
    </Container>
  );
};

export default RecordingPage;