import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  LinearProgress,
  MenuItem,
  Modal,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { Link, useNavigate } from 'react-router-dom';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import AudioVisualizer from '../components/AudioVisualizer';
import { api, MusicDetails, MusicListItem, MusicUpsertPayload, SessionResponse } from '../services/api';

type PhraseCategory = 'neutral' | 'emotional' | 'lyric';
type MonitorMode = 'none' | 'vocal' | 'instrumental';

interface PhraseSetOption {
  key: string;
  label: string;
  helperText: string;
  phrases: string[];
  perEmotionCount?: number;
}

interface EmotionPhraseGroup {
  key: string;
  label: string;
  phrases: string[];
}

interface SetupFormState {
  selectedMusicIds: number[];
  includeNeutral: boolean;
  neutralSetKey: string;
  includeEmotional: boolean;
  emotionalSetKey: string;
  includeLyricPrompts: boolean;
}

interface MusicFormState {
  id: number | null;
  nome: string;
  genero: string;
  texto: string;
  bpm: string;
  timeSignature: string;
  vocalAudioFile: File | null;
  instrumentalAudioFile: File | null;
}

type CountInOption = 0 | 1 | 2;

interface MetronomeConfig {
  enabled: boolean;
  bpm: string;
  timeSignature: string;
  countInBars: CountInOption;
  volume: number;
}

interface SessionStepBase {
  id: string;
  order: number;
  blockId: number;
  musicId?: number;
  musicName?: string;
}

interface PhraseStep extends SessionStepBase {
  type: 'phrase';
  category: PhraseCategory;
  title: string;
  prompt: string;
  helperText: string;
}

interface ListenStep extends SessionStepBase {
  type: 'listen';
  title: string;
  description: string;
}

interface RecordStep extends SessionStepBase {
  type: 'record';
  title: string;
  description: string;
}

type SessionStep = PhraseStep | ListenStep | RecordStep;

interface BlockMeta {
  blockId: number;
  name: string;
  emocao: number;
  isSpontaneous: boolean;
}

interface DatasetPhraseRow {
  text: string;
  blockId: number;
  audioSize: string;
}

type DraftStep =
  | Omit<PhraseStep, 'order' | 'blockId'>
  | Omit<ListenStep, 'order' | 'blockId'>
  | Omit<RecordStep, 'order' | 'blockId'>;

const MUSIC_DATASET_ID = 1;
const INITIAL_PHRASE_COUNT = 3;
const LYRIC_PHRASE_COUNT = 3;

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 520,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const createInitialSetup = (): SetupFormState => ({
  selectedMusicIds: [],
  includeNeutral: false,
  neutralSetKey: '',
  includeEmotional: false,
  emotionalSetKey: '',
  includeLyricPrompts: false,
});

const createEmptyMusicForm = (): MusicFormState => ({
  id: null,
  nome: '',
  genero: '',
  texto: '',
  bpm: '',
  timeSignature: '',
  vocalAudioFile: null,
  instrumentalAudioFile: null,
});

const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferOut = new ArrayBuffer(length);
  const view = new DataView(bufferOut);
  const channels: Float32Array[] = [];
  let pos = 0;
  let offset = 0;

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);

  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);

  setUint32(0x61746164);
  setUint32(length - pos - 4);

  for (let index = 0; index < buffer.numberOfChannels; index += 1) {
    channels.push(buffer.getChannelData(index));
  }

  while (pos < length) {
    for (let index = 0; index < numOfChan; index += 1) {
      let sample = Math.max(-1, Math.min(1, channels[index][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset += 1;
  }

  return new Blob([bufferOut], { type: 'audio/wav' });
};

const parseCsvLine = (line: string): string[] => {
  const matches = line.match(/(?<=,|^)(?:"[^"]*"|[^,]*)/g) || [];
  return matches.map(field => field.replace(/^"|"$/g, '').replace(/""/g, '"'));
};

const uniquePhrases = (items: string[]): string[] => {
  const seen = new Set<string>();

  return items.reduce<string[]>((accumulator, item) => {
    const normalized = item.trim();
    if (!normalized) return accumulator;
    if (seen.has(normalized)) return accumulator;
    seen.add(normalized);
    accumulator.push(normalized);
    return accumulator;
  }, []);
};

const shuffleItems = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
};

const samplePhrases = (items: string[], amount: number): string[] => {
  const normalized = uniquePhrases(items);
  if (normalized.length <= amount) return normalized;
  return shuffleItems(normalized).slice(0, amount);
};

const normalizeBlockName = (name: string): string => {
  return name
    .replace(/^Bloco de /i, '')
    .replace(/^bloco de /i, '')
    .trim();
};

const splitMusicTextIntoPrompts = (text?: string | null): string[] => {
  if (!text) return [];

  const trimmed = text.trim();
  if (!trimmed) return [];

  const byLine = trimmed
    .replace(/\r/g, '\n')
    .split(/\n+/g)
    .map(item => item.trim())
    .filter(Boolean);

  if (byLine.length > 1) {
    return uniquePhrases(byLine);
  }

  const bySentence = trimmed
    .split(/(?<=[.!?])\s+/g)
    .map(item => item.trim())
    .filter(Boolean);

  if (bySentence.length > 1) {
    return uniquePhrases(bySentence);
  }

  return [trimmed];
};

const formatClock = (seconds: number): string => {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
};

const getDisplayTimeSignature = (value?: string | null): string => {
  const normalized = value?.trim();
  return normalized || '4/4';
};

const parseTimeSignature = (value?: string | null): { numerator: number; denominator: number } => {
  const normalized = getDisplayTimeSignature(value);
  const [numeratorText, denominatorText] = normalized.split('/');
  const numerator = Number(numeratorText);
  const denominator = Number(denominatorText);

  if (!Number.isFinite(numerator) || numerator <= 0 || !Number.isFinite(denominator) || denominator <= 0) {
    return { numerator: 4, denominator: 4 };
  }

  return { numerator, denominator };
};

const formatBpmLabel = (bpm?: number | null): string => {
  if (!bpm || bpm <= 0) {
    return 'BPM não informado';
  }

  return `${bpm} BPM`;
};

const createInitialMetronomeConfig = (music: MusicDetails | null): MetronomeConfig => ({
  enabled: false,
  bpm: music?.bpm ? String(music.bpm) : '',
  timeSignature: getDisplayTimeSignature(music?.time_signature),
  countInBars: 1,
  volume: 35,
});

const describeStep = (step: SessionStep): string => {
  if (step.type === 'listen') {
    return `Ouça a versão original de ${step.musicName || 'esta música'} antes de gravar.`;
  }

  if (step.type === 'record') {
    return `Configure retorno e metrônomo, depois grave ${step.musicName || 'a música'}.`;
  }

  if (step.category === 'lyric') {
    return `Leia esta frase da letra antes de cantar ${step.musicName || 'a próxima música'}.`;
  }

  if (step.category === 'emotional') {
    return 'Leia esta frase com a emoção configurada para a sessão.';
  }

  return 'Leia esta frase neutra antes de começar as músicas.';
};

const getDefaultMonitorMode = (musicDetail: MusicDetails | null): MonitorMode => {
  if (!musicDetail) return 'none';
  if (musicDetail.instrumental_audio_url) return 'instrumental';
  if (musicDetail.vocal_audio_url) return 'vocal';
  return 'none';
};

const MusicSessionPage: React.FC = () => {
  const navigate = useNavigate();

  const [setup, setSetup] = useState<SetupFormState>(() => createInitialSetup());
  const [musics, setMusics] = useState<MusicListItem[]>([]);
  const [musicDetails, setMusicDetails] = useState<Record<number, MusicDetails>>({});
  const [neutralOptions, setNeutralOptions] = useState<PhraseSetOption[]>([]);
  const [emotionalOptions, setEmotionalOptions] = useState<PhraseSetOption[]>([]);
  const [emotionPhraseGroups, setEmotionPhraseGroups] = useState<EmotionPhraseGroup[]>([]);
  const [steps, setSteps] = useState<SessionStep[]>([]);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [existingSessionInfo, setExistingSessionInfo] = useState<SessionResponse | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoadingSetupData, setIsLoadingSetupData] = useState(true);
  const [isPreparingSession, setIsPreparingSession] = useState(false);
  const [isSubmittingMusicForm, setIsSubmittingMusicForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [stepAudioError, setStepAudioError] = useState<string | null>(null);
  const [musicFormError, setMusicFormError] = useState<string | null>(null);
  const [showExistingSessionModal, setShowExistingSessionModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showMusicFormModal, setShowMusicFormModal] = useState(false);
  const [isLoadingCurrentMusic, setIsLoadingCurrentMusic] = useState(false);
  const [previewVisibleIds, setPreviewVisibleIds] = useState<number[]>([]);
  const [previewLoadingIds, setPreviewLoadingIds] = useState<number[]>([]);
  const [musicForm, setMusicForm] = useState<MusicFormState>(() => createEmptyMusicForm());
  const [monitorMode, setMonitorMode] = useState<MonitorMode>('none');
  const [metronomeConfig, setMetronomeConfig] = useState<MetronomeConfig>(() => createInitialMetronomeConfig(null));
  const [voiceMonitoring, setVoiceMonitoring] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);
  const [stepCountdown, setStepCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isMicPaused, setIsMicPaused] = useState(false);
  const [hasStartedCurrentTake, setHasStartedCurrentTake] = useState(false);
  const [timer, setTimer] = useState(0);
  const [dbfs, setDbfs] = useState(-100);
  const [phraseFontSize, setPhraseFontSize] = useState(34);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const voiceMonitorAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const musicProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const metronomeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const metronomeAudioContextRef = useRef<AudioContext | null>(null);
  const metronomeBeatRef = useRef(0);
  const loadedAudioUrlRef = useRef<string | null>(null);
  const pendingStepsRef = useRef<SessionStep[]>([]);
  const musicDetailsRef = useRef<Record<number, MusicDetails>>({});

  const currentStep = steps[currentStepIndex] || null;
  const isSessionStarted = steps.length > 0 && !!session;
  const isLastStep = steps.length > 0 && currentStepIndex === steps.length - 1;
  const canUseVoiceMonitoring = currentStep?.type === 'record';

  const selectedMusicMap = useMemo(() => {
    return setup.selectedMusicIds.reduce<Record<number, number>>((accumulator, musicId, index) => {
      accumulator[musicId] = index + 1;
      return accumulator;
    }, {});
  }, [setup.selectedMusicIds]);

  const currentMusicDetail = useMemo(() => {
    if (!currentStep?.musicId) return null;
    return musicDetails[currentStep.musicId] || null;
  }, [currentStep?.musicId, musicDetails]);

  const selectedMonitorUrl = useMemo(() => {
    if (!currentMusicDetail) return null;
    if (monitorMode === 'vocal') return currentMusicDetail.vocal_audio_url;
    if (monitorMode === 'instrumental') return currentMusicDetail.instrumental_audio_url;
    return null;
  }, [currentMusicDetail, monitorMode]);

  const currentTimeSignatureLabel = useMemo(() => {
    return getDisplayTimeSignature(currentMusicDetail?.time_signature);
  }, [currentMusicDetail?.time_signature]);

  const selectedNeutralOption = useMemo(() => {
    return neutralOptions.find(option => option.key === setup.neutralSetKey) || null;
  }, [neutralOptions, setup.neutralSetKey]);

  const selectedEmotionalOption = useMemo(() => {
    return emotionalOptions.find(option => option.key === setup.emotionalSetKey) || null;
  }, [emotionalOptions, setup.emotionalSetKey]);

  const selectedMusicSummaries = useMemo(() => {
    return setup.selectedMusicIds
      .map(musicId => musics.find(item => item.id === musicId))
      .filter((item): item is MusicListItem => !!item);
  }, [musics, setup.selectedMusicIds]);

  useEffect(() => {
    musicDetailsRef.current = musicDetails;
  }, [musicDetails]);

  const stopMusicProgressTracking = useCallback(() => {
    if (musicProgressIntervalRef.current) {
      clearInterval(musicProgressIntervalRef.current);
      musicProgressIntervalRef.current = null;
    }
  }, []);

  const clearStepCountdown = useCallback(() => {
    if (stepCountdownIntervalRef.current) {
      clearInterval(stepCountdownIntervalRef.current);
      stepCountdownIntervalRef.current = null;
    }
    setStepCountdown(null);
  }, []);

  const beginStepCountdown = useCallback((onComplete: () => void | Promise<void>) => {
    clearStepCountdown();
    setStepCountdown(3);

    let remaining = 3;
    stepCountdownIntervalRef.current = setInterval(() => {
      remaining -= 1;

      if (remaining > 0) {
        setStepCountdown(remaining);
        return;
      }

      clearStepCountdown();
      void Promise.resolve(onComplete());
    }, 1000);
  }, [clearStepCountdown]);

  const stopMetronome = useCallback(() => {
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
    metronomeBeatRef.current = 0;
  }, []);

  const ensureMetronomeAudioContext = useCallback(async (): Promise<AudioContext> => {
    const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextConstructor) {
      throw new Error('AudioContext não suportado neste navegador.');
    }

    if (!metronomeAudioContextRef.current) {
      metronomeAudioContextRef.current = new AudioContextConstructor();
    }

    if (metronomeAudioContextRef.current.state === 'suspended') {
      await metronomeAudioContextRef.current.resume();
    }

    return metronomeAudioContextRef.current;
  }, []);

  const playMetronomeClick = useCallback(async (isAccent: boolean, volumePercent: number) => {
    const context = await ensureMetronomeAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'square';
    oscillator.frequency.value = isAccent ? 1568 : 988;
    gainNode.gain.setValueAtTime((Math.max(0, Math.min(100, volumePercent)) / 100) * (isAccent ? 0.28 : 0.18), now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  }, [ensureMetronomeAudioContext]);

  const startMetronomeLoop = useCallback(async (bpm: number, timeSignature: string, volume: number) => {
    stopMetronome();

    const { numerator, denominator } = parseTimeSignature(timeSignature);
    const beatDurationMs = (60 / bpm) * (4 / denominator) * 1000;

    metronomeBeatRef.current = 0;
    await playMetronomeClick(true, volume);
    metronomeBeatRef.current = 1;

    metronomeIntervalRef.current = setInterval(() => {
      const isAccent = metronomeBeatRef.current % numerator === 0;
      void playMetronomeClick(isAccent, volume);
      metronomeBeatRef.current = (metronomeBeatRef.current + 1) % numerator;
    }, beatDurationMs);
  }, [playMetronomeClick, stopMetronome]);

  const beginMetronomeCountIn = useCallback(async (
    bpm: number,
    timeSignature: string,
    bars: CountInOption,
    volume: number,
    onComplete: () => void | Promise<void>,
  ) => {
    stopMetronome();
    clearStepCountdown();

    const { numerator, denominator } = parseTimeSignature(timeSignature);
    const totalBeats = numerator * bars;
    const beatDurationMs = (60 / bpm) * (4 / denominator) * 1000;

    if (totalBeats <= 0) {
      await Promise.resolve(onComplete());
      return;
    }

    let currentBeat = 0;
    setStepCountdown(totalBeats);
    await playMetronomeClick(true, volume);
    currentBeat += 1;
    setStepCountdown(Math.max(totalBeats - currentBeat, 0));

    metronomeIntervalRef.current = setInterval(() => {
      const isAccent = currentBeat % numerator === 0;
      void playMetronomeClick(isAccent, volume);
      currentBeat += 1;
      const remainingBeats = Math.max(totalBeats - currentBeat, 0);
      setStepCountdown(remainingBeats > 0 ? remainingBeats : null);

      if (currentBeat >= totalBeats) {
        stopMetronome();
        setStepCountdown(null);
        void Promise.resolve(onComplete());
      }
    }, beatDurationMs);
  }, [clearStepCountdown, playMetronomeClick, stopMetronome]);

  const cleanupLiveIndicators = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (stepCountdownIntervalRef.current) {
      clearInterval(stepCountdownIntervalRef.current);
      stepCountdownIntervalRef.current = null;
    }

    setIsRecording(false);
    setIsMicPaused(false);
    setDbfs(-100);
    setStepCountdown(null);
  }, []);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (error) {
        void error;
      }
      sourceRef.current = null;
    }

    if (voiceMonitorAudioRef.current) {
      voiceMonitorAudioRef.current.pause();
      voiceMonitorAudioRef.current.srcObject = null;
    }
  }, []);

  const resetTakeState = useCallback(() => {
    cleanupLiveIndicators();
    setTimer(0);
    setHasStartedCurrentTake(false);
  }, [cleanupLiveIndicators]);

  const stopMusicPlayback = useCallback((clearSource = false) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    if (clearSource) {
      audio.removeAttribute('src');
      audio.load();
      loadedAudioUrlRef.current = null;
      setMusicProgress(0);
    }

    stopMusicProgressTracking();
    setIsMusicPlaying(false);
  }, [stopMusicProgressTracking]);

  const updateMusicProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) {
      setMusicProgress(0);
      return;
    }

    setMusicProgress((audio.currentTime / audio.duration) * 100);
  }, []);

  const startMusicProgressTracking = useCallback(() => {
    stopMusicProgressTracking();
    updateMusicProgress();

    musicProgressIntervalRef.current = setInterval(() => {
      updateMusicProgress();
    }, 200);
  }, [stopMusicProgressTracking, updateMusicProgress]);

  const loadAudioSource = useCallback((url: string | null, restart = false) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!url) {
      stopMusicPlayback(true);
      return;
    }

    const shouldReload = loadedAudioUrlRef.current !== url || restart;
    if (shouldReload) {
      audio.pause();
      audio.src = url;
      audio.load();
      loadedAudioUrlRef.current = url;
    }

    if (restart) {
      audio.currentTime = 0;
      setMusicProgress(0);
    }
  }, [stopMusicPlayback]);

  const playAudioUrl = useCallback(async (url: string | null, restart = false) => {
    if (!url) return;

    const audio = audioRef.current;
    if (!audio) return;

    loadAudioSource(url, restart);

    try {
      await audio.play();
      setIsMusicPlaying(true);
      startMusicProgressTracking();
    } catch (error) {
      console.warn('Não foi possível iniciar o áudio da música:', error);
      setStepAudioError('Não foi possível tocar este áudio agora. Tente novamente.');
    }
  }, [loadAudioSource, startMusicProgressTracking]);

  const drawMicWave = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteTimeDomainData(dataArray);

      let sumSquares = 0;
      for (let index = 0; index < dataArray.length; index += 1) {
        const amplitude = (dataArray[index] / 128) - 1;
        sumSquares += amplitude * amplitude;
      }

      const rms = Math.sqrt(sumSquares / dataArray.length);
      const db = 20 * Math.log10(rms);
      setDbfs(Number.isFinite(db) ? db : -100);

      canvasContext.fillStyle = '#1e1e1e';
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);
      canvasContext.lineWidth = 2;
      canvasContext.strokeStyle = '#61dafb';
      canvasContext.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let index = 0; index < bufferLength; index += 1) {
        const v = dataArray[index] / 128;
        const y = (v * canvas.height) / 2;
        if (index === 0) {
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }
        x += sliceWidth;
      }

      canvasContext.lineTo(canvas.width, canvas.height / 2);
      canvasContext.stroke();
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  }, []);

  const ensureMicrophoneReady = useCallback(async () => {
    if (!streamRef.current || !streamRef.current.active) {
      const savedMicId = localStorage.getItem('selectedMicId');
      const audioConstraints = {
        ...(savedMicId ? { deviceId: { exact: savedMicId } } : {}),
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      };
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    }

    const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextConstructor) {
      throw new Error('AudioContext não suportado neste navegador.');
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
    }

    if (!sourceRef.current && streamRef.current) {
      sourceRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);
      sourceRef.current.connect(analyserRef.current);
    }
  }, []);

  const syncVoiceMonitorAudio = useCallback(async (shouldListen: boolean) => {
    const audio = voiceMonitorAudioRef.current;
    if (!audio) return;

    if (!shouldListen) {
      audio.pause();
      audio.muted = true;
      audio.srcObject = null;
      return;
    }

    if (!streamRef.current) {
      await ensureMicrophoneReady();
    }

    if (streamRef.current && audio.srcObject !== streamRef.current) {
      audio.srcObject = streamRef.current;
    }

    audio.muted = false;
    audio.volume = 1;

    try {
      await audio.play();
      setRuntimeError(null);
    } catch (error) {
      console.warn('Não foi possível ativar o retorno local da voz:', error);
      setRuntimeError('Não foi possível ativar o retorno local da voz neste navegador.');
    }
  }, [ensureMicrophoneReady]);

  const finalizeRecording = useCallback((cleanupAfter = true): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;

      const finish = (blob: Blob | null) => {
        mediaRecorderRef.current = null;
        cleanupLiveIndicators();
        if (cleanupAfter) {
          cleanupStream();
        }
        resolve(blob);
      };

      if (!recorder) {
        finish(null);
        return;
      }

      const buildBlob = () => {
        if (audioChunksRef.current.length === 0) {
          audioChunksRef.current = [];
          finish(null);
          return;
        }

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        finish(blob);
      };

      recorder.onstop = buildBlob;

      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          buildBlob();
        }
      } catch (error) {
        console.warn('Falha ao encerrar a gravação atual:', error);
        buildBlob();
      }
    });
  }, [cleanupLiveIndicators, cleanupStream]);

  const startRecording = useCallback(async () => {
    try {
      if (mediaRecorderRef.current) {
        await finalizeRecording(true);
      }

      await ensureMicrophoneReady();
      if (!streamRef.current) {
        throw new Error('Microfone indisponível.');
      }

      const recorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onpause = () => setIsMicPaused(true);
      recorder.onresume = () => setIsMicPaused(false);
      recorder.start();

      setHasStartedCurrentTake(true);
      setIsRecording(true);
      setIsMicPaused(false);
      setTimer(0);
      setRuntimeError(null);
      drawMicWave();
      if (canUseVoiceMonitoring && voiceMonitoring) {
        await syncVoiceMonitorAudio(true);
      }
    } catch (error) {
      console.error('Não foi possível iniciar a gravação:', error);
      setRuntimeError('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
      cleanupStream();
      cleanupLiveIndicators();
    }
  }, [canUseVoiceMonitoring, cleanupLiveIndicators, cleanupStream, drawMicWave, ensureMicrophoneReady, finalizeRecording, syncVoiceMonitorAudio, voiceMonitoring]);

  const getAudioDataAndMetadata = useCallback((audioBlob: Blob): Promise<{ duration: number; sampleRate: number; buffer: AudioBuffer }> => {
    return new Promise((resolve, reject) => {
      const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextConstructor();
      const fileReader = new FileReader();

      fileReader.onloadend = () => {
        const arrayBuffer = fileReader.result as ArrayBuffer;
        audioContext.decodeAudioData(
          arrayBuffer,
          (buffer) => resolve({ duration: buffer.duration, sampleRate: buffer.sampleRate, buffer }),
          reject,
        );
      };

      fileReader.onerror = reject;
      fileReader.readAsArrayBuffer(audioBlob);
    });
  }, []);

  const ensureMusicDetails = useCallback(async (musicId: number): Promise<MusicDetails> => {
    const cached = musicDetailsRef.current[musicId];
    if (cached) return cached;

    const detail = await api.getMusic(musicId);
    musicDetailsRef.current = {
      ...musicDetailsRef.current,
      [musicId]: detail,
    };
    setMusicDetails(prev => ({
      ...prev,
      [musicId]: detail,
    }));
    return detail;
  }, []);

  const refreshMusicList = useCallback(async () => {
    const musicList = await api.listMusics();
    setMusics(musicList);
    return musicList;
  }, []);

  const loadSetupData = useCallback(async () => {
    setIsLoadingSetupData(true);
    setSetupError(null);

    try {
      const [musicList, blockResponse, datasetResponse, presentationResponse] = await Promise.all([
        api.listMusics(),
        fetch(`${window.location.origin}/block.csv`),
        fetch(`${window.location.origin}/11_voz_geral_10m.csv`),
        fetch(`${window.location.origin}/apresentacao.csv`),
      ]);

      if (!blockResponse.ok || !datasetResponse.ok || !presentationResponse.ok) {
        throw new Error('Não foi possível carregar as referências locais de frases.');
      }

      const blockText = await blockResponse.text();
      const datasetText = await datasetResponse.text();
      const presentationText = await presentationResponse.text();

      const blockLines = blockText.trim().split('\n').slice(1);
      const blockMap = new Map<number, BlockMeta>();

      blockLines.forEach((line) => {
        const parts = line.split(',');
        const blockId = Number(parts[0]);
        const name = parts[1]?.replace(/"/g, '').trim() || `Bloco ${blockId}`;
        const emocao = Number(parts[2] || 0);
        const isSpontaneous = parts[3]?.trim() === '1';
        if (Number.isFinite(blockId)) {
          blockMap.set(blockId, { blockId, name, emocao, isSpontaneous });
        }
      });

      const datasetRows = datasetText
        .trim()
        .split('\n')
        .slice(1)
        .map((line) => {
          const [, text, blockId, , audioSize] = parseCsvLine(line);
          return {
            text,
            blockId: Number(blockId),
            audioSize: (audioSize || 'p').toLowerCase(),
          } as DatasetPhraseRow;
        })
        .filter(row => Number.isFinite(row.blockId) && row.text.trim().length > 0);

      const presentationRows = presentationText
        .trim()
        .split('\n')
        .slice(1)
        .map(line => parseCsvLine(line)[1] || '')
        .filter(Boolean);

      const neutralReadingRows = datasetRows.filter(row => row.blockId === 2);
      const buildNeutralOption = (key: string, label: string, helperText: string, rows: DatasetPhraseRow[]) => ({
        key,
        label,
        helperText,
        phrases: uniquePhrases(rows.map(row => row.text)),
      });

      const nextNeutralOptions = [
        buildNeutralOption(
          'neutral-mixed',
          'Leitura neutra variada',
          'Mistura frases curtas, médias e longas do bloco neutro.',
          neutralReadingRows,
        ),
        buildNeutralOption(
          'neutral-short',
          'Leitura neutra curta',
          'Usa apenas frases curtas do bloco neutro.',
          neutralReadingRows.filter(row => row.audioSize === 'p'),
        ),
        buildNeutralOption(
          'neutral-medium',
          'Leitura neutra média',
          'Usa apenas frases médias do bloco neutro.',
          neutralReadingRows.filter(row => row.audioSize === 'm'),
        ),
        buildNeutralOption(
          'neutral-long',
          'Leitura neutra longa',
          'Usa apenas frases longas do bloco neutro.',
          neutralReadingRows.filter(row => row.audioSize === 'g'),
        ),
        {
          key: 'neutral-presentation',
          label: 'Apresentação pessoal',
          helperText: 'Perguntas leves e neutras para aquecer a voz.',
          phrases: uniquePhrases(presentationRows),
        },
      ].filter(option => option.phrases.length > 0);

      const emotionalBlockIds = Array.from(
        new Set(
          datasetRows
            .filter(row => row.blockId !== 2)
            .map(row => row.blockId),
        ),
      );

      const nextEmotionPhraseGroups = emotionalBlockIds
        .map((blockId) => {
          const meta = blockMap.get(blockId);
          return {
            key: `emotion-${blockId}`,
            label: meta ? normalizeBlockName(meta.name) : `Emoção ${blockId}`,
            phrases: uniquePhrases(datasetRows.filter(row => row.blockId === blockId).map(row => row.text)),
          };
        })
        .filter(group => group.phrases.length > 0);

      const nextEmotionalOptions: PhraseSetOption[] = [
        {
          key: 'short',
          label: 'Curto',
          helperText: 'Usa 5 frases por emoção.',
          phrases: [],
          perEmotionCount: 5,
        },
        {
          key: 'medium',
          label: 'Médio',
          helperText: 'Usa 10 frases por emoção.',
          phrases: [],
          perEmotionCount: 10,
        },
      ];

      setMusics(musicList);
      setNeutralOptions(nextNeutralOptions);
      setEmotionalOptions(nextEmotionalOptions);
      setEmotionPhraseGroups(nextEmotionPhraseGroups);
    } catch (error) {
      console.error('Falha ao carregar a configuração da sessão de música:', error);
      setSetupError('Não foi possível carregar as músicas ou os conjuntos de frases.');
    } finally {
      setIsLoadingSetupData(false);
    }
  }, []);

  const buildSteps = useCallback(async (state: SetupFormState): Promise<SessionStep[]> => {
    const draftSteps: DraftStep[] = [];
    const selectedSongs = state.selectedMusicIds
      .map(musicId => musics.find(item => item.id === musicId))
      .filter((item): item is MusicListItem => !!item);

    if (state.includeNeutral) {
      const option = neutralOptions.find(item => item.key === state.neutralSetKey);
      if (option) {
        samplePhrases(option.phrases, INITIAL_PHRASE_COUNT).forEach((prompt, index) => {
          draftSteps.push({
            id: `neutral-${option.key}-${index}`,
            type: 'phrase',
            category: 'neutral',
            title: 'Frase neutra',
            prompt,
            helperText: option.label,
          });
        });
      }
    }

    if (state.includeEmotional) {
      const option = emotionalOptions.find(item => item.key === state.emotionalSetKey);
      if (option) {
        emotionPhraseGroups.forEach((group) => {
          samplePhrases(group.phrases, option.perEmotionCount || 5).forEach((prompt, index) => {
            draftSteps.push({
              id: `emotional-${group.key}-${index}`,
              type: 'phrase',
              category: 'emotional',
              title: `Frase emocional: ${group.label}`,
              prompt,
              helperText: `${group.label} (${option.label.toLowerCase()})`,
            });
          });
        });
      }
    }

    for (const music of selectedSongs) {
      let detail: MusicDetails | null = null;

      if (state.includeLyricPrompts) {
        try {
          detail = await ensureMusicDetails(music.id);
        } catch (error) {
          console.warn(`Falha ao carregar letra da música ${music.id}:`, error);
        }
      }

      if (state.includeLyricPrompts && detail?.texto) {
        samplePhrases(splitMusicTextIntoPrompts(detail.texto), LYRIC_PHRASE_COUNT).forEach((prompt, index) => {
          draftSteps.push({
            id: `lyric-${music.id}-${index}`,
            type: 'phrase',
            category: 'lyric',
            title: `Frase da música: ${music.nome}`,
            prompt,
            helperText: 'Gerada a partir da letra/transcrição da música.',
            musicId: music.id,
            musicName: music.nome,
          });
        });
      }

      draftSteps.push({
        id: `listen-${music.id}`,
        type: 'listen',
        title: `Ouvir música original: ${music.nome}`,
        description: 'Escute a música original quantas vezes quiser antes de gravar.',
        musicId: music.id,
        musicName: music.nome,
      });

      draftSteps.push({
        id: `record-${music.id}`,
        type: 'record',
        title: `Gravar música: ${music.nome}`,
        description: 'Escolha o retorno de áudio e grave sua interpretação.',
        musicId: music.id,
        musicName: music.nome,
      });
    }

    return draftSteps.map((step, index) => ({
      ...step,
      order: index + 1,
      blockId: index + 1,
    })) as SessionStep[];
  }, [emotionPhraseGroups, emotionalOptions, ensureMusicDetails, musics, neutralOptions]);

  const finishSession = useCallback(async () => {
    if (!session) return;

    setIsProcessing(true);
    try {
      stopMetronome();
      const updatedSession = await api.put(`/sessions/${session.id}`, {
        ...session,
        status: 'finished',
        finished_at: new Date().toISOString(),
      });
      setSession(updatedSession);
      setShowFinishModal(true);
    } catch (error) {
      console.error('Falha ao finalizar a sessão de música:', error);
      setRuntimeError('Não foi possível finalizar a sessão de música.');
    } finally {
      setIsProcessing(false);
    }
  }, [session, stopMetronome]);

  const advanceToNextStep = useCallback(async () => {
    if (isLastStep) {
      await finishSession();
      return;
    }

    setCurrentStepIndex(prev => prev + 1);
  }, [finishSession, isLastStep]);

  const uploadStepRecording = useCallback(async (step: PhraseStep | RecordStep, audioBlob: Blob) => {
    if (!session) return;

    const { duration, sampleRate, buffer } = await getAudioDataAndMetadata(audioBlob);
    const wavBlob = audioBufferToWav(buffer);
    const promptText = step.type === 'phrase'
      ? step.prompt
      : `Gravação da música ${step.musicName || ''}`.trim();
    const stepType = step.type === 'record' ? 'music' : 'spoken';

    await api.uploadRecording(
      session.id,
      session.dataset_id,
      step.blockId,
      wavBlob,
      duration,
      'wav',
      sampleRate,
      false,
      undefined,
      promptText,
      undefined,
      step.id,
      stepType,
      step.type === 'record' ? selectedMonitorUrl || undefined : undefined,
      promptText,
    );
  }, [getAudioDataAndMetadata, selectedMonitorUrl, session]);

  const handleSaveCurrentStep = useCallback(async () => {
    if (!currentStep) return;

    if (currentStep.type === 'listen') {
      stopMusicPlayback(false);
      await advanceToNextStep();
      return;
    }

    if (!hasStartedCurrentTake) {
      setRuntimeError('Inicie a gravação atual antes de continuar.');
      return;
    }

    setIsProcessing(true);
    setRuntimeError(null);

    try {
      const audioBlob = await finalizeRecording(true);
      stopMusicPlayback(true);
      stopMetronome();

      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Nenhum áudio foi capturado na etapa atual.');
      }

      await uploadStepRecording(currentStep, audioBlob);
      resetTakeState();
      await advanceToNextStep();
    } catch (error) {
      console.error('Falha ao salvar a etapa atual da sessão de música:', error);
      setRuntimeError('Não foi possível salvar a gravação atual. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  }, [advanceToNextStep, currentStep, finalizeRecording, hasStartedCurrentTake, resetTakeState, stopMetronome, stopMusicPlayback, uploadStepRecording]);

  const resolveMetronomeConfig = useCallback(() => {
    if (!metronomeConfig.enabled) {
      return null;
    }

    const bpm = Number(metronomeConfig.bpm);
    if (!Number.isFinite(bpm) || bpm <= 0) {
      throw new Error('Informe um BPM válido para usar o metrônomo.');
    }

    return {
      bpm,
      timeSignature: getDisplayTimeSignature(metronomeConfig.timeSignature),
      countInBars: metronomeConfig.countInBars,
      volume: metronomeConfig.volume,
    };
  }, [metronomeConfig]);

  const startCurrentRecordTake = useCallback(async (restartMusic = true, monitorUrlOverride?: string | null) => {
    const effectiveMonitorUrl = monitorUrlOverride !== undefined ? monitorUrlOverride : selectedMonitorUrl;
    const metronomeSession = resolveMetronomeConfig();

    const beginRecordingNow = async () => {
      await startRecording();

      if (effectiveMonitorUrl) {
        await playAudioUrl(effectiveMonitorUrl, restartMusic);
      } else {
        stopMusicPlayback(true);
      }

      if (metronomeSession) {
        await startMetronomeLoop(
          metronomeSession.bpm,
          metronomeSession.timeSignature,
          metronomeSession.volume,
        );
      }
    };

    if (metronomeSession && metronomeSession.countInBars > 0) {
      await beginMetronomeCountIn(
        metronomeSession.bpm,
        metronomeSession.timeSignature,
        metronomeSession.countInBars,
        metronomeSession.volume,
        beginRecordingNow,
      );
      return;
    }

    await beginRecordingNow();
  }, [
    beginMetronomeCountIn,
    playAudioUrl,
    resolveMetronomeConfig,
    selectedMonitorUrl,
    startMetronomeLoop,
    startRecording,
    stopMusicPlayback,
  ]);

  const queueCurrentRecordTake = useCallback((restartMusic = true) => {
    try {
      const metronomeSession = resolveMetronomeConfig();
      setRuntimeError(null);

      if (metronomeSession && metronomeSession.countInBars > 0) {
        void startCurrentRecordTake(restartMusic);
        return;
      }

      beginStepCountdown(() => startCurrentRecordTake(restartMusic));
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : 'Não foi possível iniciar a gravação.');
    }
  }, [beginStepCountdown, resolveMetronomeConfig, startCurrentRecordTake]);

  const handleToggleMainAction = useCallback(async () => {
    if (!currentStep) return;

    if (currentStep.type === 'listen') {
      const vocalUrl = currentMusicDetail?.vocal_audio_url || null;
      if (!vocalUrl) return;

      if (isMusicPlaying) {
        stopMusicPlayback(false);
      } else {
        await playAudioUrl(vocalUrl, false);
      }
      return;
    }

    if (currentStep.type === 'record') {
      const recorder = mediaRecorderRef.current;

      if (!hasStartedCurrentTake) {
        queueCurrentRecordTake(true);
        return;
      }

      if (recorder?.state === 'paused') {
        if (selectedMonitorUrl) {
          await playAudioUrl(selectedMonitorUrl, false);
        }
        const metronomeSession = resolveMetronomeConfig();
        if (metronomeSession) {
          await startMetronomeLoop(
            metronomeSession.bpm,
            metronomeSession.timeSignature,
            metronomeSession.volume,
          );
        }
        recorder.resume();
        setIsMicPaused(false);
        return;
      }

      if (recorder?.state === 'recording') {
        stopMusicPlayback(false);
        stopMetronome();
        recorder.pause();
        setIsMicPaused(true);
      }
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (!hasStartedCurrentTake) {
      await startRecording();
      return;
    }

    if (recorder?.state === 'paused') {
      recorder.resume();
      setIsMicPaused(false);
      return;
    }

    if (recorder?.state === 'recording') {
      recorder.pause();
      setIsMicPaused(true);
    }
  }, [currentMusicDetail?.vocal_audio_url, currentStep, hasStartedCurrentTake, isMusicPlaying, playAudioUrl, queueCurrentRecordTake, resolveMetronomeConfig, selectedMonitorUrl, startMetronomeLoop, startRecording, stopMetronome, stopMusicPlayback]);

  const handleRestartCurrentStep = useCallback(async () => {
    if (!currentStep) return;

    setRuntimeError(null);

    if (currentStep.type === 'listen') {
      const vocalUrl = currentMusicDetail?.vocal_audio_url || null;
      if (vocalUrl) {
        beginStepCountdown(() => playAudioUrl(vocalUrl, true));
      }
      return;
    }

    await finalizeRecording(true);
    resetTakeState();
    stopMusicPlayback(true);
    stopMetronome();

    if (currentStep.type === 'record') {
      queueCurrentRecordTake(true);
      return;
    }

    window.setTimeout(() => {
      void startRecording();
    }, 150);
  }, [beginStepCountdown, currentMusicDetail?.vocal_audio_url, currentStep, finalizeRecording, playAudioUrl, queueCurrentRecordTake, resetTakeState, startRecording, stopMetronome, stopMusicPlayback]);

  const handleSkipCurrentStep = useCallback(async () => {
    if (!currentStep) return;

    setRuntimeError(null);
    stopMusicPlayback(true);
    stopMetronome();
    await finalizeRecording(true);
    resetTakeState();
    await advanceToNextStep();
  }, [advanceToNextStep, currentStep, finalizeRecording, resetTakeState, stopMetronome, stopMusicPlayback]);

  const handleStartSession = useCallback(async () => {
    if (setup.selectedMusicIds.length === 0) {
      setSetupError('Selecione pelo menos uma música para iniciar a sessão.');
      return;
    }

    if (setup.includeNeutral && !setup.neutralSetKey) {
      setSetupError('Selecione um conjunto de frases neutras.');
      return;
    }

    if (setup.includeEmotional && !setup.emotionalSetKey) {
      setSetupError('Selecione um conjunto de frases emocionais.');
      return;
    }

    setIsPreparingSession(true);
    setSetupError(null);

    try {
      const preparedSteps = await buildSteps(setup);
      if (preparedSteps.length === 0) {
        setSetupError('Não há etapas suficientes para montar esta sessão.');
        return;
      }

      pendingStepsRef.current = preparedSteps;
      const newSession = await api.createSession(MUSIC_DATASET_ID, true, { session_type: 'music' });

      setSession(newSession);
      setSteps(preparedSteps);
      setCurrentStepIndex(0);
      setRuntimeError(null);
    } catch (error: unknown) {
      const errorWithSession = error as Error & { session?: SessionResponse };
      const hasExistingSession = !!errorWithSession.session;

      if (hasExistingSession) {
        setExistingSessionInfo(errorWithSession.session || null);
        setShowExistingSessionModal(true);
      } else {
        console.error('Falha ao preparar a sessão de música:', error);
        setSetupError(errorWithSession.message || 'Não foi possível iniciar a sessão de música.');
      }
    } finally {
      setIsPreparingSession(false);
    }
  }, [buildSteps, setup]);

  const handleFinalizeCurrentAndStartNew = useCallback(async () => {
    if (!existingSessionInfo || pendingStepsRef.current.length === 0) return;

    setIsProcessing(true);
    try {
      stopMetronome();
      await api.put(`/sessions/${existingSessionInfo.id}`, {
        ...existingSessionInfo,
        status: 'finished',
        finished_at: new Date().toISOString(),
      });

      const newSession = await api.createSession(MUSIC_DATASET_ID, true, { session_type: 'music' });
      setSession(newSession);
      setSteps(pendingStepsRef.current);
      setCurrentStepIndex(0);
      setExistingSessionInfo(null);
      setShowExistingSessionModal(false);
      setRuntimeError(null);
    } catch (error) {
      console.error('Falha ao trocar a sessão de música ativa:', error);
      setSetupError('Não foi possível finalizar a sessão ativa e iniciar uma nova.');
    } finally {
      setIsProcessing(false);
    }
  }, [existingSessionInfo, stopMetronome]);

  const handleCancelSession = useCallback(async () => {
    stopMetronome();
    if (session) {
      try {
        await api.put(`/sessions/${session.id}`, {
          ...session,
          status: 'cancelled',
          finished_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Falha ao cancelar a sessão de música:', error);
      }
    }

    navigate('/');
  }, [navigate, session, stopMetronome]);

  const handleOpenCreateMusicForm = useCallback(() => {
    setMusicForm(createEmptyMusicForm());
    setMusicFormError(null);
    setShowMusicFormModal(true);
  }, []);

  const handleOpenEditMusicForm = useCallback(async (musicId: number) => {
    setIsSubmittingMusicForm(true);
    setMusicFormError(null);
    setShowMusicFormModal(true);

    try {
      const detail = await ensureMusicDetails(musicId);
      setMusicForm({
        id: detail.id,
        nome: detail.nome,
        genero: detail.genero,
        texto: detail.texto || '',
        bpm: detail.bpm ? String(detail.bpm) : '',
        timeSignature: detail.time_signature || '',
        vocalAudioFile: null,
        instrumentalAudioFile: null,
      });
    } catch (error) {
      console.error(`Falha ao carregar a música ${musicId} para edição:`, error);
      setMusicFormError('Não foi possível carregar os dados da música para edição.');
    } finally {
      setIsSubmittingMusicForm(false);
    }
  }, [ensureMusicDetails]);

  const handleCloseMusicForm = useCallback(() => {
    setShowMusicFormModal(false);
    setMusicForm(createEmptyMusicForm());
    setMusicFormError(null);
  }, []);

  const handleSubmitMusicForm = useCallback(async () => {
    if (!musicForm.nome.trim()) {
      setMusicFormError('Informe o nome da música.');
      return;
    }

    if (!musicForm.genero.trim()) {
      setMusicFormError('Informe o gênero da música.');
      return;
    }

    const parsedBpm = musicForm.bpm.trim() ? Number(musicForm.bpm) : null;
    if (parsedBpm !== null && (!Number.isFinite(parsedBpm) || parsedBpm <= 0)) {
      setMusicFormError('O BPM deve ser maior que 0 quando informado.');
      return;
    }

    setIsSubmittingMusicForm(true);
    setMusicFormError(null);

    const payload: MusicUpsertPayload = {
      nome: musicForm.nome.trim(),
      genero: musicForm.genero.trim(),
      texto: musicForm.texto.trim(),
      bpm: parsedBpm,
      time_signature: musicForm.timeSignature.trim() || null,
      vocal_audio_file: musicForm.vocalAudioFile,
      instrumental_audio_file: musicForm.instrumentalAudioFile,
    };

    try {
      const savedMusic = musicForm.id
        ? await api.updateMusic(musicForm.id, payload)
        : await api.createMusic(payload);

      setMusicDetails((previous) => {
        const next = {
          ...previous,
          [savedMusic.id]: savedMusic,
        };
        musicDetailsRef.current = next;
        return next;
      });

      await refreshMusicList();
      handleCloseMusicForm();
    } catch (error) {
      console.error('Falha ao salvar a música:', error);
      setMusicFormError(error instanceof Error ? error.message : 'Não foi possível salvar a música.');
    } finally {
      setIsSubmittingMusicForm(false);
    }
  }, [handleCloseMusicForm, musicForm, refreshMusicList]);

  const handleSelectMusic = useCallback((musicId: number) => {
    setSetup((previous) => {
      const isSelected = previous.selectedMusicIds.includes(musicId);
      return {
        ...previous,
        selectedMusicIds: isSelected
          ? previous.selectedMusicIds.filter(id => id !== musicId)
          : [...previous.selectedMusicIds, musicId],
      };
    });

    setPreviewVisibleIds((previous) => previous.filter(id => id !== musicId));
    setPreviewLoadingIds((previous) => previous.filter(id => id !== musicId));
  }, []);

  const handleToggleMusicPreview = useCallback(async (musicId: number) => {
    if (previewVisibleIds.includes(musicId)) {
      setPreviewVisibleIds(previous => previous.filter(id => id !== musicId));
      return;
    }

    setPreviewLoadingIds(previous => (previous.includes(musicId) ? previous : [...previous, musicId]));
    try {
      await ensureMusicDetails(musicId);
      setPreviewVisibleIds(previous => (previous.includes(musicId) ? previous : [...previous, musicId]));
      setSetupError(null);
    } catch (error) {
      console.error(`Falha ao carregar preview da música ${musicId}:`, error);
      setSetupError('Não foi possível carregar o preview da música selecionada.');
    } finally {
      setPreviewLoadingIds(previous => previous.filter(id => id !== musicId));
    }
  }, [ensureMusicDetails, previewVisibleIds]);

  const handleNeutralSetChange = useCallback((event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setSetup(prev => ({
      ...prev,
      neutralSetKey: value,
    }));
  }, []);

  const handleEmotionalSetChange = useCallback((event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setSetup(prev => ({
      ...prev,
      emotionalSetKey: value,
    }));
  }, []);

  useEffect(() => {
    void loadSetupData();
  }, [loadSetupData]);

  useEffect(() => {
    if (!setup.neutralSetKey && neutralOptions[0]) {
      setSetup(prev => ({
        ...prev,
        neutralSetKey: neutralOptions[0].key,
      }));
    }
  }, [neutralOptions, setup.neutralSetKey]);

  useEffect(() => {
    if (!setup.emotionalSetKey && emotionalOptions[0]) {
      setSetup(prev => ({
        ...prev,
        emotionalSetKey: emotionalOptions[0].key,
      }));
    }
  }, [emotionalOptions, setup.emotionalSetKey]);

  useEffect(() => {
    if (!currentStep) return;

    let cancelled = false;
    let timeoutId: number | undefined;

    clearStepCountdown();
    stopMusicPlayback(true);
    stopMetronome();
    resetTakeState();
    setStepAudioError(null);

    if (currentStep.type !== 'record') {
      setVoiceMonitoring(false);
    }

    if (currentStep.type === 'phrase') {
      timeoutId = window.setTimeout(() => {
        void startRecording();
      }, 250);

      return () => {
        cancelled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }

    if (!currentStep.musicId) return;

    setIsLoadingCurrentMusic(true);
    void ensureMusicDetails(currentStep.musicId)
      .then((detail) => {
        if (cancelled) return;

        setMetronomeConfig(createInitialMetronomeConfig(detail));

        if (currentStep.type === 'record') {
          const defaultMonitorMode = getDefaultMonitorMode(detail);
          setMonitorMode(defaultMonitorMode);
        } else {
          setMonitorMode('none');
          if (detail.vocal_audio_url) {
            beginStepCountdown(() => playAudioUrl(detail.vocal_audio_url, true));
          }
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Falha ao carregar detalhes da música da etapa atual:', error);
        setStepAudioError('Não foi possível carregar os detalhes desta música.');
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingCurrentMusic(false);
        }
      });

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      clearStepCountdown();
      stopMetronome();
    };
  }, [beginStepCountdown, clearStepCountdown, currentStep, ensureMusicDetails, playAudioUrl, resetTakeState, startRecording, stopMetronome, stopMusicPlayback]);

  useEffect(() => {
    if (!isRecording || isMicPaused) return;

    timerIntervalRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isMicPaused, isRecording]);

  useEffect(() => {
    let cancelled = false;

    const syncMonitor = async () => {
      const shouldListen = canUseVoiceMonitoring && voiceMonitoring && isRecording && !isMicPaused;

      if (!shouldListen) {
        await syncVoiceMonitorAudio(false);
        return;
      }

      try {
        await ensureMicrophoneReady();
        if (!cancelled) {
          await syncVoiceMonitorAudio(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Falha ao preparar o retorno local da voz:', error);
          setRuntimeError('Não foi possível preparar o retorno local da voz.');
        }
      }
    };

    void syncMonitor();

    return () => {
      cancelled = true;
    };
  }, [canUseVoiceMonitoring, ensureMicrophoneReady, isMicPaused, isRecording, syncVoiceMonitorAudio, voiceMonitoring]);

  useEffect(() => {
    return () => {
      stopMusicPlayback(true);
      stopMetronome();
      cleanupLiveIndicators();
      cleanupStream();
    };
  }, [cleanupLiveIndicators, cleanupStream, stopMetronome, stopMusicPlayback]);

  const mainToggleLabel = useMemo(() => {
    if (!currentStep) return 'Iniciar';
    if (stepCountdown !== null) return 'Preparando...';

    if (currentStep.type === 'listen') {
      return isMusicPlaying ? 'Pausar música' : 'Tocar música';
    }

    if (!hasStartedCurrentTake) {
      return currentStep.type === 'record' ? 'Iniciar gravação' : 'Iniciar leitura';
    }

    return isMicPaused ? 'Retomar' : 'Pausar';
  }, [currentStep, hasStartedCurrentTake, isMicPaused, isMusicPlaying, stepCountdown]);

  const restartLabel = useMemo(() => {
    if (!currentStep) return 'Recomeçar';
    if (currentStep.type === 'listen') return 'Ouvir de novo';
    if (currentStep.type === 'record') return 'Regravar música';
    return 'Regravar frase';
  }, [currentStep]);

  const skipLabel = useMemo(() => {
    if (!currentStep) return 'Pular';
    if (currentStep.type === 'record') return 'Pular música';
    if (currentStep.type === 'listen') return 'Pular audição';
    return 'Pular frase';
  }, [currentStep]);

  const saveLabel = useMemo(() => {
    if (!currentStep) return 'Continuar';
    if (currentStep.type === 'listen') return 'Ir para gravação';
    if (isLastStep) return 'Salvar e finalizar';
    if (currentStep.type === 'record') return 'Salvar e próxima etapa';
    return 'Salvar e continuar';
  }, [currentStep, isLastStep]);

  const listeningUnavailable = currentStep?.type === 'listen' && !currentMusicDetail?.vocal_audio_url;

  if (!isSessionStarted) {
    return (
      <Container maxWidth="lg">
        <Modal open={showMusicFormModal} onClose={handleCloseMusicForm}>
          <Box sx={{ ...modalStyle, width: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <Typography variant="h6">
              {musicForm.id ? 'Editar música' : 'Cadastrar música'}
            </Typography>

            {musicFormError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {musicFormError}
              </Alert>
            )}

            <Stack spacing={2.5} sx={{ mt: 3 }}>
              <TextField
                label="Nome"
                value={musicForm.nome}
                onChange={(event) => setMusicForm(prev => ({ ...prev, nome: event.target.value }))}
                fullWidth
              />
              <TextField
                label="Gênero"
                value={musicForm.genero}
                onChange={(event) => setMusicForm(prev => ({ ...prev, genero: event.target.value }))}
                fullWidth
              />
              <TextField
                label="Texto / letra"
                value={musicForm.texto}
                onChange={(event) => setMusicForm(prev => ({ ...prev, texto: event.target.value }))}
                fullWidth
                multiline
                minRows={4}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="BPM"
                  type="number"
                  value={musicForm.bpm}
                  onChange={(event) => setMusicForm(prev => ({ ...prev, bpm: event.target.value }))}
                  helperText="Opcional. Se preenchido, deve ser maior que 0."
                  fullWidth
                />
                <TextField
                  label="Compasso"
                  value={musicForm.timeSignature}
                  onChange={(event) => setMusicForm(prev => ({ ...prev, timeSignature: event.target.value }))}
                  placeholder="4/4"
                  helperText="Opcional. Sugestões: 4/4, 3/4, 6/8."
                  fullWidth
                />
              </Stack>

              <Divider />

              <Stack spacing={2}>
                <Box>
                  <Button variant="outlined" component="label">
                    {musicForm.vocalAudioFile ? 'Trocar áudio vocal' : 'Selecionar áudio vocal'}
                    <input
                      hidden
                      type="file"
                      accept="audio/*"
                      onChange={(event) => {
                        setMusicForm(prev => ({
                          ...prev,
                          vocalAudioFile: event.target.files?.[0] || null,
                        }));
                      }}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {musicForm.vocalAudioFile ? musicForm.vocalAudioFile.name : 'Nenhum novo arquivo vocal selecionado'}
                  </Typography>
                </Box>

                <Box>
                  <Button variant="outlined" component="label">
                    {musicForm.instrumentalAudioFile ? 'Trocar instrumental' : 'Selecionar instrumental'}
                    <input
                      hidden
                      type="file"
                      accept="audio/*"
                      onChange={(event) => {
                        setMusicForm(prev => ({
                          ...prev,
                          instrumentalAudioFile: event.target.files?.[0] || null,
                        }));
                      }}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {musicForm.instrumentalAudioFile ? musicForm.instrumentalAudioFile.name : 'Nenhum novo arquivo instrumental selecionado'}
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Button variant="outlined" onClick={handleCloseMusicForm} disabled={isSubmittingMusicForm}>
                  Cancelar
                </Button>
                <Button variant="contained" onClick={handleSubmitMusicForm} disabled={isSubmittingMusicForm}>
                  {isSubmittingMusicForm ? <CircularProgress size={24} color="inherit" /> : (musicForm.id ? 'Salvar alterações' : 'Cadastrar música')}
                </Button>
              </Box>
            </Stack>
          </Box>
        </Modal>

        <Modal open={showExistingSessionModal} onClose={() => setShowExistingSessionModal(false)}>
          <Box sx={modalStyle}>
            <Typography variant="h6">Você já possui uma sessão de música ativa.</Typography>
            <Typography sx={{ mt: 2 }}>
              Para iniciar uma nova sessão, finalize a sessão ativa primeiro.
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Button variant="contained" onClick={handleFinalizeCurrentAndStartNew} disabled={isProcessing}>
                Finalizar sessão atual e iniciar nova
              </Button>
              <Button variant="outlined" color="error" onClick={() => navigate('/')}>
                Voltar para a Home
              </Button>
            </Box>
          </Box>
        </Modal>

        <Paper elevation={3} sx={{ mt: 6, mb: 6, p: 4, borderRadius: 3 }}>
          <Typography variant="h4" component="h1" textAlign="center" gutterBottom>
            Sessão de Música
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
            Selecione as músicas da API, configure os tipos de frase e monte o fluxo da sessão antes de começar a gravar.
          </Typography>

          {setupError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {setupError}
            </Alert>
          )}

          {isLoadingSetupData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={4}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <Typography variant="h6">
                    1. Escolha as músicas
                  </Typography>
                  <Button variant="outlined" startIcon={<MusicNoteOutlinedIcon />} onClick={handleOpenCreateMusicForm}>
                    Cadastrar música
                  </Button>
                </Box>

                {musics.length === 0 ? (
                  <Alert severity="warning">
                    Nenhuma música foi retornada pela API no momento.
                  </Alert>
                ) : (
                  <Stack spacing={2}>
                    {musics.map((music) => {
                      const isSelected = setup.selectedMusicIds.includes(music.id);
                      const selectionOrder = selectedMusicMap[music.id];
                      const isPreviewVisible = previewVisibleIds.includes(music.id);
                      const isPreviewLoading = previewLoadingIds.includes(music.id);
                      const musicPreview = musicDetails[music.id];

                      return (
                        <Paper
                          key={music.id}
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderColor: isSelected ? 'primary.main' : 'divider',
                            bgcolor: isSelected ? 'action.selected' : 'background.paper',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleSelectMusic(music.id)}
                              inputProps={{ 'aria-label': `Selecionar ${music.nome}` }}
                            />
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="h6">{music.nome}</Typography>
                                {selectionOrder && (
                                  <Chip size="small" color="primary" label={`Ordem ${selectionOrder}`} />
                                )}
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Gênero: {music.genero || 'Não informado'}
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip
                                  size="small"
                                  label={formatBpmLabel(music.bpm)}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={`Compasso ${getDisplayTimeSignature(music.time_signature)}`}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={music.has_vocal_audio ? 'Com áudio vocal' : 'Sem áudio vocal'}
                                  color={music.has_vocal_audio ? 'primary' : 'default'}
                                  variant={music.has_vocal_audio ? 'filled' : 'outlined'}
                                />
                                <Chip
                                  size="small"
                                  label={music.has_instrumental_audio ? 'Com instrumental' : 'Sem instrumental'}
                                  color={music.has_instrumental_audio ? 'secondary' : 'default'}
                                  variant={music.has_instrumental_audio ? 'filled' : 'outlined'}
                                />
                              </Stack>
                            </Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Button
                                size="small"
                                variant="text"
                                startIcon={<EditOutlinedIcon />}
                                onClick={() => {
                                  void handleOpenEditMusicForm(music.id);
                                }}
                              >
                                Editar
                              </Button>
                              <LibraryMusicIcon color={isSelected ? 'primary' : 'disabled'} />
                            </Stack>
                          </Box>

                          {isSelected && (
                            <Box sx={{ mt: 2, pl: { xs: 0, sm: 7 } }}>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                  void handleToggleMusicPreview(music.id);
                                }}
                                disabled={isPreviewLoading}
                              >
                                {isPreviewLoading
                                  ? 'Carregando preview...'
                                  : isPreviewVisible
                                    ? 'Ocultar preview'
                                    : 'Mostrar preview'}
                              </Button>

                              {isPreviewVisible && musicPreview && (
                                <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 2 }}>
                                  <Stack spacing={2}>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                      <Chip size="small" variant="outlined" label={formatBpmLabel(musicPreview.bpm)} />
                                      <Chip size="small" variant="outlined" label={`Compasso ${getDisplayTimeSignature(musicPreview.time_signature)}`} />
                                    </Stack>
                                    <Box>
                                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Prévia da música original
                                      </Typography>
                                      {musicPreview.vocal_audio_url ? (
                                        <audio controls src={musicPreview.vocal_audio_url} style={{ width: '100%' }} />
                                      ) : (
                                        <Typography variant="body2" color="text.secondary">
                                          Esta música não possui áudio vocal.
                                        </Typography>
                                      )}
                                    </Box>

                                    <Box>
                                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Prévia do instrumental
                                      </Typography>
                                      {musicPreview.instrumental_audio_url ? (
                                        <audio controls src={musicPreview.instrumental_audio_url} style={{ width: '100%' }} />
                                      ) : (
                                        <Typography variant="body2" color="text.secondary">
                                          Esta música não possui faixa instrumental.
                                        </Typography>
                                      )}
                                    </Box>
                                  </Stack>
                                </Paper>
                              )}
                            </Box>
                          )}
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  2. Configure as frases da sessão
                </Typography>

                <Stack spacing={3}>
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={setup.includeNeutral}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setSetup(prev => ({
                              ...prev,
                              includeNeutral: checked,
                              neutralSetKey: prev.neutralSetKey || neutralOptions[0]?.key || '',
                            }));
                          }}
                        />
                      )}
                      label="Vai ter frases neutras aleatórias?"
                    />

                    {setup.includeNeutral && (
                      <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel id="neutral-set-label">Conjunto de frases neutras</InputLabel>
                        <Select
                          labelId="neutral-set-label"
                          label="Conjunto de frases neutras"
                          value={setup.neutralSetKey}
                          onChange={handleNeutralSetChange}
                        >
                          {neutralOptions.map(option => (
                            <MenuItem key={option.key} value={option.key}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          {selectedNeutralOption?.helperText || 'Selecione o conjunto de frases neutras.'}
                        </FormHelperText>
                      </FormControl>
                    )}
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={setup.includeEmotional}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setSetup(prev => ({
                              ...prev,
                              includeEmotional: checked,
                              emotionalSetKey: prev.emotionalSetKey || emotionalOptions[0]?.key || '',
                            }));
                          }}
                        />
                      )}
                      label="Vai ter frases emocionais?"
                    />

                    {setup.includeEmotional && (
                      <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel id="emotional-set-label">Tamanho do conjunto emocional</InputLabel>
                        <Select
                          labelId="emotional-set-label"
                          label="Tamanho do conjunto emocional"
                          value={setup.emotionalSetKey}
                          onChange={handleEmotionalSetChange}
                        >
                          {emotionalOptions.map(option => (
                            <MenuItem key={option.key} value={option.key}>
                              {option.label} - {option.helperText}
                            </MenuItem>
                          ))}
                        </Select>
                        <FormHelperText>
                          {selectedEmotionalOption?.helperText || 'Selecione curto ou médio.'}
                        </FormHelperText>
                      </FormControl>
                    )}
                  </Paper>

                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={setup.includeLyricPrompts}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setSetup(prev => ({
                              ...prev,
                              includeLyricPrompts: checked,
                            }));
                          }}
                        />
                      )}
                      label="Vai ter frases sobre a música para serem lidas?"
                    />
                    <FormHelperText sx={{ ml: 0, mt: 1 }}>
                      Essas frases serão incluídas antes de cada música, quando a letra/transcrição estiver disponível.
                    </FormHelperText>
                  </Paper>
                </Stack>
              </Box>

              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  3. Resumo da ordem da sessão
                </Typography>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                  <Stack spacing={1.5}>
                    {setup.includeNeutral && (
                      <Typography variant="body2">Frases neutras: {selectedNeutralOption?.label || 'Configuradas'}</Typography>
                    )}
                    {setup.includeEmotional && (
                      <Typography variant="body2">
                        Frases emocionais: {selectedEmotionalOption ? `${selectedEmotionalOption.label} (${selectedEmotionalOption.helperText})` : 'Configuradas'}
                      </Typography>
                    )}
                    {setup.includeLyricPrompts && (
                      <Typography variant="body2">Frases da música: antes de cada música com letra disponível</Typography>
                    )}
                    {selectedMusicSummaries.length > 0 ? (
                      selectedMusicSummaries.map((music, index) => (
                        <Typography key={music.id} variant="body2">
                          {index + 1}. Ouvir e gravar: {music.nome}
                        </Typography>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Nenhuma música selecionada ainda.
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" color="error" onClick={() => navigate('/')}>
                  Cancelar
                </Button>
                <Button variant="contained" onClick={handleStartSession} disabled={isPreparingSession || musics.length === 0}>
                  {isPreparingSession ? <CircularProgress color="inherit" size={24} /> : 'Iniciar sessão'}
                </Button>
              </Box>
            </Stack>
          )}
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Modal open={showCancelModal} onClose={() => setShowCancelModal(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Cancelar sessão de música</Typography>
          <Typography sx={{ mt: 2 }}>
            Tem certeza que deseja cancelar esta sessão? O progresso atual não será salvo.
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="outlined" onClick={() => setShowCancelModal(false)}>
              Voltar
            </Button>
            <Button variant="contained" color="error" onClick={handleCancelSession}>
              Cancelar sessão
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={showFinishModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Sessão finalizada</Typography>
          <Typography sx={{ mt: 2 }}>
            A sessão de música foi concluída com sucesso.
          </Typography>
          <Button component={Link} to="/" variant="outlined" color="primary" sx={{ mt: 3 }}>
            Voltar para a Home
          </Button>
        </Box>
      </Modal>

      <Typography variant="h3" component="h1" textAlign="center" sx={{ mt: 4, mb: 2 }}>
        Sessão de Música
      </Typography>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ width: '100%', mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0}
          />
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="body2" color="text.secondary">
              {currentStep ? `${currentStep.order} de ${steps.length} etapas` : 'Preparando etapa'}
            </Typography>
            <Typography variant="body2" color="primary" fontWeight="bold">
              {currentStep?.musicName || 'Sessão em andamento'}
            </Typography>
          </Box>
        </Box>

        {(runtimeError || stepAudioError) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {runtimeError || stepAudioError}
          </Alert>
        )}

        {currentStep && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5">{currentStep.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {describeStep(currentStep)}
              </Typography>
            </Box>

            {stepCountdown !== null && currentStep.type !== 'phrase' && (
              <Paper
                variant="outlined"
                sx={{
                  mb: 3,
                  p: 3,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                }}
              >
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: '5rem',
                    fontWeight: 900,
                    lineHeight: 1,
                    color: 'primary.main',
                  }}
                >
                  {stepCountdown}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  {currentStep.type === 'listen'
                    ? 'A música original vai começar em instantes.'
                    : metronomeConfig.enabled && metronomeConfig.countInBars > 0
                      ? 'Contagem inicial do metrônomo em andamento.'
                      : 'A gravação da música vai começar em instantes.'}
                </Typography>
              </Paper>
            )}

            {isLoadingCurrentMusic && currentStep.type !== 'phrase' ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {currentStep.type === 'phrase' && (
                  <Box>
                    <Box display="flex" alignItems="center" mb={1}>
                      {isRecording && <FiberManualRecordIcon sx={{ color: 'red', animation: 'blinking 1s infinite' }} />}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {isRecording ? (isMicPaused ? 'Pausado' : 'Gravando...') : 'Pronto'}
                      </Typography>
                      <Box flexGrow={1} />
                      <Typography variant="h6">{formatClock(timer)}</Typography>
                    </Box>

                    <AudioVisualizer
                      mode="mic"
                      canvasRef={canvasRef}
                      dbfs={dbfs}
                      isActive={isRecording && !isMicPaused}
                    />

                    <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>
                        {currentStep.helperText}
                      </Typography>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
                        <Button size="small" variant="outlined" onClick={() => setPhraseFontSize(prev => Math.max(18, prev - 4))}>
                          A-
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => setPhraseFontSize(prev => Math.min(72, prev + 4))}>
                          A+
                        </Button>
                      </Box>

                      <Typography
                        variant="h4"
                        sx={{
                          fontSize: `${phraseFontSize}px`,
                          minHeight: 100,
                          textAlign: 'center',
                          my: 2,
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1.2,
                          borderRadius: 1,
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {currentStep.prompt}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {currentStep.type === 'listen' && (
                  <Box>
                    {listeningUnavailable ? (
                      <Alert severity="info" sx={{ mb: 3 }}>
                        Esta música não possui áudio vocal para audição prévia. Você pode pular esta etapa e seguir para a gravação.
                      </Alert>
                    ) : (
                      <AudioVisualizer
                        mode="music"
                        isActive={isMusicPlaying}
                        musicProgress={musicProgress}
                        musicLabel="Música original"
                      />
                    )}

                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        {currentStep.musicName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {currentStep.description}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                        <Chip size="small" variant="outlined" label={formatBpmLabel(currentMusicDetail?.bpm)} />
                        <Chip size="small" variant="outlined" label={`Compasso ${currentTimeSignatureLabel}`} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Use os botões abaixo para tocar, pausar e repetir quantas vezes precisar antes de gravar.
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {currentStep.type === 'record' && (
                  <Box>
                    <Box display="flex" alignItems="center" mb={1}>
                      {isRecording && <FiberManualRecordIcon sx={{ color: 'red', animation: 'blinking 1s infinite' }} />}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {isRecording ? (isMicPaused ? 'Pausado' : 'Gravando...') : 'Pronto para gravar'}
                      </Typography>
                      <Box flexGrow={1} />
                      <Typography variant="h6">{formatClock(timer)}</Typography>
                    </Box>

                    <AudioVisualizer
                      mode="mic"
                      canvasRef={canvasRef}
                      dbfs={dbfs}
                      isActive={isRecording && !isMicPaused}
                    />

                    {selectedMonitorUrl ? (
                      <AudioVisualizer
                        mode="music"
                        isActive={isMusicPlaying}
                        musicProgress={musicProgress}
                        musicLabel="Retorno de música"
                      />
                    ) : (
                      <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Nenhuma música de fundo será reproduzida nesta gravação. Você pode gravar apenas com retorno da sua própria voz, se desejar.
                        </Typography>
                      </Paper>
                    )}

                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Metrônomo da sessão
                      </Typography>

                      <Stack spacing={2.5}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip size="small" variant="outlined" label={formatBpmLabel(currentMusicDetail?.bpm)} />
                          <Chip size="small" variant="outlined" label={`Compasso ${currentTimeSignatureLabel}`} />
                        </Stack>

                        <FormControlLabel
                          control={(
                            <Switch
                              checked={metronomeConfig.enabled}
                              disabled={stepCountdown !== null || (hasStartedCurrentTake && !isMicPaused)}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                setMetronomeConfig((previous) => ({
                                  ...previous,
                                  enabled: checked,
                                  bpm: previous.bpm || (currentMusicDetail?.bpm ? String(currentMusicDetail.bpm) : previous.bpm),
                                  timeSignature: getDisplayTimeSignature(currentMusicDetail?.time_signature),
                                }));
                              }}
                            />
                          )}
                          label="Usar metrônomo"
                        />

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                          <TextField
                            label="BPM da sessão"
                            type="number"
                            value={metronomeConfig.bpm}
                            disabled={stepCountdown !== null || !metronomeConfig.enabled || (hasStartedCurrentTake && !isMicPaused)}
                            onChange={(event) => {
                              const value = event.target.value;
                              setMetronomeConfig(previous => ({ ...previous, bpm: value }));
                            }}
                            helperText="Carregado da música, mas editável apenas nesta sessão."
                            fullWidth
                          />
                          <TextField
                            label="Compasso"
                            value={metronomeConfig.timeSignature}
                            disabled
                            helperText="Carregado automaticamente da música."
                            fullWidth
                          />
                        </Stack>

                        <FormControl fullWidth disabled={stepCountdown !== null || !metronomeConfig.enabled || (hasStartedCurrentTake && !isMicPaused)}>
                          <InputLabel id="metronome-countin-label">Contagem inicial</InputLabel>
                          <Select
                            labelId="metronome-countin-label"
                            label="Contagem inicial"
                            value={String(metronomeConfig.countInBars)}
                            onChange={(event) => {
                              setMetronomeConfig(previous => ({
                                ...previous,
                                countInBars: Number(event.target.value) as CountInOption,
                              }));
                            }}
                          >
                            <MenuItem value="0">Sem contagem</MenuItem>
                            <MenuItem value="1">1 compasso</MenuItem>
                            <MenuItem value="2">2 compassos</MenuItem>
                          </Select>
                        </FormControl>

                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Volume do metrônomo: {metronomeConfig.volume}%
                          </Typography>
                          <Slider
                            value={metronomeConfig.volume}
                            min={0}
                            max={100}
                            step={1}
                            disabled={stepCountdown !== null || !metronomeConfig.enabled || (hasStartedCurrentTake && !isMicPaused)}
                            onChange={(_, value) => {
                              setMetronomeConfig(previous => ({
                                ...previous,
                                volume: Array.isArray(value) ? value[0] : value,
                              }));
                            }}
                            valueLabelDisplay="auto"
                          />
                        </Box>

                        <Alert severity="warning">
                          Para evitar que o som do metrônomo apareça na gravação, use fones de ouvido.
                        </Alert>
                      </Stack>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Retorno durante a gravação
                      </Typography>

                      <Stack spacing={2}>
                        <FormControl disabled={stepCountdown !== null || (hasStartedCurrentTake && !isMicPaused)}>
                          <InputLabel id="monitor-mode-label">O que você quer ouvir</InputLabel>
                          <Select
                            labelId="monitor-mode-label"
                            label="O que você quer ouvir"
                            value={monitorMode}
                            onChange={(event: SelectChangeEvent<MonitorMode>) => {
                              setMonitorMode(event.target.value as MonitorMode);
                              setStepAudioError(null);
                            }}
                          >
                            <MenuItem value="none">Sem música de fundo</MenuItem>
                            {currentMusicDetail?.vocal_audio_url && (
                              <MenuItem value="vocal">Música original com voz</MenuItem>
                            )}
                            {currentMusicDetail?.instrumental_audio_url && (
                              <MenuItem value="instrumental">Instrumental da música</MenuItem>
                            )}
                          </Select>
                          <FormHelperText>
                            Defina o retorno antes de iniciar a take para manter a gravação consistente.
                          </FormHelperText>
                        </FormControl>

                        <FormControlLabel
                          control={(
                            <Switch
                              checked={voiceMonitoring}
                              disabled={stepCountdown !== null}
                              onChange={(event) => setVoiceMonitoring(event.target.checked)}
                            />
                          )}
                          label="Ouvir minha própria voz durante o canto"
                        />

                        <Typography variant="body2" color="text.secondary">
                          Esse retorno local fica disponível apenas nesta etapa de gravação cantada e pode ser ligado ou desligado quando quiser. Prefira usar fones para evitar microfonia.
                        </Typography>
                      </Stack>
                    </Paper>
                  </Box>
                )}
              </>
            )}
          </>
        )}

        <Box mt={4} display="flex" flexWrap="wrap" justifyContent="space-between" gap={2}>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Button variant="outlined" onClick={handleRestartCurrentStep} disabled={isProcessing || !currentStep || stepCountdown !== null}>
              {restartLabel}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                void handleToggleMainAction();
              }}
              disabled={isProcessing || stepCountdown !== null || (currentStep?.type === 'listen' && listeningUnavailable)}
            >
              {mainToggleLabel}
            </Button>
          </Box>

          <Box display="flex" flexWrap="wrap" gap={2}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<SkipNextIcon />}
              onClick={() => {
                void handleSkipCurrentStep();
              }}
              disabled={isProcessing || !currentStep}
            >
              {skipLabel}
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                void handleSaveCurrentStep();
              }}
              disabled={isProcessing || (currentStep?.type !== 'listen' && !hasStartedCurrentTake)}
            >
              {isProcessing ? <CircularProgress size={24} color="inherit" /> : saveLabel}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Box mt={2} mb={6} display="flex" justifyContent="center" gap={2} flexWrap="wrap">
        <Button variant="outlined" onClick={() => navigate('/')}>
          Voltar para a Home
        </Button>
        <Button variant="outlined" color="error" onClick={() => setShowCancelModal(true)}>
          Cancelar sessão
        </Button>
      </Box>

      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={updateMusicProgress}
        onLoadedMetadata={updateMusicProgress}
        onEnded={() => {
          setIsMusicPlaying(false);
          stopMusicProgressTracking();
          setMusicProgress(100);
        }}
        onPause={() => {
          setIsMusicPlaying(false);
          stopMusicProgressTracking();
        }}
        onPlay={() => {
          setIsMusicPlaying(true);
          startMusicProgressTracking();
        }}
        style={{ display: 'none' }}
      />
      <audio ref={voiceMonitorAudioRef} playsInline style={{ display: 'none' }} />
    </Container>
  );
};

export default MusicSessionPage;
