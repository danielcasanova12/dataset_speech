import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Typography, Container, Paper, Box, Modal, CircularProgress, TextField, LinearProgress, IconButton } from '@mui/material';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import HeadsetIcon from '@mui/icons-material/Headset';
import HeadsetOffIcon from '@mui/icons-material/HeadsetOff';
import VoiceCheckScreen from '../components/VoiceCheckScreen';
import VoiceSampleScreen from '../components/VoiceSampleScreen';
import RoomToneScreen from '../components/RoomToneScreen';
import { useAuth } from '../contexts/AuthContext';
import { api, SessionResponse } from '../services/api';
import { findByFrontendId, findByBackendId } from '../datasets';

interface Phrase { id: number; text: string; blockId: number; videoSrc?: string; }
interface Block { blockId: number; name: string; emocao: number; isSpontaneous: boolean; }

const modalStyle = { position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4 };

const getBlockTutorial = (blockId: number, blocks: Block[]) => {
  const block = blocks.find(b => b.blockId === blockId);
  if (!block) return { title: `Bloco ${blockId}`, description: "Nova seção." };

  if (blockId === 1) return { title: block.name, description: "Bloco de ruído" };
  if (blockId === 2) return { title: block.name, description: "Nesta seção, leia as frases que aparecem na tela de forma clara e natural, como se estivesse conversando normalmente.", instruction: "Leia naturalmente", audioUrl: "/audios/bloco_02_leitura.wav" };
  if (blockId === 3) return { title: block.name, description: "Aqui você responderá perguntas de forma espontânea. Leia a pergunta na tela e responda naturalmente, como faria em uma conversa.", instruction: "Responda de forma espontânea e natural", audioUrl: "/audios/bloco_espontaneo.wav" };
  if (blockId === 104 || blockId === 105) return { title: block.name, description: "Leia ou responda focado em motivação.", instruction: "Motivação" };
  
  let emotionName = block.name.replace("Bloco de Emoção", "").replace("espontânea", "").trim();
  emotionName = emotionName.charAt(0).toUpperCase() + emotionName.slice(1);

  if (block.isSpontaneous) {
    return {
      title: "Bloco de Emoção espontânea",
      description: `Assista ao vídeo e responda de forma espontânea, expressando a emoção que você sentiu ao vê-lo.`,
      instruction: `Espontâneo`,
      audioUrl: "/audios/bloco_espontaneo.wav"
    };
  } else {
    return {
      title: block.name,
      description: `Leia as frases expressando ${emotionName}.`,
      instruction: `Expressar Emoção: ${emotionName}`,
      audioUrl: (emotionName.toLowerCase().includes("feliz") || blockId === 5) ? "/audios/bloco_05_feliz.wav" : undefined
    };
  }
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
const systemTutorialSteps = [
  {
    text: "Aqui você acompanha o progresso das frases gravadas.",
    getPosition: (progressRef: HTMLElement | null) =>
      progressRef?.getBoundingClientRect(),
  },
  {
    text: "Aqui você vê o nível do áudio (dBFS). Evite ficar no vermelho.",
    getPosition: (timerRef: HTMLElement | null) =>
      timerRef?.getBoundingClientRect(),
  },
  {
    text: "Leia esta frase em voz alta de forma clara e natural.",
    getPosition: (phraseRef: HTMLElement | null) =>
      phraseRef?.getBoundingClientRect(),
  },
  {
    text: "Clique aqui para salvar e ir para a próxima frase.",
    getPosition: (saveRef: HTMLElement | null) =>
      saveRef?.getBoundingClientRect(),
  },
];

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const buffer_out = new ArrayBuffer(length);
  const view = new DataView(buffer_out);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  for(i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while(pos < length) {
    for(i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF);
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([buffer_out], {type: "audio/wav"});
}

const RecordingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { datasetId } = useParams<{ datasetId: string }>();
  const { setActiveSessionInfo } = useAuth();
  
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
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 1;
  const [uploadError, setUploadError] = useState<Error | null>(null);
  const [audioForRetry, setAudioForRetry] = useState<{ blob: Blob, isRoomTone: boolean, blockId?: number, roomToneType?: 'start' | 'end' } | null>(null);

  const [preRecordingStep, setPreRecordingStep] = useState<'voiceCheck' | 'voiceSample' | 'roomTone' | 'recording' | 'idle'>('idle'); 
  const [finalRoomToneCountdown, setFinalRoomToneCountdown] = useState<number | null>(null);
  const [voiceSampleUrl, setVoiceSampleUrl] = useState<string | null>(null);
  const [voiceSampleStep, setVoiceSampleStep] = useState<'ready' | 'recording' | 'recorded' | 'playing'>('ready');

  const [isRecording, setIsRecording] = useState(false);
  const [isUIPaused, setIsUIPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [dbfs, setDbfs] = useState(-100);
  const [totalRecordedTime, setTotalRecordedTime] = useState(0);

  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [tooltipConfig, setTooltipConfig] = useState<{ open: boolean; text: string; top: number; left: number; arrowTop?: string | number; }>({ open: false, text: '', top: 0, left: 0 });
  const isTutorialActive = tutorialStep !== null;
  const [showBlockTutorialModal, setShowBlockTutorialModal] = useState(false);
  const [blockTutorialContent, setBlockTutorialContent] = useState<{ title: string; description: string; audioUrl?: string }>({ title: '', description: '' });
  const [isTutorialAudioFinished, setIsTutorialAudioFinished] = useState(false);
  const [isTutorialAudioMuted, setIsTutorialAudioMuted] = useState(false);
  const [tutorialAudioRemaining, setTutorialAudioRemaining] = useState<number | null>(null);
  const [isEntendiEarlyEnabled, setIsEntendiEarlyEnabled] = useState(false);
  const tutorialAudioRef = useRef<HTMLAudioElement | null>(null);

  const [videoFinished, setVideoFinished] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isVideoPhrase = useCallback((index: number) => {
    const phrase = phrases?.[index];
    const src = phrase?.videoSrc;
    return typeof src === 'string' && src.trim().length > 0;
  }, [phrases]);

  const sessionCreationLock = useRef(false);
  const shouldAutoStartRef = useRef(false);
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
  // Substitua sua função stopRecording por esta:
  const stopRecording = useCallback((cleanupStream = true, onBlobAvailable?: (blob: Blob) => void) => {
      // 1. Para o MediaRecorder e MATA a referência
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            audioChunksRef.current = [];
            if (onBlobAvailable) {
              onBlobAvailable(audioBlob);
            }
          };
          try {
            mediaRecorderRef.current.stop();
          } catch (e) { console.warn("Erro ao parar recorder:", e); }
        } else if (onBlobAvailable && audioChunksRef.current.length > 0) {
          // Fallback se já estava inativo
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          onBlobAvailable(audioBlob);
        }
        // O SEGREDO: Anula a referência para liberar o "lock"
        mediaRecorderRef.current = null;
      }
      
      // 2. Limpa o Stream
      if (cleanupStream && streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // 3. Desconecta o Source
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch(e) {}
        sourceRef.current = null;
      }

      // 4. Limpeza de Timers e Animações
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


  const resetRecordingState = useCallback(() => {
    if (timerIntervalId.current) {
      clearInterval(timerIntervalId.current);
      timerIntervalId.current = null;
    }
    setCountdown(null);
    setIsRecording(false);
    setIsUIPaused(false);
    setTimer(0);
    setDbfs(-100);
  }, []);


  const startRecording = useCallback(async () => {
    // Blinde o startRecording (Auto-Cura)
    if (mediaRecorderRef.current) {
        console.warn("startRecording called but MediaRecorder exists. Force stopping to self-heal.");
        stopRecording(true);
    }

    try {
      // Limpeza de segurança
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const savedMicId = localStorage.getItem('selectedMicId');
      const audioConstraints = savedMicId ? { deviceId: { exact: savedMicId } } : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      streamRef.current = stream;
      // Audio Context Singleton
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const audioContext = audioContextRef.current;

      // Analyser
      if (!analyserRef.current) {
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 2048;
      }
      
      // Source
      if (sourceRef.current) {
         try { sourceRef.current.disconnect(); } catch(e) {}
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      sourceRef.current = source;

      // Recorder
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder; // Define a ref ANTES de iniciar
    
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      audioChunksRef.current = [];
      recorder.start();
      
      // Atualiza UI
      setIsRecording(true);
      setTimer(0);
      visualize();

    } catch (err) {
      console.error("Erro start:", err);
      stopRecording(true);
      // Opcional: Tentar novamente em 1s se falhar
    }
  }, [visualize, stopRecording]);

  const startPhraseFlow = useCallback((index: number) => {
    if (isVideoPhrase(index)) {
      if (videoRef.current) {
        videoRef.current.play().catch(err => console.error("Auto-play video failed:", err));
      }
      return;
    }
    startRecording().catch(err => console.error("Auto-start failed:", err));
  }, [isVideoPhrase, startRecording]);

  useEffect(() => {
    const createOrResumeSession = async () => {
      const sessionToResume = location.state?.sessionToResume;

      if (session) return;

      if (sessionToResume) {
        setSession(sessionToResume);
        setActiveSessionInfo(sessionToResume.id, sessionToResume.started_at);
        setCurrentPhraseIndex(sessionToResume.numero_frase);
        
        // Reset states for clean resume
        setIsProcessing(false);
        setIsUIPaused(false);
        setIsRecording(false);
        setTimer(0);
        setDbfs(-100);

        if (sessionToResume.numero_frase > 0) {
          setPreRecordingStep('recording');
          shouldAutoStartRef.current = true; // Mark for auto-start
        } else {
          setPreRecordingStep('voiceCheck');
        }
        setIsLoading(false);
        navigate(location.pathname, { replace: true, state: {} });
        return;
      }
      
      if (!datasetId || sessionCreationLock.current) {
        setIsLoading(false);
        return;
      }

      if (retryCountRef.current === 0) {
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
        const newSession = await api.createSession(datasetInfo.backendId, true);
        setSession(newSession);
        setActiveSessionInfo(newSession.id, newSession.started_at);
        setCurrentPhraseIndex(0);
        setPreRecordingStep('voiceCheck');
        retryCountRef.current = 0; // Reset retry count on success
      } catch (error: any) {
        caughtError = error;
        if (error.session) {
          setExistingSessionInfo(error.session as SessionResponse);
          setShowExistingSessionModal(true);
          retryCountRef.current = 0; // Reset retry count for existing session case
        } else if (retryCountRef.current < MAX_RETRIES) {
          console.warn(`Session creation failed, retrying (${retryCountRef.current + 1}/${MAX_RETRIES})...`, error);
          retryCountRef.current += 1;
          const backoffTime = Math.pow(2, retryCountRef.current) * 1000; // Exponential backoff
          setTimeout(() => createOrResumeSession(), backoffTime); 
        } else {
          console.error("Failed to create session after multiple retries:", error);
          setError("Não foi possível iniciar a sessão após várias tentativas. Por favor, tente novamente mais tarde.");
        }
      } finally {
        if (retryCountRef.current >= MAX_RETRIES || caughtError?.session) { // Only stop loading if retries exhausted or session exists
          setIsLoading(false); 
        }
        sessionCreationLock.current = false;
      }
    };
    createOrResumeSession();
  }, [datasetId, navigate, location.state, location.pathname, session, setActiveSessionInfo]);

  useEffect(() => {
    const fetchBlockData = async () => {
      try {
        const response = await fetch(`${window.location.origin}/block.csv`);
        if (!response.ok) throw new Error("Network response was not ok");
        const text = await response.text();
        const lines = text.trim().split('\n').slice(1);
        const blockData: Block[] = lines.map(line => {
          const parts = line.split(',');
          const blockId = parseInt(parts[0]);
          const name = parts[1] ? parts[1].replace(/"/g, '') : '';
          const emocao = parts[2] ? parseInt(parts[2]) : 0;
          const isSpontaneous = parts[3] ? parts[3].trim() === '1' : false;
          return { blockId, name, emocao, isSpontaneous };
        });
        setBlocks(blockData);
      } catch (error) {
        console.error("Failed to load block.csv:", error);
      }
    };
    fetchBlockData();
  }, []);
  

  useEffect(() => {
    const fetchCsvData = async () => {
      if (!session) return;
      const datasetInfo = findByBackendId(session.dataset_id);
      if (!datasetInfo) return;

      setIsLoading(true);
      try {
        const fetchUrl = `${window.location.origin}/${datasetInfo.csvFile}`;
        console.log("Fetching CSV from:", fetchUrl);
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error("Network response was not ok");
        const text = await response.text();
        const lines = text.trim().split('\n').slice(1);
        const normalizeMediaPath = (path?: string) => {
          if (!path) return "";
          
          // 1. Limpeza básica e normalização de barras
          let normalized = path.replace(/\\/g, "/").trim();

          // 2. SEGURANÇA: Bloquear URLs absolutas (http, https, //) para evitar SSRF/Tracking
          if (/^(https?:)?\/\//i.test(normalized)) {
            console.warn("Segurança: Tentativa de carregar vídeo externo bloqueada:", normalized);
            return "";
          }

          // 3. SEGURANÇA: Bloquear Path Traversal (tentativa de subir pastas com ../)
          if (normalized.includes("..")) {
            console.warn("Segurança: Tentativa de Path Traversal detectada:", normalized);
            return "";
          }

          // 4. Garantir que o caminho comece com /video/
          const videoFolderIndex = normalized.toLowerCase().indexOf('/video/');
          if (videoFolderIndex !== -1) {
              normalized = normalized.substring(videoFolderIndex);
          } else {
              // Se não tiver /video/, mas for um nome de arquivo, assume que está na pasta de vídeos
              if (!normalized.startsWith("/")) {
                  normalized = "/video/" + normalized;
              } else if (!normalized.startsWith("/video/")) {
                  normalized = "/video" + normalized;
              }
          }
          
          return normalized;
        };

        const data: Phrase[] = lines.map(line => {
          const regex = /(?<=,|^)(?:"[^"]*"|[^,]*)/g;
          const matches = line.match(regex) || [];
          const [id, phraseText, blockId, videoSrc] = matches.map(field => field.replace(/"/g, ''));
          return {
            id: parseInt(id),
            text: phraseText,
            blockId: parseInt(blockId),
            videoSrc: normalizeMediaPath(videoSrc)
          };
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
    if (shouldAutoStartRef.current && !isLoading && phrases.length > 0 && preRecordingStep === 'recording') {
      const timer = setTimeout(() => {
        console.log("Auto-starting recording after resume...");
        startPhraseFlow(currentPhraseIndex);
        shouldAutoStartRef.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, phrases, preRecordingStep, startPhraseFlow, currentPhraseIndex]);

    useEffect(() => {
    if (!isTutorialActive) {
      setTooltipConfig({ open: false, text: '', top: 0, left: 0 });
      return;
    }
  
    let config = { open: true, text: '', top: 0, left: 0, arrowTop: '50%' as string | number };
    
    const calculateTooltipPosition = () => {
        switch (tutorialStep) {
            case 0:
                const phraseRect = phraseTextRef.current?.getBoundingClientRect();
                if (phraseRect) {
                    config.text = "Leia a frase em voz alta e clara.";
                    config.top = phraseRect.top + (phraseRect.height / 2);
                    config.left = phraseRect.right + 20;
                }
                break;
            case 1:
                const saveRect = saveButtonRef.current?.getBoundingClientRect();
                if (saveRect) {
                    config.text = "Clique aqui quando terminar de falar.";
                    config.top = saveRect.top + saveRect.height / 2;
                    config.left = saveRect.right + 20;
                }
                break;
            case 2:
                const skipRect = skipButtonRef.current?.getBoundingClientRect();
                if (skipRect) {
                    config.text = "Use este botão se quiser pular a frase atual.";
                    config.top = skipRect.top + skipRect.height / 2;
                    config.left = skipRect.right + 20;
                }
                break;
            case 3:
                const timerRect = timerElementRef.current?.getBoundingClientRect();
                if (timerRect) {
                    config.text = "Fique de olho no tempo e no medidor de volume. Tudo pronto para começar?";
                    config.top = timerRect.top + timerRect.height / 2;
                    config.left = timerRect.right + 20;
                }
                break;
            default:
                config.open = false;
        }
        setTooltipConfig(config);
    };

    // Delay calculation to ensure elements are rendered
    const timeoutId = setTimeout(calculateTooltipPosition, 100);

    return () => clearTimeout(timeoutId);

  }, [tutorialStep, isTutorialActive]);

  const handleTutorialModalClose = () => {
    if (tutorialAudioRef.current) {
      tutorialAudioRef.current.pause();
      tutorialAudioRef.current.currentTime = 0;
    }
    setShowBlockTutorialModal(false);
    setIsUIPaused(false);
    setTimeout(() => {
        startPhraseFlow(currentPhraseIndex);
    }, 500);
  };

  const handleNextTutorialStep = useCallback(() => {
    if (tutorialStep === 3) {
      setTutorialStep(null);
      
      const currentBlockId = phrases[currentPhraseIndex]?.blockId;
      if (currentBlockId !== undefined) {
          if (isVideoPhrase(currentPhraseIndex)) {
              startPhraseFlow(currentPhraseIndex);
              setIsUIPaused(false);
              setPreRecordingStep('recording');
          } else {
              const tutorial = getBlockTutorial(currentBlockId, blocks);
              setBlockTutorialContent(tutorial);
              setIsTutorialAudioFinished(false);
              setIsTutorialAudioMuted(false);
              setTutorialAudioRemaining(null);
              setIsEntendiEarlyEnabled(false);
              setShowBlockTutorialModal(true);
          }
      } else {
          startPhraseFlow(currentPhraseIndex);
          setIsUIPaused(false);
          setPreRecordingStep('recording');
      }

    } else {
      setTutorialStep(prev => (prev === null ? null : prev + 1));
    }
  }, [tutorialStep, startPhraseFlow, currentPhraseIndex, phrases, blocks, isVideoPhrase]);

  const getAudioDataAndMetadata = (audioBlob: Blob): Promise<{ duration: number; sampleRate: number; buffer: AudioBuffer }> => {
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
              buffer: audioBuffer,
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
    if (!session) return;
    
    try {
      setIsProcessing(true);
      setIsUIPaused(true); 
      
      // 1. Matar a gravação anterior brutalmente
      stopRecording(true); 
      resetRecordingState();
      setIsUIPaused(true); // Manter pausado durante a transição
      
      const nextPhraseIndex = currentPhraseIndex + 1;
      
      if (nextPhraseIndex < phrases.length) {
        // Salva no banco (sem await para não travar UI)
        const updatedSession = { ...session, numero_frase: nextPhraseIndex };
        api.put(`/sessions/${session.id}`, updatedSession).catch(e => console.error(e));
        setSession(updatedSession);
        
        const currentBlockId = phrases[currentPhraseIndex].blockId;
        const nextBlockId = phrases[nextPhraseIndex].blockId;
        const isCurrentVideo = isVideoPhrase(currentPhraseIndex);
        const isNextVideo = isVideoPhrase(nextPhraseIndex);
        
        setCurrentPhraseIndex(nextPhraseIndex);

        const isBlockChange = currentBlockId !== nextBlockId;
        const shouldShowTutorial = (isBlockChange && !isNextVideo) || (isCurrentVideo && !isNextVideo && !isBlockChange);

        if (shouldShowTutorial) {
          // Mudança de bloco (ou transição de vídeo): Configura tutorial e NÃO inicia gravação
          const tutorial = getBlockTutorial(nextBlockId, blocks);
          setBlockTutorialContent(tutorial);
          setIsTutorialAudioFinished(false);
          setIsTutorialAudioMuted(false);
          setTutorialAudioRemaining(null);
          setIsEntendiEarlyEnabled(false);
          setShowBlockTutorialModal(true);
          // Gravação será iniciada no fechamento do modal
        } else {
          // Mesma bloco ou próximo é vídeo: inicia quase imediatamente (já houve contagem)
          setTimeout(() => {
              setIsUIPaused(false);
              startPhraseFlow(nextPhraseIndex);
          }, 500); 
        }
      } else {
        stopRecording(true);
        resetRecordingState();
        setFinalizationStep('preRoomTone');
      }
    } catch (error) {
        console.error("Erro ao avançar:", error);
    } finally {
        setIsProcessing(false);
    }
  }, [session, currentPhraseIndex, phrases, stopRecording, resetRecordingState, startPhraseFlow]);

  const sendAudioData = useCallback(async (audioBlob: Blob, is_room_tone = false, blockId?: number, room_tone_type?: 'start' | 'end') => {
    if (!session) return;

    try {
      setIsProcessing(true);
      const { duration, sampleRate, buffer } = await getAudioDataAndMetadata(audioBlob);
      const wavBlob = audioBufferToWav(buffer);

      await api.uploadRecording(
        session.id,
        session.dataset_id,
        blockId !== undefined ? blockId : phrases[currentPhraseIndex].blockId,
        wavBlob,
        duration,
        'wav',
        sampleRate,
        is_room_tone,
        !is_room_tone ? phrases[currentPhraseIndex].id : undefined,
        !is_room_tone ? phrases[currentPhraseIndex].text : undefined,
        room_tone_type,
        !is_room_tone ? phrases[currentPhraseIndex].id.toString() : "1"
      );
      if (!is_room_tone) {
        setTotalRecordedTime(prev => prev + duration);
      }
      setUploadError(null);
      setAudioForRetry(null);
     
    } catch (error: any) {
      setUploadError(error);
      setAudioForRetry({ blob: audioBlob, isRoomTone: is_room_tone, blockId, roomToneType: room_tone_type });
    } finally {
      setIsProcessing(false);
    }
  }, [session, phrases, currentPhraseIndex]);

  const processPhraseChange = useCallback(async (skip = false) => {
    if (!session) return;

    setIsUIPaused(true);
    setIsRecording(false);

    setTimer(0);
    setDbfs(-100);

    if (skip) {
      stopRecording(true);
      setCountdown(3);
      return;
    }

    stopRecording(false, (blob) => {
      // ✅ ENVIA E CONTA EM PARALELO
      setCountdown(3);
      sendAudioData(blob); // Roda no background
    });

  }, [session, stopRecording, sendAudioData]);
  const handleRetryUpload = () => {
    if (audioForRetry) {
      sendAudioData(audioForRetry.blob, audioForRetry.isRoomTone, audioForRetry.blockId, audioForRetry.roomToneType);
    }
  };

  const handleDiscardUpload = () => {
    setUploadError(null);
    const retryData = audioForRetry;
    setAudioForRetry(null);
    
    if (retryData?.isRoomTone) {
        if (retryData.roomToneType === 'end' || finalizationStep === 'roomTone') {
            setFinalizationStep('notes');
        }
    } else {
        advanceToNextPhrase();
    }
  };

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      if (!isProcessing && !uploadError) {
        setCountdown(null);
        advanceToNextPhrase(); // ✅ Só troca a frase se envio terminou com sucesso
      }
    } else {
      const timer = setTimeout(() => {
        setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown, isProcessing, uploadError, advanceToNextPhrase]);

  useEffect(() => {
    setVideoFinished(false);
  }, [currentPhraseIndex]);

  // Prevent video from staying paused when switching tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && videoRef.current && !videoFinished) {
        videoRef.current.play().catch(e => console.error("Resume after tab switch failed:", e));
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [videoFinished]);

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
    if (isRecording && timer >= 60 && preRecordingStep === 'recording') {
      stopRecording(true);
      resetRecordingState();
      setShowTimeoutModal(true);
    }
  }, [timer, isRecording, preRecordingStep, stopRecording, resetRecordingState]);

  const handleTimeoutModalClose = () => {
    setShowTimeoutModal(false);
    setTimeout(() => {
      startPhraseFlow(currentPhraseIndex);
    }, 500);
  };

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
        // Callback para capturar o blob e enviar
        stopRecording(true, (blob) => {
           sendAudioData(blob, true, 1, 'end'); // 'end' indica que é o room tone final
           setFinalizationStep('notes');
        });
      }, 5000);

      // Função de limpeza para evitar memory leaks
      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, [finalizationStep, startRecording, stopRecording, sendAudioData]);
  
  const handleNextPhrase = () => processPhraseChange(false);
  const handleSkipPhrase = () => processPhraseChange(true);

  const handleNextVideoPhrase = useCallback(() => {
    resetRecordingState();
    advanceToNextPhrase();
  }, [resetRecordingState, advanceToNextPhrase]);

  const replayVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.play();
    setVideoFinished(false);
  }, []);

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
    if (existingSessionInfo && datasetId) {
      try {
        setIsLoading(true);
        const finished_at = new Date().toISOString();
        await api.put(`/sessions/${existingSessionInfo.id}`, { ...existingSessionInfo, status: "cancelled", finished_at });
        
        setShowExistingSessionModal(false);
        setExistingSessionInfo(null);
        
        const frontendId = parseInt(datasetId, 10);
        const datasetInfo = findByFrontendId(frontendId);
        if (!datasetInfo) {
          setError("Dataset não encontrado.");
          setIsLoading(false);
          return;
        }

        const newSession = await api.createSession(datasetInfo.backendId, true);
        setSession(newSession);
        setActiveSessionInfo(newSession.id, newSession.started_at);
        setCurrentPhraseIndex(0);
        setPreRecordingStep('voiceCheck');
      } catch (error) {
        console.error("Failed to cancel and create new session:", error);
        setError("Ocorreu um erro ao criar uma nova sessão.");
      } finally {
        setIsLoading(false);
      }
    }
  }, [existingSessionInfo, datasetId, setIsLoading, setError, setExistingSessionInfo, setSession, setCurrentPhraseIndex, setPreRecordingStep, setShowExistingSessionModal, setActiveSessionInfo]);

  const confirmCancelSession = async () => {
    if (session) {
      try {
        await api.put(`/sessions/${session.id}`, { ...session, status: "cancelled", finished_at: new Date().toISOString() });
        setActiveSessionInfo(null, null);
        navigate('/');
      } catch (error) {
        console.error("Failed to cancel session:", error);
        setError("Não foi possível cancelar a sessão. Tente novamente.");
      }
    }
    setIsCancelModalOpen(false);
  };
  
  const handleFinish = async () => {
    if (session) {
      try {
        await api.put(`/sessions/${session.id}`, { 
          ...session, 
          status: "finished", 
          notes: sessionNotes,
          finished_at: new Date().toISOString() 
        });
        setActiveSessionInfo(null, null);
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
  const formatTotalTime = (time: number) => {
    const totalSeconds = Math.round(time);
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
  };
  const getDbfsColor = (dbfs: number) => dbfs > -20 ? 'red' : dbfs > -40 ? 'yellow' : 'green';
  
  // Extract unique video URLs for preloading
  const uniqueVideosToPreload = Array.from(
    new Set(phrases.map(p => p.videoSrc).filter(src => src && src.trim() !== ''))
  );
  
  // Handlers for pre-recording steps...
  const handleVoiceCheckSubmit = useCallback(() => setPreRecordingStep('voiceSample'), []);

  const handleStartSampleRecording = useCallback(async () => {
    try {
      const savedMicId = localStorage.getItem('selectedMicId');
      const audioConstraints = savedMicId ? { deviceId: { exact: savedMicId } } : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
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
    sendAudioData(audioBlob, true, 1, 'start'); 
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
      {/* Hidden videos to force browser to preload them */}
      <Box sx={{ display: 'none' }}>
        {uniqueVideosToPreload.map(src => (
          <video key={src} src={src} preload="auto" />
        ))}
      </Box>

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
                  <Box display="flex" justifyContent="space-between" mt={1}>
                    <Typography variant="body2" color="text.secondary">{`${currentPhraseIndex + 1} de ${totalPhrases} frases`}</Typography>
                    <Typography variant="body2" color="primary" fontWeight="bold">Tempo acumulado: {formatTotalTime(totalRecordedTime)}</Typography>
                  </Box>
                </Box>
                
                {isVideoPhrase(currentPhraseIndex) ? (
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <Box sx={{ width: '100%', maxWidth: '800px', mb: 2, backgroundColor: '#000', borderRadius: 1, overflow: 'hidden' }}>
                      <video
                        ref={videoRef}
                        src={currentPhrase.videoSrc}
                        style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block' }}
                        playsInline
                        preload="auto"
                        onEnded={() => setVideoFinished(true)}
                        onError={() => handleNextVideoPhrase()}
                      />
                    </Box>
                    {videoFinished && (
                      <Box mt={2} display="flex" justifyContent="center" gap={4}>
                        <Button variant="outlined" onClick={replayVideo}>Ver novamente</Button>
                        <Button variant="contained" color="primary" onClick={handleNextVideoPhrase} disabled={isProcessing}>
                          {isProcessing ? <CircularProgress size={24} /> : 'Próximo'}
                        </Button>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <>
                    <Box display="flex" alignItems="center" mb={1}>
                      {isRecording && <FiberManualRecordIcon sx={{ color: 'red', animation: 'blinking 1s infinite' }} />}
                      <Typography variant="h6" sx={{ ml: 1 }}>{isRecording ? 'Gravando...' : 'Pronto'}</Typography>
                      <Box flexGrow={1} />
                      <Typography variant="h6" sx={{ color: getDbfsColor(dbfs), mr: 2, fontWeight: 'bold' }}>
                        {(isRecording || isUIPaused) && isFinite(dbfs) ? `${dbfs.toFixed(2)} dBFS` : ''}
                      </Typography>
                      <Typography ref={timerElementRef} variant="h6" sx={{ mr: 2 }}>{formatTime(timer)}</Typography>
                      <IconButton onClick={() => setIsTutorialAudioMuted(!isTutorialAudioMuted)} color={isTutorialAudioMuted ? "error" : "primary"}>
                        {isTutorialAudioMuted ? <HeadsetOffIcon /> : <HeadsetIcon />}
                      </IconButton>
                    </Box>

                    <Box sx={{ height: 100, backgroundColor: '#1e1e1e', mb: 2, borderRadius: 1 }}>
                      <canvas ref={canvasRef} width="600" height="100" style={{ width: '100%', height: '100%' }} />
                    </Box>

                    {getBlockTutorial(currentPhrase.blockId, blocks)?.instruction && (
                      <Typography variant="h6" color="primary" textAlign="center" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {getBlockTutorial(currentPhrase.blockId, blocks).instruction}
                      </Typography>
                    )}

                    <Typography ref={phraseTextRef} variant="h4" sx={{ minHeight: 100, textAlign: 'center', my: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {currentPhrase.text}
                    </Typography>

                    <Box mt={4} display="flex" justifyContent="space-around">
                      <Button ref={skipButtonRef} variant="outlined" onClick={handleSkipPhrase} disabled={isProcessing || countdown !== null}>Pular Áudio</Button>
                      <Button ref={saveButtonRef} variant="contained" color="primary" onClick={handleNextPhrase} disabled={isProcessing || !isRecording || countdown !== null}>
                        {isProcessing ? <CircularProgress size={24} /> : 'Salvar e Próxima'}
                      </Button>
                    </Box>
                  </>
                )}
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
      <Modal open={countdown !== null && !uploadError}>
        <Box sx={{ ...modalStyle, width: 'auto', textAlign: 'center', px: 6 }}>
          {countdown === 0 && isProcessing ? (
            <Box display="flex" flexDirection="column" alignItems="center">
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h5">Aguardando envio do áudio...</Typography>
            </Box>
          ) : (
            <Typography variant="h1">{countdown}</Typography>
          )}
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
          {isTutorialAudioMuted && blockTutorialContent.audioUrl && (
            <Typography sx={{ mt: 1, color: 'error.main', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsTutorialAudioMuted(false)}>
              O áudio do narrador está mutado. Clique aqui para desmutar.
            </Typography>
          )}
          {tutorialAudioRemaining !== null && tutorialAudioRemaining > 0 && !isTutorialAudioFinished && blockTutorialContent.title.toLowerCase().includes('emoção') && (
            <Typography variant="body2" color="primary" sx={{ mt: 2, fontWeight: 'bold' }}>
              A narração termina em {tutorialAudioRemaining} segundo(s)...
            </Typography>
          )}
          {blockTutorialContent.audioUrl && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Button onClick={() => setIsTutorialAudioMuted(!isTutorialAudioMuted)} variant="outlined" size="small">
                {isTutorialAudioMuted ? 'Desmutar Áudio' : 'Mutar Áudio'}
              </Button>
              <audio
                ref={tutorialAudioRef}
                autoPlay
                muted={isTutorialAudioMuted}
                src={blockTutorialContent.audioUrl}
                onTimeUpdate={(e) => {
                  const audio = e.currentTarget;
                  if (audio.duration) {
                    const remaining = Math.max(0, Math.ceil(audio.duration - audio.currentTime));
                    setTutorialAudioRemaining(remaining);
                    if (remaining <= 5) setIsEntendiEarlyEnabled(true);
                  }
                }}
                onLoadedMetadata={(e) => {
                  const audio = e.currentTarget;
                  if (audio.duration) {
                    const remaining = Math.ceil(audio.duration);
                    setTutorialAudioRemaining(remaining);
                    if (remaining <= 5) setIsEntendiEarlyEnabled(true);
                  }
                }}
                onEnded={() => {
                  setIsTutorialAudioFinished(true);
                  setTutorialAudioRemaining(0);
                }}
                onError={() => setIsTutorialAudioFinished(true)}
                style={{ display: 'none' }}
              />
            </Box>
          )}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              onClick={handleTutorialModalClose} 
              variant="contained"
              disabled={!!blockTutorialContent.audioUrl && !isTutorialAudioFinished && !isEntendiEarlyEnabled}
            >
              Entendi
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={showTimeoutModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Tempo Limite Excedido</Typography>
          <Typography sx={{ mt: 2 }}>
            Você demorou mais de 1 minuto nesta frase. O áudio será descartado por ser muito longo.
            Por favor, tente gravar novamente.
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button onClick={handleTimeoutModalClose} variant="contained" color="primary">
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
          <Typography variant="h6" color="error">Erro ao Enviar Áudio</Typography>
          <Typography sx={{ mt: 2 }}>
            Não foi possível enviar a gravação para o servidor. Por favor, tente enviar novamente para não perder seu progresso. Se o erro persistir, você pode optar por ignorar e descartar este áudio.
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handleRetryUpload} variant="contained" color="primary">
              Tentar Novamente
            </Button>
            <Button onClick={handleDiscardUpload} variant="outlined" color="error">
              Ignorar e Descartar
            </Button>
          </Box>
        </Box>
      </Modal>
    </Container>
  );
};

export default RecordingPage;
// Force re-evaluation
