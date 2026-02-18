import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Typography, Container, Paper, Box, Modal, CircularProgress, TextField, LinearProgress } from '@mui/material';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import VoiceCheckScreen from '../components/VoiceCheckScreen';
import VoiceSampleScreen from '../components/VoiceSampleScreen';
import RoomToneScreen from '../components/RoomToneScreen';
import { useAuth } from '../contexts/AuthContext';
import { api, SessionResponse } from '../services/api';
import { findByFrontendId, findByBackendId } from '../datasets';

interface Phrase { id: number; text: string; blockId: number; videoSrc?: string; }
interface Block { blockId: number; name: string; }

const modalStyle = { position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4 };

const blockTutorials: { [key: number]: { title: string; description: string } } = {
  0: { title: "Bloco de Leitura", description: "Nesta seção, seu objetivo é ler as frases que aparecem na tela de forma clara e natural. Apenas leia o texto como se estivesse conversando." },
  1: { title: "Bloco de Respostas", description: "Agora, em vez de ler, você responderá a perguntas. Leia a pergunta na tela e responda de forma espontânea, como faria em um diálogo real." },
  2: { title: "Bloco de Emoção: Feliz", description: "Neste bloco, pedimos que você leia as frases transmitindo a emoção 'Feliz'. Tente sorrir e usar um tom de voz alegre e positivo." },
  3: { title: "Bloco de Emoção: Triste", description: "Para as próximas frases, leia o texto expressando la emoção 'Triste'. Use um tom de voz mais baixo, lento e melancólico." },
  4: { title: "Bloco de Emoção: Raiva", description: "Agora, o desafio é ler as frases com a emoção 'Raiva'. Tente usar um tom de voz firme, forte e que demonstre irritação ou frustração." },
  5: { title: "Bloco de Emoção: Medo", description: "Nesta seção, leia as frases expressando 'Medo'. Sua voz deve soar hesitante, talvez um pouco trêmula ou sussurrada, como se estivesse assustado." },
  6: { title: "Bloco de Emoção: Surpresa", description: "Leia as frases a seguir com a emoção 'Surpresa'. Use um tom de voz que demonstre espanto, como se tivesse acabado de descobrir algo inesperado." },
  7: { title: "Bloco de Emoção: Neutra", description: "Neste bloco, o objetivo é ler as frases com uma emoção 'Neutra'. Fale de maneira clara e direta, sem adicionar qualquer sentimento ou entonação emocional." },
  8: { title: "Bloco de Vídeo: Emoção Neutra", description: "Você assistirá a um vídeo. Após o vídeo, descreva o que você viu ou responda à pergunta relacionada, mantendo um tom de voz 'Neutro', sem expressar emoção." },
  9: { title: "Bloco de Vídeo: Emoção Feliz", description: "Você assistirá a um vídeo. Após o vídeo, descreva o que você viu ou responda à pergunta relacionada, expressando a emoção 'Feliz' em sua voz." },
  10: { title: "Bloco de Vídeo: Emoção Triste", description: "Você assistirá a um vídeo. Após o vídeo, descreva o que você viu ou responda à pergunta relacionada, transmitindo a emoção 'Triste' em sua voz." },
  11: { title: "Bloco de Vídeo: Emoção Raiva", description: "Você assistirá a um vídeo. Após o vídeo, descreva o que você viu ou responda à pergunta relacionada, usando um tom de voz que expresse 'Raiva'." },
  12: { title: "Bloco de Vídeo: Emoção Medo", description: "Você assistirá a um vídeo. Após o vídeo, descreva o que você viu ou responda à pergunta relacionada, falando com uma voz que demonstre 'Medo'." },
  13: { title: "Bloco de Vídeo: Emoção Surpresa", description: "Você assistirá a um vídeo. Após o vídeo, descreva o que você viu ou responda à pergunta relacionada, expressando 'Surpresa' em sua fala." }
};

const TutorialTooltip: React.FC<{ text: string; top: number; left: number; onNext: () => void; arrowTop?: string | number; }> = ({ text, top, left, onNext, arrowTop = '50%' }) => (
  <Box sx={{ position: 'fixed', top, left, zIndex: 1400, transform: 'translateY(-50%)' }}>
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
      <Typography variant="body2" sx={{ mb: 2 }}>{text}</Typography>
      <Button onClick={onNext} variant="contained" size="small">Próximo</Button>
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

const RecordingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { datasetId } = useParams<{ datasetId: string }>();
  const { token } = useAuth();
  
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [existingSessionInfo, setExistingSessionInfo] = useState<SessionResponse | null>(null);
  const [showExistingSessionModal, setShowExistingSessionModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalizationStep, setFinalizationStep] = useState<'idle' | 'preRoomTone' | 'roomTone' | 'notes'>('idle');
  const [sessionNotes, setSessionNotes] = useState('');
  const [openFinishModal, setOpenFinishModal] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showNoPhrasesModal, setShowNoPhrasesModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const [uploadError, setUploadError] = useState<Error | null>(null);
  const [audioForRetry, setAudioForRetry] = useState<Blob | null>(null);

  const [preRecordingStep, setPreRecordingStep] = useState<'voiceCheck' | 'voiceSample' | 'roomTone' | 'recording' | 'idle'>('idle'); 
  const [finalRoomToneCountdown, setFinalRoomToneCountdown] = useState<number | null>(null);
  const [voiceSampleUrl, setVoiceSampleUrl] = useState<string | null>(null);
  const [voiceSampleStep, setVoiceSampleStep] = useState<'ready' | 'recording' | 'recorded' | 'playing'>('ready');

  const [isRecording, setIsRecording] = useState(false);
  const [isUIPaused, setIsUIPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [dbfs, setDbfs] = useState(-100);

  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [tooltipConfig, setTooltipConfig] = useState<{ open: boolean; text: string; top: number; left: number; arrowTop?: string | number; }>({ open: false, text: '', top: 0, left: 0 });
  const isTutorialActive = tutorialStep !== null;
  const [showBlockTutorialModal, setShowBlockTutorialModal] = useState(false);
  const [blockTutorialContent, setBlockTutorialContent] = useState({ title: '', description: '' });

  const sessionCreationLock = useRef(false);
  const previousBlockIdRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaRecorderSampleRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]); 
  const audioChunksSampleRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalId = useRef<NodeJS.Timeout | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const phraseTextRef = useRef<HTMLElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const timerElementRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const visualize = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      let sumSquares = 0.0;
      for (let i = 0; i < dataArray.length; i++) {
        const amplitude = (dataArray[i] / 128.0) - 1.0;
        sumSquares += amplitude * amplitude;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);
      const db = 20 * Math.log10(rms);
      setDbfs(isFinite(db) ? db : -100);

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
  }, [setDbfs]);
  
  const stopRecording = useCallback((cleanupStream = true, onBlobAvailable?: (blob: Blob) => void) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        audioChunksRef.current = [];
        if (onBlobAvailable) {
          onBlobAvailable(audioBlob);
        }
      };
      mediaRecorderRef.current.stop();
    }
    if (cleanupStream && streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if(analyserRef.current) {
        analyserRef.current = null;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (timerIntervalId.current) {
      clearInterval(timerIntervalId.current);
      timerIntervalId.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const audioContext = audioContextRef.current;
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 2048;
      
      sourceRef.current = audioContext.createMediaStreamSource(streamRef.current);
      sourceRef.current.connect(analyserRef.current);

      const recorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = recorder;
    
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
    
      audioChunksRef.current = [];
      recorder.start();
      setIsRecording(true);
      setTimer(0);
      visualize();

    } catch (err) {
      console.error("Error obtaining audio stream:", err);
      setError("Não foi possível acessar o microfone. Verifique as permissões do seu navegador.");
    }
  }, [visualize, setError]);

  useEffect(() => {
    const createOrResumeSession = async () => {
      const sessionToResume = location.state?.sessionToResume;

      if (session) return;

      if (sessionToResume) {
        setSession(sessionToResume);
        setCurrentPhraseIndex(sessionToResume.numero_frase);
        if (sessionToResume.numero_frase > 0) {
          setPreRecordingStep('recording');
        } else {
          setPreRecordingStep('voiceCheck');
        }
        setIsLoading(false);
        navigate(location.pathname, { replace: true, state: {} });
        return;
      }
      
      if (!token || !datasetId || sessionCreationLock.current) {
        setIsLoading(false);
        return;
      }

      if (retryCount === 0) {
        setError(null); // Clear previous errors on a new attempt
      }
      
      const frontendId = parseInt(datasetId, 10);
      const datasetInfo = findByFrontendId(frontendId);
      if (!datasetInfo) {
        setError("Dataset não encontrado.");
        setIsLoading(false);
        return;
      }
      
      sessionCreationLock.current = true;
      setIsLoading(true);
      
      let caughtError: any = null;
      try {
        const newSession = await api.createSession(datasetInfo.backendId, true, token);
        setSession(newSession);
        setCurrentPhraseIndex(0);
        setPreRecordingStep('voiceCheck');
        setRetryCount(0); // Reset retry count on success
      } catch (error: any) {
        caughtError = error;
        if (error.session) {
          setExistingSessionInfo(error.session as SessionResponse);
          setShowExistingSessionModal(true);
          setRetryCount(0); // Reset retry count for existing session case
        } else if (retryCount < MAX_RETRIES) {
          console.warn(`Session creation failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`, error);
          setRetryCount(prev => prev + 1);
          setTimeout(() => createOrResumeSession(), 1000); // Retry after 1 second
        } else {
          console.error("Failed to create session after multiple retries:", error);
          setError("Não foi possível iniciar a sessão após várias tentativas. Por favor, tente novamente mais tarde.");
        }
      } finally {
        if (retryCount >= MAX_RETRIES || caughtError?.session) { // Only stop loading if retries exhausted or session exists
          setIsLoading(false); 
        }
        sessionCreationLock.current = false;
      }
    };
    createOrResumeSession();
  }, [token, datasetId, navigate, location.state, session, retryCount]);

  useEffect(() => {
    const fetchBlockData = async () => {
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/block.csv`);
        const text = await response.text();
        const lines = text.trim().split('\n').slice(1);
        const blockData: Block[] = lines.map(line => {
          const [blockId, name] = line.split(',');
          return { blockId: parseInt(blockId), name: name.replace(/"/g, '') };
        });
        setBlocks(blockData);
      } catch (error) {
        console.error("Failed to load block.csv:", error);
      }
    };
    fetchBlockData();
  }, []);
  
  useEffect(() => {
    if (preRecordingStep === 'recording' && !isRecording && !isUIPaused && !showBlockTutorialModal) {
      startRecording();
    }
  }, [preRecordingStep, isRecording, isUIPaused, startRecording, showBlockTutorialModal]);

  useEffect(() => {
    const fetchCsvData = async () => {
      if (!session) return;
      const datasetInfo = findByBackendId(session.dataset_id);
      if (!datasetInfo) return;

      setIsLoading(true);
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/${datasetInfo.csvFile}`);
        const text = await response.text();
        const lines = text.trim().split('\n').slice(1);
        const data: Phrase[] = lines.map(line => {
          const regex = /(?<=,|^)(?:"[^"]*"|[^,]*)/g;
          const matches = line.match(regex) || [];
          const [id, phraseText, blockId, videoSrc] = matches.map(field => field.replace(/"/g, ''));
          return { id: parseInt(id), text: phraseText, blockId: parseInt(blockId), videoSrc: videoSrc };
        });
        setPhrases(data);
        if (data.length === 0) {
          setShowNoPhrasesModal(true);
        }
      } catch (error) {
        console.error("Failed to load CSV:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCsvData();
  }, [session]);

  useEffect(() => {
    if (phrases.length > 0 && blocks.length > 0) {
        const currentBlockId = phrases[currentPhraseIndex].blockId;
        if (previousBlockIdRef.current !== null && previousBlockIdRef.current !== currentBlockId) {
            const tutorial = blockTutorials[currentBlockId];
            if (tutorial) {
                setBlockTutorialContent(tutorial);
                setShowBlockTutorialModal(true);
            }
        }
        previousBlockIdRef.current = currentBlockId;
    }
  }, [currentPhraseIndex, phrases, blocks]);

  const handleTutorialModalClose = () => {
    setShowBlockTutorialModal(false);
    setIsUIPaused(false); // Descongela a UI para iniciar a gravação
  };

  const handleNextTutorialStep = useCallback(() => {
    if (tutorialStep === 3) {
      setTutorialStep(null);
      startRecording();
      setIsUIPaused(false); // Descongela a UI para iniciar a gravação
      setPreRecordingStep('recording'); // Garante que o estado de gravação seja ativado
    } else {
      setTutorialStep(prev => (prev === null ? null : prev + 1));
    }
  }, [tutorialStep, startRecording]);

  const getAudioMetadata = (audioBlob: Blob): Promise<{ duration: number; sampleRate: number }> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();

      fileReader.onloadend = () => {
        const arrayBuffer = fileReader.result as ArrayBuffer;
        audioContext.decodeAudioData(
          arrayBuffer,
          (audioBuffer) => {
            resolve({
              duration: audioBuffer.duration,
              sampleRate: audioBuffer.sampleRate,
            });
          },
          (error) => {
            reject(error);
          }
        );
      };

      fileReader.onerror = (error) => {
        reject(error);
      };

      fileReader.readAsArrayBuffer(audioBlob);
    });
  };

  const advanceToNextPhrase = useCallback(async () => {
    if (!session || !token) return;
    
    try {
      setIsProcessing(true);
      // Limpeza completa do estado anterior (congelado) e reinício do stream
      stopRecording(true); // Agora limpa o stream completamente
      
      const nextPhraseIndex = currentPhraseIndex + 1;
      if (nextPhraseIndex < phrases.length) {
        const updatedSession = { ...session, numero_frase: nextPhraseIndex };
        await api.put(`/sessions/${session.id}`, updatedSession, token);
        setSession(updatedSession);
        
        const currentBlockId = phrases[currentPhraseIndex].blockId;
        const nextBlockId = phrases[nextPhraseIndex].blockId;
        
        setCurrentPhraseIndex(nextPhraseIndex);

        if (currentBlockId === nextBlockId) {
          setIsUIPaused(false); // Descongela a UI se não houver mudança de bloco
          startRecording(); // Reinicia a gravação explicitamente
        }
        // Se houver mudança de bloco, a UI permanece congelada até o usuário fechar o tutorial
      } else {
        setIsUIPaused(false);
        stopRecording(true); // Para e limpa a gravação da última frase
        setFinalizationStep('preRoomTone');
      }
    } catch (error) {
        console.error("Falha ao avançar a frase (fim da contagem):", error);
    } finally {
        setIsProcessing(false);
    }
  }, [session, token, currentPhraseIndex, phrases, stopRecording, startRecording, setIsUIPaused]);

  const sendAudioData = useCallback(async (audioBlob: Blob, is_room_tone = false, blockId?: number) => {
    if (!session || !token) return;

    try {
      setIsProcessing(true);
      const { duration, sampleRate } = await getAudioMetadata(audioBlob);
      await api.uploadRecording(
        session.id,
        session.dataset_id,
        blockId !== undefined ? blockId : phrases[currentPhraseIndex].blockId,
        audioBlob,
        duration,
        'wav',
        sampleRate,
        token,
        is_room_tone,
        !is_room_tone ? phrases[currentPhraseIndex].id : undefined,
        !is_room_tone ? phrases[currentPhraseIndex].text : undefined
      );
      setUploadError(null);
      setAudioForRetry(null);
      if (!is_room_tone) {
        advanceToNextPhrase();
      }
    } catch (error: any) {
      setUploadError(error);
      setAudioForRetry(audioBlob);
    } finally {
      setIsProcessing(false);
    }
  }, [session, token, phrases, currentPhraseIndex, advanceToNextPhrase]);

  const processPhraseChange = useCallback(async (skip = false) => {
    if (!session || !token) return;

    // Stop recording and freeze UI immediately
    
    setIsUIPaused(true);
    setIsRecording(false); // Set to false to show "Pronto" status and freeze UI

    // Clean canvas, reset timer and dBFS for the next recording, but keep UI frozen
    setTimer(0);
    setDbfs(-100);
    const canvas = canvasRef.current;
    if (canvas) {
        const canvasCtx = canvas.getContext('2d');
        if (canvasCtx) {
            canvasCtx.fillStyle = '#1e1e1e';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    if (skip) {
      stopRecording(true);
      setCountdown(3);
    } else {
      stopRecording(false, sendAudioData);
    }
  }, [session, token, stopRecording, sendAudioData]);
  
  const handleRetryUpload = () => {
    if (audioForRetry) {
      sendAudioData(audioForRetry);
    }
  };

  const handleDiscardUpload = () => {
    setUploadError(null);
    setAudioForRetry(null);
    advanceToNextPhrase();
  };

  useEffect(() => {
    if (countdown === null) return;
  
    if (countdown === 0) {
      setCountdown(null);
      advanceToNextPhrase();
    } else {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, advanceToNextPhrase]);

  useEffect(() => {
    if (isRecording && !isUIPaused) {
      timerIntervalId.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
    } else {
      if (timerIntervalId.current) clearInterval(timerIntervalId.current);
      timerIntervalId.current = null;
    }
    return () => {
      if (timerIntervalId.current) clearInterval(timerIntervalId.current);
    };
  }, [isRecording, isUIPaused]);

  useEffect(() => {
    if (finalizationStep === 'roomTone') {
      // Zera a UI antes de começar a gravação final
      setTimer(0);
      setDbfs(-100);
      const canvas = canvasRef.current;
      if (canvas) {
        const canvasCtx = canvas.getContext('2d');
        if (canvasCtx) {
            canvasCtx.fillStyle = '#1e1e1e';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      startRecording();
      setFinalRoomToneCountdown(5);

      const intervalId = setInterval(() => {
        setFinalRoomToneCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);

      const timeoutId = setTimeout(() => {
        stopRecording();
        setFinalizationStep('notes');
      }, 5000);

      // Função de limpeza para evitar memory leaks
      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, [finalizationStep, startRecording, stopRecording]);
  
  const handleNextPhrase = () => processPhraseChange(false);
  const handleSkipPhrase = () => processPhraseChange(true);

  const handleResumeSession = useCallback(() => {
    if (existingSessionInfo) {
      const info = findByBackendId(existingSessionInfo.dataset_id);
      if (info) {
        setShowExistingSessionModal(false);
        navigate(`/recording/${info.frontendId}`, { state: { sessionToResume: existingSessionInfo } });
      }
    }
  }, [existingSessionInfo, navigate]);

  const handleCancelAndCreateNewSession = useCallback(async () => {
    if (existingSessionInfo && token && datasetId) {
      try {
        setIsLoading(true);
        const finished_at = new Date().toISOString();
        await api.put(`/sessions/${existingSessionInfo.id}`, { ...existingSessionInfo, status: "cancelada", finished_at }, token);
        
        setShowExistingSessionModal(false);
        setExistingSessionInfo(null);
        
        const frontendId = parseInt(datasetId, 10);
        const datasetInfo = findByFrontendId(frontendId);
        if (!datasetInfo) {
          setError("Dataset não encontrado.");
          setIsLoading(false);
          return;
        }

        const newSession = await api.createSession(datasetInfo.backendId, true, token);
        setSession(newSession);
        setCurrentPhraseIndex(0);
        setPreRecordingStep('voiceCheck');
      } catch (error) {
        console.error("Failed to cancel and create new session:", error);
        setError("Ocorreu um erro ao criar uma nova sessão.");
      } finally {
        setIsLoading(false);
      }
    }
  }, [existingSessionInfo, token, datasetId, setIsLoading, setError, setExistingSessionInfo, setSession, setCurrentPhraseIndex, setPreRecordingStep, setShowExistingSessionModal]);

  const confirmCancelSession = async () => {
    if (session && token) {
      try {
        await api.put(`/sessions/${session.id}`, { ...session, status: "cancelada", finished_at: new Date().toISOString() }, token);
        navigate('/');
      } catch (error) {
        console.error("Failed to cancel session:", error);
        setError("Não foi possível cancelar a sessão. Tente novamente.");
      }
    }
    setIsCancelModalOpen(false);
  };
  
  const handleFinish = async () => {
    if (session && token) {
      try {
        await api.put(`/sessions/${session.id}`, { 
          ...session, 
          status: "finalizada", 
          notes: sessionNotes,
          finished_at: new Date().toISOString() 
        }, token);
        setFinalizationStep('idle');
        setOpenFinishModal(true);
      } catch (error) {
        console.error("Failed to finish session:", error);
        setError("Não foi possível finalizar a sessão. Tente novamente.");
      }
    }
  };

  const totalPhrases = phrases.length;
  const progressValue = totalPhrases > 0 ? ((currentPhraseIndex + 1) / totalPhrases) * 100 : 0;
  const currentPhrase = phrases[currentPhraseIndex];
  const formatTime = (time: number) => `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
  const getDbfsColor = (dbfs: number) => dbfs > -20 ? 'red' : dbfs > -40 ? 'yellow' : 'green';
  
  // Handlers for pre-recording steps...
  const handleVoiceCheckSubmit = useCallback(() => setPreRecordingStep('voiceSample'), []);

  const handleStartSampleRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderSampleRef.current = new MediaRecorder(stream);
      
      mediaRecorderSampleRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksSampleRef.current.push(event.data);
        }
      };
      
      mediaRecorderSampleRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksSampleRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setVoiceSampleUrl(url);
        setVoiceSampleStep('recorded');
        audioChunksSampleRef.current = [];
      };
      
      mediaRecorderSampleRef.current.start();
      setVoiceSampleStep('recording');
    } catch (err) {
      console.error("Error starting sample recording:", err);
      setError("Não foi possível acessar o microfone. Verifique as permissões do seu navegador.");
    }
  }, [setError]);

  const handleStopSampleRecording = useCallback(() => {
    if (mediaRecorderSampleRef.current && mediaRecorderSampleRef.current.state === 'recording') {
      mediaRecorderSampleRef.current.stop();
    }
    // No stream cleanup here, as it's a temporary sample recording.
    // The main streamRef is handled by stopRecording for phrases.
  }, []);

  const handlePlaySample = useCallback(() => setVoiceSampleStep('playing'), []);
  const handleSamplePlaybackEnded = useCallback(() => setVoiceSampleStep('recorded'), []);
  
  const handleSampleRecorded = useCallback(() => setPreRecordingStep('roomTone'), []);

  const handleRoomToneUpload = (audioBlob: Blob) => {
    // For the initial room tone, we can assume blockId 1
    sendAudioData(audioBlob, true, 1); 
    setPreRecordingStep('recording'); // Força a transição para a tela de gravação
    if (currentPhraseIndex === 0) {
      setIsUIPaused(true); // Pausa a nova tela para mostrar o tutorial
      setTutorialStep(0);
    }
  };

  const handleRoomToneRecordingComplete = (blob: Blob) => {
    handleRoomToneUpload(blob);
  };
  
  if (isLoading && !showExistingSessionModal) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return (
      <Container sx={{ textAlign: 'center', mt: 10 }}>
        <Typography variant="h5" color="error">{error}</Typography>
        <Button component={Link} to="/" variant="contained" sx={{ mt: 2 }}>
          Voltar para a Home
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Modal open={showNoPhrasesModal} onClose={() => navigate('/')}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Nenhuma Frase Encontrada</Typography>
          <Typography sx={{ mt: 2 }}>
            Este conjunto de dados não parece ter frases para gravação.
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button onClick={() => navigate('/')} variant="contained">
              Voltar ao Início
            </Button>
          </Box>
        </Box>
      </Modal>
      <Modal open={showExistingSessionModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Sessão Ativa Encontrada</Typography>
          <Typography sx={{ mt: 2 }}>
            {`Você tem uma sessão ativa para "${existingSessionInfo ? findByBackendId(existingSessionInfo.dataset_id)?.name : ''}". Deseja continuar ou criar uma nova?`}
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handleResumeSession} variant="contained">Continuar</Button>
            <Button onClick={handleCancelAndCreateNewSession} variant="outlined">Criar Nova</Button>
          </Box>
        </Box>
      </Modal>
      <Modal open={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Cancelar Sessão</Typography>
          <Typography sx={{ mt: 2 }}>
            Tem certeza que deseja cancelar esta sessão? Todo o seu progresso será perdido.
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setIsCancelModalOpen(false)}>Não, Voltar</Button>
            <Button onClick={confirmCancelSession} color="error">Sim, Cancelar</Button>
          </Box>
        </Box>
      </Modal>
      
      {session && preRecordingStep !== 'recording' ? (
        <>
          {preRecordingStep === 'voiceCheck' && <VoiceCheckScreen onSubmit={handleVoiceCheckSubmit} />}
          {preRecordingStep === 'voiceSample' && <VoiceSampleScreen {...{step: voiceSampleStep, audioUrl: voiceSampleUrl, onStartRecording: handleStartSampleRecording, onStopRecording: handleStopSampleRecording, onPlay: handlePlaySample, onPlaybackEnded: handleSamplePlaybackEnded, onSampleRecorded: handleSampleRecorded}} />}
          {preRecordingStep === 'roomTone' && <RoomToneScreen onRecordingComplete={handleRoomToneRecordingComplete} />}
        </>
      ) : (
        <>
          {isTutorialActive && <TutorialTooltip {...tooltipConfig} onNext={handleNextTutorialStep} />}
          <Box sx={{ filter: isTutorialActive ? 'brightness(0.7)' : 'none', pointerEvents: isTutorialActive ? 'none' : 'auto' }}>
            <Typography variant="h3" component="h1" textAlign="center" sx={{ mt: 4, mb: 2 }}>
                Gravação de Fala ({datasetId ? findByFrontendId(parseInt(datasetId, 10))?.name : ''})
            </Typography>

            {phrases.length > 0 && currentPhrase ? (
              <Paper elevation={3} sx={{ p: 4 }}>
                <Box sx={{ width: '100%', mb: 2 }}>
                  <LinearProgress variant="determinate" value={progressValue} />
                  <Typography variant="body2" color="text.secondary" textAlign="center">{`${currentPhraseIndex + 1} de ${totalPhrases} frases`}</Typography>
                </Box>
                
                <Box display="flex" alignItems="center" mb={1}>
                  {isRecording && <FiberManualRecordIcon sx={{ color: 'red', animation: 'blinking 1s infinite' }} />}
                  <Typography variant="h6" sx={{ ml: 1 }}>{isRecording ? 'Gravando...' : 'Pronto'}</Typography>
                  <Box flexGrow={1} />
                  <Typography variant="h6" sx={{ color: getDbfsColor(dbfs), mr: 2, fontWeight: 'bold' }}>
                    {(isRecording || isUIPaused) && isFinite(dbfs) ? `${dbfs.toFixed(2)} dBFS` : ''}
                  </Typography>
                  <Typography ref={timerElementRef} variant="h6">{formatTime(timer)}</Typography>
                </Box>

                <Box sx={{ height: 100, backgroundColor: '#1e1e1e', mb: 2, borderRadius: 1 }}>
                  <canvas ref={canvasRef} width="600" height="100" style={{ width: '100%', height: '100%' }} />
                </Box>
                
                <Typography ref={phraseTextRef} variant="h4" sx={{ minHeight: 100, textAlign: 'center', my: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {currentPhrase.text}
                </Typography>
                
                <Box mt={4} display="flex" justifyContent="space-around">
                  <Button ref={skipButtonRef} variant="outlined" onClick={handleSkipPhrase} disabled={isProcessing || countdown !== null}>Pular Áudio</Button>
                  <Button ref={saveButtonRef} variant="contained" color="primary" onClick={handleNextPhrase} disabled={isProcessing || !isRecording || countdown !== null}>
                    {isProcessing ? <CircularProgress size={24} /> : 'Salvar e Próxima'}
                  </Button>
                </Box>
              </Paper>
            ) : (
              isLoading ? <CircularProgress /> : (
              <Box sx={{
                backgroundColor: 'black',
                width: '100%',
                minHeight: 'calc(100vh - 300px)', // Adjust as needed
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {/* Modal will appear on top */}
              </Box>
            )
            )}

            <Box mt={2} display="flex" justifyContent="center">
                <Button component={Link} to="/">Voltar</Button>
                <Button variant="outlined" color="error" onClick={() => setIsCancelModalOpen(true)}>Cancelar Sessão</Button>
            </Box>
          </Box>
        </>
      )}
      <Modal open={countdown !== null}>
        <Box sx={{ ...modalStyle, width: 200, textAlign: 'center' }}>
          <Typography variant="h1">{countdown}</Typography>
        </Box>
      </Modal>
      <Modal open={finalizationStep === 'notes'} onClose={() => setFinalizationStep('idle')}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Notas da Sessão</Typography>
          <TextField
            label="Notas (opcional)"
            multiline
            rows={4}
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          />
          <Button onClick={handleFinish} variant="contained" sx={{ mt: 2 }}>Finalizar</Button>
        </Box>
      </Modal>

      <Modal open={openFinishModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Sessão Finalizada!</Typography>
          <Button component={Link} to="/">Voltar para Home</Button>
        </Box>
      </Modal>

      <Modal open={finalizationStep === 'preRoomTone'}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Gravação de Som Ambiente</Typography>
          <Typography sx={{ mt: 2 }}>
            A gravação das frases foi concluída. Agora, vamos gravar 5 segundos de silêncio para capturar o som do seu ambiente.
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button onClick={() => setFinalizationStep('roomTone')} variant="contained">
              Iniciar Gravação de Som Ambiente
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={showBlockTutorialModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6">{blockTutorialContent.title}</Typography>
          <Typography sx={{ mt: 2 }}>{blockTutorialContent.description}</Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleTutorialModalClose} variant="contained">
              Entendi
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={finalizationStep === 'roomTone'}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Gravando som ambiente</Typography>
          <Typography sx={{ mt: 2 }}>
            Por favor, permaneça em silêncio por {finalRoomToneCountdown} segundos.
          </Typography>
        </Box>
      </Modal>
      <Modal open={!!uploadError}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Erro no Upload</Typography>
          <Typography sx={{ mt: 2 }}>
            Ocorreu um erro ao enviar o áudio. Deseja tentar novamente?
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handleRetryUpload} variant="contained">Tentar Novamente</Button>
            <Button onClick={handleDiscardUpload} variant="outlined">Descartar</Button>
          </Box>
        </Box>
      </Modal>
    </Container>
  );
};

export default RecordingPage;
// Force re-evaluation
