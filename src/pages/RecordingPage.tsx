import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Typography, Container, Paper, Box, Modal, CircularProgress, TextField, LinearProgress, IconButton } from '@mui/material';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import HeadsetIcon from '@mui/icons-material/Headset';
import HeadsetOffIcon from '@mui/icons-material/HeadsetOff';
import ContrastIcon from '@mui/icons-material/Contrast';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TimerOffOutlinedIcon from '@mui/icons-material/TimerOffOutlined';
import VoiceCheckScreen from '../components/VoiceCheckScreen';
import VoiceSampleScreen from '../components/VoiceSampleScreen';
import RoomToneScreen from '../components/RoomToneScreen';
import { useAuth } from '../contexts/AuthContext';
import { api, SessionResponse } from '../services/api';
import { findByFrontendId, findByBackendId } from '../datasets';
import { DatasetOrchestrator, OrchestratorConfig, Phrase as OrchestratorPhrase } from '../services/orchestrator';

interface Phrase extends OrchestratorPhrase { }
interface Block { blockId: number; name: string; emocao: number; isSpontaneous: boolean; }

const MAX_RECORDING_SECONDS = 90;
const modalStyle = { position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4 };

const getBlockTutorial = (blockId: number, blocks: Block[]) => {
  const block = blocks.find(b => b.blockId === blockId);
  if (!block) return { title: `Bloco ${blockId}`, description: "Nova etapa." };

  if (blockId === 1) return { title: block.name, description: "Grave alguns segundos de silêncio." };
  if (blockId === 2) return { title: block.name, description: "Leia cada frase com voz natural.", instruction: "Leia naturalmente", audioUrl: "/audios/bloco_02_leitura.wav" };
  if (blockId === 3) return { title: block.name, description: "Leia a pergunta e responda como em uma conversa.", instruction: "Responda naturalmente", audioUrl: "/audios/bloco_espontaneo.wav" };
  if (blockId === 104 || blockId === 105) return { title: block.name, description: "Leia ou responda com foco em motivação.", instruction: "Motivação" };
  
  let emotionName = block.name.replace("Bloco de Emoção", "").replace("espontânea", "").trim();
  emotionName = emotionName.charAt(0).toUpperCase() + emotionName.slice(1);

  if (block.isSpontaneous) {
    return {
      title: "Bloco de Emoção espontânea",
      description: `Assista ao vídeo e responda com a emoção que ele despertou.`,
      instruction: `Espontâneo`,
      audioUrl: "/audios/bloco_espontaneo.wav"
    };
  } else {
    return {
      title: block.name,
      description: `Leia expressando ${emotionName}.`,
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
  const [orchestrator, setOrchestrator] = useState<DatasetOrchestrator | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [existingSessionInfo, setExistingSessionInfo] = useState<SessionResponse | null>(null);
  const [showExistingSessionModal, setShowExistingSessionModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showPackageModal, setShowPackageModal] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [finalizationStep, setFinalizationStep] = useState<'idle' | 'preRoomTone' | 'roomTone' | 'notes'>('idle');
  const [sessionNotes, setSessionNotes] = useState('');
  const [openFinishModal, setOpenFinishModal] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showNoPhrasesModal, setShowNoPhrasesModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [phraseFontSize, setPhraseFontSize] = useState(34);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isDyslexicFont, setIsDyslexicFont] = useState(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 1;
  const [uploadError, setUploadError] = useState<Error | null>(null);
  const [audioForRetry, setAudioForRetry] = useState<{ blob: Blob, isRoomTone: boolean, blockId?: number, roomToneType?: 'start' | 'end' } | null>(null);

  const [skipCount, setSkipCount] = useState(0);

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
  
  const muteRef = useRef<HTMLButtonElement>(null);
  const dyslexicRef = useRef<HTMLButtonElement>(null);
  const contrastRef = useRef<HTMLButtonElement>(null);
  const fontSizeRef = useRef<HTMLButtonElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);

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
  const startMicWarmup = useCallback(async () => {
    try {
      if (streamRef.current && streamRef.current.active) return;

      const savedMicId = localStorage.getItem('selectedMicId');
      const audioConstraints = savedMicId ? { deviceId: { exact: savedMicId } } : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      streamRef.current = stream;
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') await audioContext.resume();

      if (!analyserRef.current) {
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 2048;
      }
      
      if (sourceRef.current) {
         try { sourceRef.current.disconnect(); } catch(e) {}
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      sourceRef.current = source;
      
      visualize();
    } catch (err) {
      console.error("Mic warmup failed:", err);
    }
  }, [visualize]);

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
      if (cleanupStream && sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch(e) {}
        sourceRef.current = null;
      }

      // 4. Limpeza de Timers e Animações
      if (cleanupStream && animationFrameId.current) {
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
      // Limpeza de segurança se não houver stream ativo
      if (!streamRef.current || !streamRef.current.active) {
        const savedMicId = localStorage.getItem('selectedMicId');
        const audioConstraints = savedMicId ? { deviceId: { exact: savedMicId } } : true;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        streamRef.current = stream;
      }
      
      const stream = streamRef.current;

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
      
      // Source - Só reconecta se necessário
      if (!sourceRef.current) {
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        sourceRef.current = source;
      }

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

  const sessionToResume = location.state?.sessionToResume;
  const sessionDatasetId = session?.dataset_id;
  const sessionNumeroFrase = session?.numero_frase ?? 0;

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
    if (session && !selectedPackage && !showExistingSessionModal) {
      setShowPackageModal(true);
    }
  }, [session, selectedPackage, showExistingSessionModal]);

  useEffect(() => {
    const fetchCsvData = async () => {
      if (!sessionDatasetId || !selectedPackage) return;
      const datasetInfo = findByBackendId(sessionDatasetId);
      if (!datasetInfo) return;

      setIsLoading(true);
      try {
        // 1. Fetch Config
        const configResponse = await fetch(`${window.location.origin}/datasets_config.json`);
        if (!configResponse.ok) throw new Error("Failed to load datasets_config.json");
        const configData: OrchestratorConfig = await configResponse.json();
        
        // Find dataset config by slug or frontendId mapping
        // For now, mapping dataset_id 1 to "voz_geral"
        const datasetKey = datasetInfo.backendId === 1 ? 'voz_geral' : 'voz_geral';
        const datasetConfig = configData.datasets[datasetKey];

        // 2. Fetch CSV
        const fetchUrl = `${window.location.origin}/${datasetInfo.csvFile}`;
        console.log("Fetching CSV from:", fetchUrl);
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error("Network response was not ok");
        const text = await response.text();
        const lines = text.trim().split('\n').slice(1);
        const normalizeMediaPath = (path?: string) => {
          if (!path) return "";
          let normalized = path.replace(/\\/g, "/").trim();
          if (/^(https?:)?\/\//i.test(normalized)) return "";
          if (normalized.includes("..")) return "";
          const videoFolderIndex = normalized.toLowerCase().indexOf('/video/');
          if (videoFolderIndex !== -1) {
              normalized = normalized.substring(videoFolderIndex);
          } else {
              if (!normalized.startsWith("/")) normalized = "/video/" + normalized;
              else if (!normalized.startsWith("/video/")) normalized = "/video" + normalized;
          }
          return normalized;
        };

        const allPhrases: Phrase[] = lines.map(line => {
          const regex = /(?<=,|^)(?:"[^"]*"|[^,]*)/g;
          const matches = line.match(regex) || [];
          const [id, phraseText, blockId, videoSrc, audioSize] = matches.map(field => field.replace(/"/g, ''));
          return {
            id: parseInt(id),
            text: phraseText,
            blockId: parseInt(blockId),
            videoSrc: normalizeMediaPath(videoSrc),
            audioSize: (audioSize || 'p').toLowerCase()
          };
        });

        // 3. Initialize Orchestrator
        const newOrchestrator = new DatasetOrchestrator(datasetConfig, allPhrases, selectedPackage);
        setOrchestrator(newOrchestrator);

        const sessionPhrases = newOrchestrator.generateSessionPhrases();
        setPhrases(sessionPhrases);
        
        // 4. Set starting index from resume
        if (sessionToResume) {
          // Ajuste: se a API retornar numero_frase > 0, usamos para o index
          setCurrentPhraseIndex(Math.max(0, sessionNumeroFrase));
        } else {
          setCurrentPhraseIndex(0);
        }

        if (sessionPhrases.length === 0) {
          setShowNoPhrasesModal(true);
        }
      } catch (error) {
        console.error("Failed to load CSV/Config:", error);
        setError("Erro ao carregar dados do dataset. Verifique sua conexão.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCsvData();
  }, [selectedPackage, sessionDatasetId, sessionNumeroFrase, sessionToResume]);

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
                const muteRect = muteRef.current?.getBoundingClientRect();
                if (muteRect) {
                    config.text = "Silencia ou ativa a narração e os áudios de guia.";
                    config.top = muteRect.top + muteRect.height / 2;
                    config.left = muteRect.right + 20;
                }
                break;
            case 4:
                const dyslexicRect = dyslexicRef.current?.getBoundingClientRect();
                if (dyslexicRect) {
                    config.text = "Muda para uma fonte especial que facilita a leitura para quem tem dislexia.";
                    config.top = dyslexicRect.top + dyslexicRect.height / 2;
                    config.left = dyslexicRect.right + 20;
                }
                break;
            case 5:
                const contrastRect = contrastRef.current?.getBoundingClientRect();
                if (contrastRect) {
                    config.text = "Ativa o modo de alto contraste para descansar os olhos e focar na leitura.";
                    config.top = contrastRect.top + contrastRect.height / 2;
                    config.left = contrastRect.right + 20;
                }
                break;
            case 6:
                const fontSizeRect = fontSizeRef.current?.getBoundingClientRect();
                if (fontSizeRect) {
                    config.text = "Aumenta ou diminui o tamanho do texto para a sua melhor comodidade.";
                    config.top = fontSizeRect.top + fontSizeRect.height / 2;
                    config.left = fontSizeRect.right + 20;
                }
                break;
            case 7:
                const pauseRect = pauseRef.current?.getBoundingClientRect();
                if (pauseRect) {
                    config.text = "Cansou? Clique aqui para pausar e continuar do mesmo ponto outro dia.";
                    config.top = pauseRect.top + pauseRect.height / 2;
                    config.left = pauseRect.right + 20;
                }
                break;
            case 8:
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

  const handleTutorialModalClose = useCallback(() => {
    if (tutorialAudioRef.current) {
      tutorialAudioRef.current.pause();
      tutorialAudioRef.current.currentTime = 0;
    }
    setShowBlockTutorialModal(false);
    setIsUIPaused(false);
    setTimeout(() => {
        startPhraseFlow(currentPhraseIndex);
    }, 500);
  }, [currentPhraseIndex, startPhraseFlow]);

  const handleNextTutorialStep = useCallback(() => {
    if (tutorialStep === 8) {
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
    if (!session || !orchestrator) return;

    try {
      setIsUIPaused(true); 
      stopRecording(false); // Mantém o stream vivo para a próxima frase
      resetRecordingState();
      setIsUIPaused(true); 
      
      setSkipCount(0);

      const nextPhraseIndex = currentPhraseIndex + 1;

      if (nextPhraseIndex >= phrases.length) {
        stopRecording(true); // Fim da sessão, agora sim fecha o stream
        resetRecordingState();
        setFinalizationStep('preRoomTone');
        return;
      }

      const updatedSession = { ...session, numero_frase: session.numero_frase + 1 };
      api.put(`/sessions/${session.id}`, updatedSession).catch(e => console.error(e));
      setSession(updatedSession);

      const currentPhraseObj = phrases[currentPhraseIndex];
      const nextPhraseObj = phrases[nextPhraseIndex];

      const currentBlockId = currentPhraseObj.blockId;
      const nextBlockId = nextPhraseObj.blockId;

      const isCurrentVideo = typeof currentPhraseObj.videoSrc === 'string' && currentPhraseObj.videoSrc.trim().length > 0;
      const isNextVideo = typeof nextPhraseObj.videoSrc === 'string' && nextPhraseObj.videoSrc.trim().length > 0;

      setCurrentPhraseIndex(nextPhraseIndex);

      const isBlockChange = currentBlockId !== nextBlockId;
      const shouldShowTutorial = (isBlockChange && !isNextVideo) || (isCurrentVideo && !isNextVideo && !isBlockChange);

      if (shouldShowTutorial) {
        const tutorial = getBlockTutorial(nextBlockId, blocks);
        setBlockTutorialContent(tutorial);
        setIsTutorialAudioFinished(false);
        setIsTutorialAudioMuted(false);
        setTutorialAudioRemaining(null);
        setIsEntendiEarlyEnabled(false);
        setShowBlockTutorialModal(true);
      } else {
        setTimeout(() => {
            setIsUIPaused(false);
            if (isNextVideo) {
              if (videoRef.current) videoRef.current.play().catch(e => console.error(e));
            } else {
              startRecording();
            }
        }, 500); 
      }
    } catch (error) {
        console.error("Erro ao avançar:", error);
    } finally {
        setIsProcessing(false);
      }
  }, [session, orchestrator, currentPhraseIndex, phrases, stopRecording, resetRecordingState, blocks, startRecording]);
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
        !is_room_tone ? phrases[currentPhraseIndex].id : undefined,
        !is_room_tone ? phrases[currentPhraseIndex].text : undefined,
        room_tone_type
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
    if (isRecording && timer >= MAX_RECORDING_SECONDS && preRecordingStep === 'recording') {
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
  
  const handleNextPhrase = useCallback(() => processPhraseChange(false), [processPhraseChange]);
  
  const handleSkipPhrase = useCallback(() => {
    if (!session || !orchestrator) return;
    
    setIsUIPaused(true);
    stopRecording(true);
    resetRecordingState();

    if (skipCount >= 2) {
      setSkipCount(0);
      advanceToNextPhrase();
    } else {
      setSkipCount(prev => prev + 1);
      const currentPhraseObj = phrases[currentPhraseIndex];
      // Tenta repor a frase com outra do MESMO bloco e do mesmo tamanho
      const replacement = orchestrator.getReplacementPhrase(currentPhraseObj.blockId, currentPhraseObj.audioSize);
      
      if (replacement) {
        const newPhrases = [...phrases];
        newPhrases[currentPhraseIndex] = replacement;
        setPhrases(newPhrases);
        
        setTimeout(() => {
          setIsUIPaused(false);
          startPhraseFlow(currentPhraseIndex);
        }, 500);
      } else {
        setSkipCount(0);
        advanceToNextPhrase();
      }
    }
  }, [session, orchestrator, skipCount, phrases, currentPhraseIndex, stopRecording, resetRecordingState, advanceToNextPhrase, startPhraseFlow]);

  const handleNextVideoPhrase = useCallback(() => {
    resetRecordingState();
    advanceToNextPhrase();
  }, [resetRecordingState, advanceToNextPhrase]);

  // Atalhos de Teclado para Produtividade
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar se o usuário estiver digitando em um campo de texto
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Se houver erro de upload, impedir atalhos para não ignorar o erro sem querer
      if (uploadError) return;

      if (event.key === 'Enter') {
        if (showBlockTutorialModal) {
          // No tutorial, o Enter funciona como o "Entendi"
          const isDisabled = !!blockTutorialContent.audioUrl && !isTutorialAudioFinished && !isEntendiEarlyEnabled;
          if (!isDisabled) handleTutorialModalClose();
        } else if (isTutorialActive) {
          // No tutorial do sistema (tooltips), o Enter vai para o próximo passo
          handleNextTutorialStep();
        } else if (isVideoPhrase(currentPhraseIndex)) {
          // No vídeo, o Enter avança se o vídeo terminou
          if (videoFinished && !isProcessing) handleNextVideoPhrase();
        } else {
          // Na gravação normal, o Enter salva e pula
          if (isRecording && !isProcessing && countdown === null) handleNextPhrase();
        }
      } else if (event.key === 'ArrowRight') {
        // Seta para direita pula a frase (apenas se não for vídeo e não estiver processando)
        if (!showBlockTutorialModal && !isTutorialActive && !isVideoPhrase(currentPhraseIndex) && !isProcessing && countdown === null) {
          handleSkipPhrase();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isRecording, isProcessing, countdown, currentPhraseIndex, isVideoPhrase, 
    videoFinished, handleNextPhrase, handleSkipPhrase, handleNextVideoPhrase,
    uploadError, showBlockTutorialModal, isTutorialActive, handleNextTutorialStep,
    handleTutorialModalClose, blockTutorialContent, isTutorialAudioFinished, isEntendiEarlyEnabled
  ]);

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

  const handlePauseSession = () => {
    stopRecording(true);
    resetRecordingState();
    setIsPauseModalOpen(true);
  };

  const confirmPauseSession = () => {
    setIsPauseModalOpen(false);
    navigate('/');
  };

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

  const progress = orchestrator ? orchestrator.getProgress(currentPhraseIndex) : { total: 0, recorded: 0, percentage: 0 };
  const totalPhrases = progress.total;
  const currentPhraseNum = currentPhraseIndex + 1;
  const progressValue = progress.percentage;
  const currentPhrase = phrases[currentPhraseIndex];
  const formatTime = (time: number) => `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
  const formatTotalTime = (time: number) => {
    const totalSeconds = Math.round(time);
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
  };
  const getDbfsColor = (dbfs: number) => {
    // Threshold ajustado para -35dB para ignorar ruído estático de microfones mutados
    if (!Number.isFinite(dbfs) || dbfs <= -35) return '#666'; // Silêncio / Cinza
    if (dbfs > -12) return '#f44336'; // Muito Barulho / Vermelho
    if (dbfs > -25) return '#ffeb3b'; // Barulho Médio / Amarelo
    return '#4caf50'; // Pouco Barulho (Fala) / Verde
  };
  
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
    
    // Warm up the mic for immediate waveform display
    startMicWarmup();

    if (currentPhraseIndex === 0) {
      setIsUIPaused(true); // Pausa a nova tela para mostrar o tutorial
      setTutorialStep(0);
    }
  };

  const handleRoomToneRecordingComplete = (blob: Blob) => {
    handleRoomToneUpload(blob);
  };
  
  const getPackageName = (pkg: string | null) => {
    switch (pkg) {
      case '10M': return '10 minutos';
      case '30M': return '30 minutos';
      case '1H': return '1 hora';
      default: return '';
    }
  };

  if (isLoading && !showExistingSessionModal) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  if (error) {
    return (
      <Container sx={{ textAlign: 'center', mt: 10 }}>
        <Typography variant="h5" color="error">{error}</Typography>
        <Button component={Link} to="/" variant="outlined" color="error" sx={{ mt: 2 }}>
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
            <Button onClick={() => navigate('/')} variant="outlined" color="error">
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

      <Modal open={showPackageModal && !showExistingSessionModal}>
        <Box sx={{ ...modalStyle, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>Escolha o tamanho do pacote</Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            O tamanho define quantas frases você irá gravar nesta sessão.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button variant="contained" onClick={() => { setSelectedPackage('10M'); setShowPackageModal(false); }}>
              10 minutos (~20 frases)
            </Button>
            <Button variant="contained" onClick={() => { setSelectedPackage('30M'); setShowPackageModal(false); }}>
              30 minutos (~30 frases)
            </Button>
            <Button variant="contained" onClick={() => { setSelectedPackage('1H'); setShowPackageModal(false); }}>
              1 hora (~50 frases)
            </Button>
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
            <Button onClick={() => setIsCancelModalOpen(false)} variant="outlined" color="error">Não, Voltar</Button>
            <Button onClick={confirmCancelSession} color="error" variant="contained">Sim, Cancelar</Button>
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
                Gravação de Fala ({datasetId ? findByFrontendId(parseInt(datasetId, 10))?.name : ''}{selectedPackage ? ` - ${getPackageName(selectedPackage)}` : ''})
            </Typography>

            {phrases.length > 0 && currentPhrase ? (
              <Paper elevation={3} sx={{ p: 4 }}>
                <Box sx={{ width: '100%', mb: 2 }}>
                  <LinearProgress variant="determinate" value={progressValue} />
                  <Box display="flex" justifyContent="space-between" mt={1}>
                    <Typography variant="body2" color="text.secondary">{`${currentPhraseNum} de ${totalPhrases} frases`}</Typography>
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
                      {(isRecording || isUIPaused) && isFinite(dbfs) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
                          <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary', fontWeight: 'bold' }}>MIC</Typography>
                          <Box sx={{ 
                            width: 24, 
                            height: 16, 
                            bgcolor: getDbfsColor(dbfs), 
                            borderRadius: 1, 
                            border: '1px solid #555',
                            transition: 'background-color 0.2s',
                            boxShadow: dbfs > -35 ? `0 0 8px ${getDbfsColor(dbfs)}` : 'none'
                          }} />
                        </Box>
                      )}
                      <Typography ref={timerElementRef} variant="h6" sx={{ mr: 2 }}>{formatTime(timer)}</Typography>
                      <IconButton ref={muteRef} onClick={() => setIsTutorialAudioMuted(!isTutorialAudioMuted)} color={isTutorialAudioMuted ? "error" : "primary"}>
                        {isTutorialAudioMuted ? <HeadsetOffIcon /> : <HeadsetIcon />}
                      </IconButton>
                    </Box>

                    <Box sx={{ height: 100, backgroundColor: '#1e1e1e', mb: 2, borderRadius: 1 }}>
                      <canvas ref={canvasRef} width="600" height="100" style={{ width: '100%', height: '100%' }} />
                    </Box>

                    {getBlockTutorial(currentPhrase.blockId, blocks)?.instruction && (
                      <Typography 
                        variant="h6" 
                        color="primary" 
                        textAlign="center" 
                        sx={{ 
                          fontWeight: 'bold', 
                          mb: 1,
                          fontSize: `${Math.max(14, phraseFontSize * 0.6)}px`, // Escala proporcionalmente (60% do tamanho da frase)
                          transition: 'all 0.3s ease',
                          backgroundColor: isHighContrast ? '#000000' : 'transparent',
                          color: isHighContrast ? '#FFFF00' : 'primary.main',
                          display: 'inline-block',
                          width: '100%',
                          p: isHighContrast ? 1 : 0,
                          borderRadius: 1
                        }}
                      >
                        {getBlockTutorial(currentPhrase.blockId, blocks).instruction}
                      </Typography>
                    )}

                    <Box display="flex" justifyContent="flex-end" mb={1} gap={1}>
                      <IconButton ref={dyslexicRef} onClick={() => setIsDyslexicFont(!isDyslexicFont)} color={isDyslexicFont ? "primary" : "default"} title="Fonte para Dislexia">
                        <FontDownloadIcon />
                      </IconButton>
                      <IconButton ref={contrastRef} onClick={() => setIsHighContrast(!isHighContrast)} color={isHighContrast ? "primary" : "default"} title="Alto Contraste">
                        <ContrastIcon />
                      </IconButton>
                      <Button 
                        ref={fontSizeRef}
                        size="small" 
                        variant="outlined" 
                        onClick={() => setPhraseFontSize(prev => Math.max(16, prev - 4))} 
                        sx={{ minWidth: '40px', padding: '4px' }}
                      >
                        A-
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={() => setPhraseFontSize(prev => Math.min(72, prev + 4))} 
                        sx={{ minWidth: '40px', padding: '4px' }}
                      >
                        A+
                      </Button>
                    </Box>

                    <Typography 
                      ref={phraseTextRef} 
                      variant="h4" 
                      sx={{ 
                        fontSize: `${phraseFontSize}px`,
                        fontFamily: isDyslexicFont ? '"Comic Sans MS", "Comic Sans", cursive, sans-serif' : 'inherit',
                        letterSpacing: isDyslexicFont ? '1px' : 'normal',
                        wordSpacing: isDyslexicFont ? '2px' : 'normal',
                        minHeight: 100, 
                        textAlign: 'center', 
                        my: 2, 
                        p: 2,
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        lineHeight: 1.2,
                        backgroundColor: isHighContrast ? '#000000' : 'transparent',
                        color: isHighContrast ? '#FFFF00' : 'inherit',
                        borderRadius: 1,
                        transition: 'all 0.3s ease'
                      }}
                    >
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

            <Box mt={2} display="flex" justifyContent="center" gap={2}>
                <Button component={Link} to="/" variant="outlined" color="error">Voltar</Button>
                <Button ref={pauseRef} variant="outlined" color="primary" onClick={handlePauseSession}>Pausar Sessão</Button>
                <Button variant="outlined" color="error" onClick={() => setIsCancelModalOpen(true)}>Cancelar Sessão</Button>
            </Box>
          </Box>
        </>
      )}
      <Modal open={isPauseModalOpen} onClose={() => setIsPauseModalOpen(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" color="primary">Progresso Salvo com Sucesso!</Typography>
          <Typography sx={{ mt: 2 }}>
            Sua sessão foi pausada. Você pode fechar esta aba e voltar amanhã que continuará exatamente da frase atual.
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button onClick={confirmPauseSession} variant="contained" color="primary">Entendi, ir para a Home</Button>
          </Box>
        </Box>
      </Modal>
      <Modal open={countdown !== null && !uploadError} disableAutoFocus disableEnforceFocus sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ outline: 'none', textAlign: 'center' }}>
          {countdown === 0 && isProcessing ? (
            <Box display="flex" flexDirection="column" alignItems="center" sx={{ bgcolor: 'rgba(0,0,0,0.7)', p: 4, borderRadius: 4 }}>
              <CircularProgress size={60} sx={{ mb: 2, color: 'white' }} />
              <Typography variant="h5" color="white">Aguardando envio do áudio...</Typography>
            </Box>
          ) : (
            <Typography 
              variant="h1" 
              sx={{ 
                color: '#ffffff', 
                fontSize: '12rem', 
                fontWeight: 900,
                textShadow: '0px 0px 20px rgba(0,0,0,0.8), 2px 4px 10px rgba(0,0,0,0.5)',
                animation: 'popIn 1s ease-out infinite'
              }}
            >
              {countdown}
            </Typography>
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
          <Button component={Link} to="/" variant="outlined" color="error" sx={{ mt: 2 }}>Voltar para Home</Button>
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
        <Box sx={{ ...modalStyle, p: 0, overflow: 'hidden', borderRadius: 2 }}>
          <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 2, display: 'flex', alignItems: 'center' }}>
            <InfoOutlinedIcon sx={{ mr: 1 }} />
            <Typography variant="h6">{blockTutorialContent.title}</Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <Typography sx={{ mt: 1, fontSize: '1.1rem' }}>{blockTutorialContent.description}</Typography>
            {isTutorialAudioMuted && blockTutorialContent.audioUrl && (
              <Typography sx={{ mt: 2, color: 'error.main', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }} onClick={() => setIsTutorialAudioMuted(false)}>
                O áudio do narrador está mutado. Clique aqui para desmutar.
              </Typography>
            )}
            {tutorialAudioRemaining !== null && tutorialAudioRemaining > 0 && !isTutorialAudioFinished && blockTutorialContent.title.toLowerCase().includes('emoção') && (
              <Typography variant="body2" color="primary" sx={{ mt: 2, fontWeight: 'bold' }}>
                A narração termina em {tutorialAudioRemaining} segundo(s)...
              </Typography>
            )}
            {blockTutorialContent.audioUrl && (
              <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.default', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Button onClick={() => setIsTutorialAudioMuted(!isTutorialAudioMuted)} variant="outlined" size="small" color={isTutorialAudioMuted ? "error" : "primary"} startIcon={isTutorialAudioMuted ? <HeadsetOffIcon /> : <HeadsetIcon />}>
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
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                onClick={handleTutorialModalClose} 
                variant="contained"
                size="large"
                disabled={!!blockTutorialContent.audioUrl && !isTutorialAudioFinished && !isEntendiEarlyEnabled}
              >
                Entendi
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>

      <Modal open={showTimeoutModal}>
        <Box sx={{ ...modalStyle, p: 0, overflow: 'hidden', borderRadius: 2 }}>
          <Box sx={{ bgcolor: 'warning.main', color: 'warning.contrastText', p: 2, display: 'flex', alignItems: 'center' }}>
            <TimerOffOutlinedIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Tempo Limite Excedido</Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <Typography sx={{ mt: 1, fontSize: '1.1rem' }}>
              Você chegou ao limite de 1 minuto e 30 segundos nesta frase. O áudio será descartado para evitar falhas no envio.
            </Typography>
            <Typography sx={{ mt: 2, fontWeight: 'bold' }}>
              Por favor, tente gravar novamente de forma mais concisa.
            </Typography>
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Button onClick={handleTimeoutModalClose} variant="contained" color="primary" size="large">
                Entendi
              </Button>
            </Box>
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
