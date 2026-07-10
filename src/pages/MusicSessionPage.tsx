import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
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
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContrastIcon from '@mui/icons-material/Contrast';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import FontDownloadIcon from '@mui/icons-material/FontDownload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import AudioVisualizer from '../components/AudioVisualizer';
import { api, MusicDetails, MusicListItem, SessionResponse } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type PhraseCategory = 'neutral' | 'emotional' | 'lyric';
type MonitorMode = 'none' | 'vocal' | 'instrumental';
type SessionPackageKey = 'short' | 'medium' | 'long';
type SetupStage = 'package' | 'music' | 'review';
type MusicButtonTutorialKey = 'phrase-controls' | 'listen-controls' | 'record-controls';
type CountInOption = 0 | 1 | 2;
type MusicSortOption = 'selected' | 'name' | 'genre' | 'recent';
type FloatingAlertSeverity = 'success' | 'info' | 'warning' | 'error';

interface MusicSessionPackage {
  key: SessionPackageKey;
  label: string;
  description: string;
  helperText: string;
  minSongs: number;
  maxSongs: number | null;
}

interface EmotionPhraseGroup {
  key: string;
  label: string;
  phrases: string[];
}

interface SetupFormState {
  packageKey: SessionPackageKey;
  selectedMusicIds: number[];
  searchTerm: string;
  genreFilter: string;
  sortBy: MusicSortOption;
}

interface MusicAdminFormState {
  nome: string;
  genero: string;
  texto: string;
  bpm: string;
  timeSignature: string;
  vocalAudioFile: File | null;
  instrumentalAudioFile: File | null;
}

interface MetronomeConfig {
  enabled: boolean;
  bpm: string;
  timeSignature: string;
  countInBars: CountInOption;
  volume: number;
}

interface MusicStepTutorial {
  key: string;
  title: string;
  description: string;
  tips: string[];
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
  alternatives: string[];
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
  emotion: number;
  isSpontaneous: boolean;
}

interface DatasetPhraseRow {
  text: string;
  blockId: number;
}

interface FloatingAlertItem {
  key: string;
  severity: FloatingAlertSeverity;
  message: string;
}

type DraftStep =
  | Omit<PhraseStep, 'order' | 'blockId'>
  | Omit<ListenStep, 'order' | 'blockId'>
  | Omit<RecordStep, 'order' | 'blockId'>;

const MUSIC_DATASET_ID = 1;
const MAX_RECORDING_SECONDS = 90;
const MUSIC_SESSION_SETUP_STORAGE_KEY = 'music_session_setup_by_id';
const STANDARD_NEUTRAL_PHRASE_COUNT = 3;
const STANDARD_EMOTIONAL_PHRASE_COUNT = 5;
const STANDARD_LYRIC_PHRASE_COUNT = 3;
const ACCESSIBLE_READING_FONT = '"Atkinson Hyperlegible", Verdana, Tahoma, "Trebuchet MS", sans-serif';

const MUSIC_SESSION_PACKAGES: MusicSessionPackage[] = [
  {
    key: 'short',
    label: 'Curta',
    description: '1 música',
    helperText: 'Sessão rápida com apenas uma música.',
    minSongs: 1,
    maxSongs: 1,
  },
  {
    key: 'medium',
    label: 'Média',
    description: '2 ou 3 músicas',
    helperText: 'Bom equilíbrio entre aquecimento e repertório.',
    minSongs: 2,
    maxSongs: 3,
  },
  {
    key: 'long',
    label: 'Longa',
    description: '3 ou mais músicas',
    helperText: 'Fluxo mais extenso para sessões maiores.',
    minSongs: 3,
    maxSongs: null,
  },
];

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 520,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: 24,
  borderRadius: 3,
  p: 4,
};

const createInitialSetup = (): SetupFormState => ({
  packageKey: 'short',
  selectedMusicIds: [],
  searchTerm: '',
  genreFilter: '',
  sortBy: 'selected',
});

const readStoredMusicSessionSetups = (): Record<string, SetupFormState> => {
  try {
    const raw = localStorage.getItem(MUSIC_SESSION_SETUP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveStoredMusicSessionSetup = (sessionId: number, setup: SetupFormState) => {
  const stored = readStoredMusicSessionSetups();
  stored[String(sessionId)] = setup;
  localStorage.setItem(MUSIC_SESSION_SETUP_STORAGE_KEY, JSON.stringify(stored));
};

const getStoredMusicSessionSetup = (sessionId: number): SetupFormState | null => {
  const stored = readStoredMusicSessionSetups();
  const setup = stored[String(sessionId)];

  if (!setup || !Array.isArray(setup.selectedMusicIds)) {
    return null;
  }

  return {
    packageKey: setup.packageKey || 'short',
    selectedMusicIds: setup.selectedMusicIds,
    searchTerm: setup.searchTerm || '',
    genreFilter: setup.genreFilter || '',
    sortBy: setup.sortBy || 'selected',
  };
};

const createResumeFallbackSetup = (musics: MusicListItem[], savedStepIndex: number): SetupFormState | null => {
  if (musics.length === 0) return null;

  const estimatedSongsNeeded = Math.max(1, Math.ceil((savedStepIndex + 1) / 5));
  const selectedMusicIds = musics
    .slice(0, Math.min(musics.length, estimatedSongsNeeded))
    .map(music => music.id);

  return {
    packageKey: selectedMusicIds.length >= 3 ? 'long' : selectedMusicIds.length >= 2 ? 'medium' : 'short',
    selectedMusicIds,
    searchTerm: '',
    genreFilter: '',
    sortBy: 'selected',
  };
};

const createInitialMusicAdminForm = (): MusicAdminFormState => ({
  nome: '',
  genero: '',
  texto: '',
  bpm: '',
  timeSignature: '4/4',
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
    if (!normalized || seen.has(normalized)) {
      return accumulator;
    }

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
  if (normalized.length <= amount) {
    return normalized;
  }

  return shuffleItems(normalized).slice(0, amount);
};

const formatClock = (seconds: number): string => {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
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

const normalizeBlockName = (name: string): string => {
  return name
    .replace(/^Bloco de /i, '')
    .replace(/^bloco de /i, '')
    .trim();
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

const getPackageConfig = (packageKey: SessionPackageKey): MusicSessionPackage => {
  return MUSIC_SESSION_PACKAGES.find(item => item.key === packageKey) || MUSIC_SESSION_PACKAGES[0];
};

const formatPackageRule = (config: MusicSessionPackage): string => {
  if (config.maxSongs === null) {
    return `${config.minSongs} ou mais músicas`;
  }

  if (config.minSongs === config.maxSongs) {
    return `${config.maxSongs} música${config.maxSongs > 1 ? 's' : ''}`;
  }

  return `${config.minSongs} a ${config.maxSongs} músicas`;
};

const getSetupStageItems = (currentStage: SetupStage) => ([
  { step: '1', title: 'Tamanho', active: currentStage === 'package', done: currentStage !== 'package' },
  { step: '2', title: 'Músicas', active: currentStage === 'music', done: currentStage === 'review' },
  { step: '3', title: 'Revisar', active: currentStage === 'review', done: false },
]);

const getStepTheme = (step: SessionStep | null) => {
  if (!step) {
    return {
      eyebrow: 'Preparando',
      accent: '#1976d2',
      surface: 'linear-gradient(135deg, rgba(25,118,210,0.16), rgba(25,118,210,0.04))',
    };
  }

  if (step.type === 'listen') {
    return {
      eyebrow: 'Ouvir referência',
      accent: '#1565c0',
      surface: 'linear-gradient(135deg, rgba(21,101,192,0.16), rgba(21,101,192,0.04))',
    };
  }

  if (step.type === 'record') {
    return {
      eyebrow: 'Gravar música',
      accent: '#2e7d32',
      surface: 'linear-gradient(135deg, rgba(46,125,50,0.16), rgba(46,125,50,0.04))',
    };
  }

  if (step.category === 'emotional') {
    return {
      eyebrow: 'Frase emocional',
      accent: '#ef6c00',
      surface: 'linear-gradient(135deg, rgba(239,108,0,0.16), rgba(239,108,0,0.04))',
    };
  }

  if (step.category === 'lyric') {
    return {
      eyebrow: 'Frase da música',
      accent: '#6a1b9a',
      surface: 'linear-gradient(135deg, rgba(106,27,154,0.16), rgba(106,27,154,0.04))',
    };
  }

  return {
    eyebrow: 'Frase neutra',
    accent: '#00838f',
    surface: 'linear-gradient(135deg, rgba(0,131,143,0.16), rgba(0,131,143,0.04))',
  };
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
    return `Escute ${step.musicName || 'a música'} antes de cantar.`;
  }

  if (step.type === 'record') {
    return `Revise as configurações abaixo e depois clique no botão verde para começar a gravar ${step.musicName || 'a música'}.`;
  }

  if (step.category === 'lyric') {
    return `Leia esta frase da letra antes de cantar ${step.musicName || 'a próxima música'}.`;
  }

  if (step.category === 'emotional') {
    return 'Leia a frase com a emoção indicada.';
  }

  return 'Leia em tom neutro antes de prosseguir.';
};

const getDefaultMonitorMode = (musicDetail: MusicDetails | null): MonitorMode => {
  if (!musicDetail) return 'none';
  if (musicDetail.instrumental_audio_url) return 'instrumental';
  if (musicDetail.vocal_audio_url) return 'vocal';
  return 'none';
};

const buildPhraseDrafts = ({
  idPrefix,
  category,
  title,
  helperText,
  pool,
  count,
  musicId,
  musicName,
}: {
  idPrefix: string;
  category: PhraseCategory;
  title: string;
  helperText: string;
  pool: string[];
  count: number;
  musicId?: number;
  musicName?: string;
}): DraftStep[] => {
  const uniquePool = uniquePhrases(pool);
  const prompts = samplePhrases(uniquePool, count);

  return prompts.map((prompt, index) => ({
    id: `${idPrefix}-${index}`,
    type: 'phrase',
    category,
    title,
    prompt,
    helperText,
    musicId,
    musicName,
    alternatives: shuffleItems(uniquePool.filter(item => item !== prompt)),
  }));
};

const getMusicStepTutorial = (step: SessionStep): MusicStepTutorial => {
  if (step.type === 'listen') {
    return {
      key: `listen-${step.musicId ?? step.id}`,
      title: `Ouvir música original: ${step.musicName || 'Música'}`,
      description: 'Agora você vai ouvir a música original antes de gravar.',
      tips: [
        'O sistema mostra a contagem 3, 2, 1 e começa a tocar sozinho.',
        'Escute a referência com atenção para entrar no clima da música.',
        'Se quiser, você pode ouvir de novo ou seguir para a gravação.',
      ],
    };
  }

  if (step.type === 'record') {
    return {
      key: `record-${step.musicId ?? step.id}`,
      title: `Gravar música: ${step.musicName || 'Música'}`,
      description: 'Agora você configura o que vai ouvir e inicia a gravação cantada.',
      tips: [
        '1. Em "O que você quer ouvir", escolha se vai cantar sem base, com a música original ou com o instrumental.',
        '2. Em "Metrônomo opcional", ligue o clique só se ele realmente ajudar nesta gravação.',
        'Quando estiver pronto, clique no botão verde para começar a gravação.',
      ],
    };
  }

  if (step.category === 'neutral') {
    return {
      key: 'phrase-neutral',
      title: 'Frase neutra',
      description: 'Agora você vai ver frases neutras para aquecer a voz e entrar no fluxo da sessão.',
      tips: [
        'Leia a frase com naturalidade, como se estivesse falando normalmente.',
        'Você pode trocar a frase até 3 vezes se não gostar da atual.',
        'Também pode ajustar tamanho, contraste e fonte para facilitar a leitura.',
      ],
    };
  }

  if (step.category === 'emotional') {
    return {
      key: `phrase-emotional-${step.helperText.toLowerCase()}`,
      title: step.title,
      description: 'Agora você vai ver frases para interpretar com a emoção indicada na tela.',
      tips: [
        `A emoção desta parte é ${step.helperText.toLowerCase()}.`,
        'Leia a frase deixando a emoção aparecer na voz.',
        'Ajuste a visualização se precisar e avance quando terminar.',
      ],
    };
  }

  return {
    key: `phrase-lyric-${step.musicId ?? step.id}`,
    title: step.title,
    description: 'Agora você vai ver trechos ligados à música antes de entrar na parte cantada.',
    tips: [
      'Leia o texto que aparece na tela com clareza.',
      'Use esta etapa para se conectar com a letra e com a intenção da música.',
      'Depois disso, a sessão segue para ouvir e gravar a canção.',
    ],
  };
};

const TutorialTooltip: React.FC<{
  text: string;
  top: number;
  left: number;
  onNext: () => void;
  onSkip: () => void;
  arrowTop?: string | number;
}> = ({ text, top, left, onNext, onSkip, arrowTop = '50%' }) => (
  <Box sx={{ position: 'fixed', top, left, zIndex: 1400, transform: 'translateY(-50%)' }}>
    <Paper
      elevation={6}
      sx={{
        position: 'relative',
        p: 2,
        maxWidth: 280,
        bgcolor: 'background.paper',
        borderRadius: 2,
      }}
    >
      <Typography variant="body2" sx={{ mb: 2 }}>
        {text}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onSkip} variant="text" size="small">
          Pular
        </Button>
        <Button onClick={onNext} variant="contained" size="small">
          Próximo
        </Button>
      </Box>
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

const MusicSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [setup, setSetup] = useState<SetupFormState>(() => createInitialSetup());
  const [setupStage, setSetupStage] = useState<SetupStage>('package');
  const [musics, setMusics] = useState<MusicListItem[]>([]);
  const [musicDetails, setMusicDetails] = useState<Record<number, MusicDetails>>({});
  const [showMusicAdminPanel, setShowMusicAdminPanel] = useState(false);
  const [musicAdminForm, setMusicAdminForm] = useState<MusicAdminFormState>(() => createInitialMusicAdminForm());
  const [isSavingMusic, setIsSavingMusic] = useState(false);
  const [musicAdminStatus, setMusicAdminStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [neutralPhrasePool, setNeutralPhrasePool] = useState<string[]>([]);
  const [emotionPhraseGroups, setEmotionPhraseGroups] = useState<EmotionPhraseGroup[]>([]);
  const [steps, setSteps] = useState<SessionStep[]>([]);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [existingSessionInfo, setExistingSessionInfo] = useState<SessionResponse | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoadingSetupData, setIsLoadingSetupData] = useState(true);
  const [isCheckingExistingSession, setIsCheckingExistingSession] = useState(true);
  const [isPreparingSession, setIsPreparingSession] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [stepAudioError, setStepAudioError] = useState<string | null>(null);
  const [showExistingSessionModal, setShowExistingSessionModal] = useState(false);
  const [existingSessionModalMode, setExistingSessionModalMode] = useState<'entry' | 'start'>('entry');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showStepTutorialModal, setShowStepTutorialModal] = useState(false);
  const [stepTutorialContent, setStepTutorialContent] = useState<MusicStepTutorial | null>(null);
  const [stepTutorialVersion, setStepTutorialVersion] = useState(0);
  const [activeButtonTutorialKey, setActiveButtonTutorialKey] = useState<MusicButtonTutorialKey | null>(null);
  const [buttonTutorialStep, setButtonTutorialStep] = useState<number | null>(null);
  const [buttonTutorialVersion, setButtonTutorialVersion] = useState(0);
  const [buttonTooltipConfig, setButtonTooltipConfig] = useState<{
    open: boolean;
    text: string;
    top: number;
    left: number;
    arrowTop?: string | number;
  }>({ open: false, text: '', top: 0, left: 0, arrowTop: '50%' });
  const [isLoadingCurrentMusic, setIsLoadingCurrentMusic] = useState(false);
  const [previewVisibleIds, setPreviewVisibleIds] = useState<number[]>([]);
  const [previewLoadingIds, setPreviewLoadingIds] = useState<number[]>([]);
  const [monitorMode, setMonitorMode] = useState<MonitorMode>('none');
  const [metronomeConfig, setMetronomeConfig] = useState<MetronomeConfig>(() => createInitialMetronomeConfig(null));
  const [voiceMonitoring, setVoiceMonitoring] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);
  const [stepCountdown, setStepCountdown] = useState<number | null>(null);
  const [countdownLabel, setCountdownLabel] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isMicPaused, setIsMicPaused] = useState(false);
  const [hasStartedCurrentTake, setHasStartedCurrentTake] = useState(false);
  const [hasTriggeredListenPlayback, setHasTriggeredListenPlayback] = useState(false);
  const [timer, setTimer] = useState(0);
  const [dbfs, setDbfs] = useState(-100);
  const [phraseFontSize, setPhraseFontSize] = useState(34);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isDyslexicFont, setIsDyslexicFont] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const [micPreviewReady, setMicPreviewReady] = useState(false);
  const [micPreviewLoading, setMicPreviewLoading] = useState(false);
  const [pendingReviewBlob, setPendingReviewBlob] = useState<Blob | null>(null);
  const [pendingReviewUrl, setPendingReviewUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedAudioUrlsRef = useRef<Set<string>>(new Set());
  const preloadedAudioElementsRef = useRef<HTMLAudioElement[]>([]);
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
  const currentStepRef = useRef<SessionStep | null>(null);
  const seenTutorialKeysRef = useRef<Set<string>>(new Set());
  const seenButtonTutorialKeysRef = useRef<Set<MusicButtonTutorialKey>>(new Set());

  const dyslexicButtonRef = useRef<HTMLButtonElement | null>(null);
  const contrastButtonRef = useRef<HTMLButtonElement | null>(null);
  const fontSizeButtonRef = useRef<HTMLButtonElement | null>(null);
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const restartButtonRef = useRef<HTMLButtonElement | null>(null);
  const mainActionButtonRef = useRef<HTMLButtonElement | null>(null);
  const skipButtonRef = useRef<HTMLButtonElement | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);

  const currentStep = steps[currentStepIndex] || null;
  const currentStepId = currentStep?.id || null;
  const currentStepType = currentStep?.type || null;
  const currentStepMusicId = currentStep?.musicId || null;
  const currentStepTheme = useMemo(() => getStepTheme(currentStep), [currentStep]);
  const currentButtonTutorialKey = useMemo<MusicButtonTutorialKey | null>(() => {
    if (!currentStep) return null;
    if (currentStep.type === 'phrase') return 'phrase-controls';
    if (currentStep.type === 'listen') return 'listen-controls';
    if (currentStep.type === 'record') return 'record-controls';
    return null;
  }, [currentStep]);
  const isSessionStarted = steps.length > 0 && !!session;
  const isLastStep = steps.length > 0 && currentStepIndex === steps.length - 1;
  const canUseVoiceMonitoring = currentStep?.type === 'record';
  const selectedPackageConfig = useMemo(() => getPackageConfig(setup.packageKey), [setup.packageKey]);

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

  const selectedMusicSummaries = useMemo(() => {
    return setup.selectedMusicIds
      .map(musicId => musics.find(item => item.id === musicId))
      .filter((item): item is MusicListItem => !!item);
  }, [musics, setup.selectedMusicIds]);

  const genreOptions = useMemo(() => {
    return Array.from(
      new Set(
        musics
          .map(item => item.genero?.trim())
          .filter((item): item is string => !!item),
      ),
    ).sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }));
  }, [musics]);

  const filteredMusics = useMemo(() => {
    const normalizedSearchTerms = setup.searchTerm
      .trim()
      .toLocaleLowerCase('pt-BR')
      .split(/\s+/)
      .filter(Boolean);
    const normalizedGenre = setup.genreFilter.trim().toLocaleLowerCase('pt-BR');

    return [...musics]
      .filter((music) => {
        const searchableText = [music.nome, music.genero]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR');
        const matchesSearch = normalizedSearchTerms.length === 0
          || normalizedSearchTerms.every(term => searchableText.includes(term));
        const matchesGenre = !normalizedGenre
          || music.genero.toLocaleLowerCase('pt-BR') === normalizedGenre;
        return matchesSearch && matchesGenre;
      })
      .sort((left, right) => {
        if (setup.sortBy === 'selected') {
          const leftOrder = selectedMusicMap[left.id] ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = selectedMusicMap[right.id] ?? Number.MAX_SAFE_INTEGER;
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }
        }

        if (setup.sortBy === 'recent') {
          return right.id - left.id;
        }

        if (setup.sortBy === 'genre') {
          const genreCompare = (left.genero || '').localeCompare(right.genero || '', 'pt-BR', { sensitivity: 'base' });
          if (genreCompare !== 0) {
            return genreCompare;
          }
        }

        return left.nome.localeCompare(right.nome, 'pt-BR', { sensitivity: 'base' });
      });
  }, [musics, selectedMusicMap, setup.genreFilter, setup.searchTerm, setup.sortBy]);

  const listeningUnavailable = currentStep?.type === 'listen' && !currentMusicDetail?.vocal_audio_url;
  const showRecordSetup = currentStep?.type === 'record' && stepCountdown === null && (!hasStartedCurrentTake || isMicPaused || !isRecording);
  const isRecordPreStart = currentStep?.type === 'record' && !hasStartedCurrentTake;
  const emphasizeRecordStart = currentStep?.type === 'record' && !hasStartedCurrentTake && stepCountdown === null;
  const isButtonTutorialActive = buttonTutorialStep !== null && buttonTooltipConfig.open;

  const currentListenEnded = useMemo(() => {
    return musicProgress >= 99.5 && !isMusicPlaying;
  }, [isMusicPlaying, musicProgress]);

  const currentTimeSignatureLabel = useMemo(() => {
    return getDisplayTimeSignature(currentMusicDetail?.time_signature);
  }, [currentMusicDetail?.time_signature]);

  const recordSessionSummary = useMemo(() => {
    if (!currentStep || currentStep.type !== 'record') return '';

    const monitorSummary = monitorMode === 'instrumental'
      ? 'Instrumental'
      : monitorMode === 'vocal'
        ? 'Música original'
        : 'Sem música de fundo';

    const metronomeSummary = metronomeConfig.enabled
      ? `Metrônomo ${metronomeConfig.bpm || formatBpmLabel(currentMusicDetail?.bpm)} / ${getDisplayTimeSignature(metronomeConfig.timeSignature)}`
      : 'Metrônomo desligado';

    const voiceSummary = voiceMonitoring ? 'Retorno de voz ligado' : 'Retorno de voz desligado';

    return `${monitorSummary} • ${metronomeSummary} • ${voiceSummary}`;
  }, [currentMusicDetail?.bpm, currentStep, metronomeConfig.bpm, metronomeConfig.enabled, metronomeConfig.timeSignature, monitorMode, voiceMonitoring]);

  const micSignalDetected = useMemo(() => dbfs > -55, [dbfs]);

  useEffect(() => {
    musicDetailsRef.current = musicDetails;
  }, [musicDetails]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

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
    setCountdownLabel(null);
  }, []);

  const beginStepCountdown = useCallback((onComplete: () => void | Promise<void>, label?: string) => {
    clearStepCountdown();
    setStepCountdown(3);
    setCountdownLabel(label || null);

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
    const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    setCountdownLabel('Contagem do metrônomo');
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
    setCountdownLabel(null);
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
    setHasTriggeredListenPlayback(false);
  }, [cleanupLiveIndicators]);

  const clearPendingReview = useCallback(() => {
    setPendingReviewBlob(null);
    setPendingReviewUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
  }, []);

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

    const shouldReload = loadedAudioUrlRef.current !== url;

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

  const primeAudioUrl = useCallback((url: string | null, restart = false) => {
    if (!url) return;
    loadAudioSource(url, restart);
  }, [loadAudioSource]);

  const preloadAudioUrl = useCallback((url: string | null | undefined) => {
    if (!url || preloadedAudioUrlsRef.current.has(url)) return;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    audio.load();

    preloadedAudioUrlsRef.current.add(url);
    preloadedAudioElementsRef.current.push(audio);
  }, []);

  const preloadMusicAudio = useCallback((music: MusicDetails | null | undefined) => {
    if (!music) return;

    preloadAudioUrl(music.vocal_audio_url);
    preloadAudioUrl(music.instrumental_audio_url);
  }, [preloadAudioUrl]);

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

      canvasContext.fillStyle = '#101217';
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);
      canvasContext.lineWidth = 2;
      canvasContext.strokeStyle = '#5ed1ff';
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

    const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

  const prepareMicPreview = useCallback(async () => {
    setMicPreviewLoading(true);
    try {
      await ensureMicrophoneReady();
      if (!animationFrameRef.current) {
        window.requestAnimationFrame(() => {
          drawMicWave();
        });
      }
      setMicPreviewReady(true);
      setRuntimeError(null);
    } catch (error) {
      console.error('Não foi possível preparar o pré-teste do microfone:', error);
      setMicPreviewReady(false);
      setRuntimeError('Não foi possível preparar o microfone para a gravação.');
    } finally {
      setMicPreviewLoading(false);
    }
  }, [drawMicWave, ensureMicrophoneReady]);

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

      clearPendingReview();
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
      window.requestAnimationFrame(() => {
        drawMicWave();
      });

      if (canUseVoiceMonitoring && voiceMonitoring) {
        await syncVoiceMonitorAudio(true);
      }
    } catch (error) {
      console.error('Não foi possível iniciar a gravação:', error);
      setRuntimeError('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
      cleanupStream();
      cleanupLiveIndicators();
    }
  }, [canUseVoiceMonitoring, cleanupLiveIndicators, cleanupStream, clearPendingReview, drawMicWave, ensureMicrophoneReady, finalizeRecording, syncVoiceMonitorAudio, voiceMonitoring]);

  const getAudioDataAndMetadata = useCallback((audioBlob: Blob): Promise<{ duration: number; sampleRate: number; buffer: AudioBuffer }> => {
    return new Promise((resolve, reject) => {
      const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) {
        reject(new Error('AudioContext não suportado neste navegador.'));
        return;
      }

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
    if (cached) {
      preloadMusicAudio(cached);
      return cached;
    }

    const detail = await api.getMusic(musicId);
    preloadMusicAudio(detail);

    musicDetailsRef.current = {
      ...musicDetailsRef.current,
      [musicId]: detail,
    };

    setMusicDetails(previous => ({
      ...previous,
      [musicId]: detail,
    }));

    return detail;
  }, [preloadMusicAudio]);

  useEffect(() => {
    if (setup.selectedMusicIds.length === 0) return;

    setup.selectedMusicIds.forEach((musicId) => {
      void ensureMusicDetails(musicId).catch((error) => {
        console.warn(`Falha ao pré-carregar áudio da música ${musicId}:`, error);
      });
    });
  }, [ensureMusicDetails, setup.selectedMusicIds]);

  useEffect(() => {
    if (currentStepType === 'listen') {
      const vocalUrl = currentMusicDetail?.vocal_audio_url || null;
      preloadAudioUrl(vocalUrl);
      primeAudioUrl(vocalUrl, true);
      return;
    }

    if (currentStepType === 'record') {
      preloadAudioUrl(selectedMonitorUrl);
      primeAudioUrl(selectedMonitorUrl, false);
    }
  }, [
    currentMusicDetail?.vocal_audio_url,
    currentStepId,
    currentStepType,
    preloadAudioUrl,
    primeAudioUrl,
    selectedMonitorUrl,
  ]);

  const loadSetupData = useCallback(async () => {
    setIsLoadingSetupData(true);
    setSetupError(null);

    try {
      const [musicList, blockResponse, datasetResponse] = await Promise.all([
        api.listMusics(),
        fetch(`${window.location.origin}/block.csv`),
        fetch(`${window.location.origin}/11_voz_geral_10m.csv`),
      ]);

      if (!blockResponse.ok || !datasetResponse.ok) {
        throw new Error('Não foi possível carregar as referências locais de frases.');
      }

      const blockText = await blockResponse.text();
      const datasetText = await datasetResponse.text();
      const blockMap = new Map<number, BlockMeta>();

      blockText
        .trim()
        .split('\n')
        .slice(1)
        .forEach((line) => {
          const parts = line.split(',');
          const blockId = Number(parts[0]);
          const name = parts[1]?.replace(/"/g, '').trim() || `Bloco ${blockId}`;
          const emotion = Number(parts[2] ?? 0);
          const isSpontaneous = parts[3]?.trim() === '1';

          if (Number.isFinite(blockId)) {
            blockMap.set(blockId, { blockId, name, emotion, isSpontaneous });
          }
        });

      const datasetRows = datasetText
        .trim()
        .split('\n')
        .slice(1)
        .map((line) => {
          const [, text, blockId] = parseCsvLine(line);
          return {
            text,
            blockId: Number(blockId),
          } as DatasetPhraseRow;
        })
        .filter(row => Number.isFinite(row.blockId) && row.text.trim().length > 0);

      const nextNeutralPhrasePool = uniquePhrases(
        datasetRows
          .filter(row => row.blockId === 2)
          .map(row => row.text),
      );

      const emotionalBlockIds = Array.from(
        new Set(
          datasetRows
            .filter((row) => {
              const meta = blockMap.get(row.blockId);
              return Boolean(meta && meta.emotion > 0 && !meta.isSpontaneous);
            })
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
        .filter(group => group.phrases.length > 0)
        .sort((left, right) => left.label.localeCompare(right.label, 'pt-BR', { sensitivity: 'base' }));

      setMusics(musicList);
      setNeutralPhrasePool(nextNeutralPhrasePool);
      setEmotionPhraseGroups(nextEmotionPhraseGroups);
    } catch (error) {
      console.error('Falha ao carregar a configuração da sessão de música:', error);
      setSetupError('Não foi possível carregar as músicas ou o conjunto padrão de frases.');
    } finally {
      setIsLoadingSetupData(false);
    }
  }, []);

  const buildSteps = useCallback(async (state: SetupFormState): Promise<SessionStep[]> => {
    const draftSteps: DraftStep[] = [];
    const selectedSongs = state.selectedMusicIds
      .map(musicId => musics.find(item => item.id === musicId))
      .filter((item): item is MusicListItem => !!item);

    draftSteps.push(
      ...buildPhraseDrafts({
        idPrefix: 'neutral',
        category: 'neutral',
        title: 'Frase neutra',
        helperText: 'Aquecimento neutro padrão',
        pool: neutralPhrasePool,
        count: STANDARD_NEUTRAL_PHRASE_COUNT,
      }),
    );

    emotionPhraseGroups.forEach((group) => {
      draftSteps.push(
        ...buildPhraseDrafts({
          idPrefix: group.key,
          category: 'emotional',
          title: `Emoção: ${group.label}`,
          helperText: group.label,
          pool: group.phrases,
          count: STANDARD_EMOTIONAL_PHRASE_COUNT,
        }),
      );
    });

    for (const music of selectedSongs) {
      let detail: MusicDetails | null = null;

      try {
        detail = await ensureMusicDetails(music.id);
      } catch (error) {
        console.warn(`Falha ao carregar a letra da música ${music.id}:`, error);
      }

      if (detail?.texto) {
        draftSteps.push(
          ...buildPhraseDrafts({
            idPrefix: `lyric-${music.id}`,
            category: 'lyric',
            title: `Frase da música: ${music.nome}`,
            helperText: 'Trecho da letra da música',
            pool: splitMusicTextIntoPrompts(detail.texto),
            count: STANDARD_LYRIC_PHRASE_COUNT,
            musicId: music.id,
            musicName: music.nome,
          }),
        );
      }

      draftSteps.push({
        id: `listen-${music.id}`,
        type: 'listen',
        title: `Ouvir música original: ${music.nome}`,
        description: 'Use a contagem inicial e escute a faixa original antes de cantar.',
        musicId: music.id,
        musicName: music.nome,
      });

      draftSteps.push({
        id: `record-${music.id}`,
        type: 'record',
        title: `Gravar música: ${music.nome}`,
        description: 'Defina retorno, metrônomo e grave a sua interpretação.',
        musicId: music.id,
        musicName: music.nome,
      });
    }

    return draftSteps.map((step, index) => ({
      ...step,
      order: index + 1,
      blockId: index + 1,
    })) as SessionStep[];
  }, [emotionPhraseGroups, ensureMusicDetails, musics, neutralPhrasePool]);

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

    setCurrentStepIndex(previous => previous + 1);
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

    if (pendingReviewBlob) {
      setIsProcessing(true);
      setRuntimeError(null);

      try {
        await uploadStepRecording(currentStep, pendingReviewBlob);
        clearPendingReview();
        resetTakeState();
        await advanceToNextStep();
      } catch (error) {
        console.error('Falha ao salvar a etapa atual da sessão de música:', error);
        setRuntimeError('Não foi possível salvar a gravação atual. Tente novamente.');
      } finally {
        setIsProcessing(false);
      }
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

      if (currentStep.type === 'record') {
        clearPendingReview();
        setPendingReviewBlob(audioBlob);
        setPendingReviewUrl(URL.createObjectURL(audioBlob));
        resetTakeState();
        return;
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
  }, [advanceToNextStep, clearPendingReview, currentStep, finalizeRecording, hasStartedCurrentTake, pendingReviewBlob, resetTakeState, stopMetronome, stopMusicPlayback, uploadStepRecording]);

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

      if (selectedMonitorUrl) {
        primeAudioUrl(selectedMonitorUrl, restartMusic);
      }

      if (metronomeSession && metronomeSession.countInBars > 0) {
        void startCurrentRecordTake(restartMusic);
        return;
      }

      beginStepCountdown(() => startCurrentRecordTake(restartMusic), 'A gravação vai começar');
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : 'Não foi possível iniciar a gravação.');
    }
  }, [beginStepCountdown, primeAudioUrl, resolveMetronomeConfig, selectedMonitorUrl, startCurrentRecordTake]);

  const queueListenPlayback = useCallback((restart = false) => {
    const vocalUrl = currentMusicDetail?.vocal_audio_url || null;
    if (!vocalUrl) return;

    setRuntimeError(null);
    setHasTriggeredListenPlayback(true);
    primeAudioUrl(vocalUrl, restart);
    beginStepCountdown(() => playAudioUrl(vocalUrl, restart), 'A música vai começar');
  }, [beginStepCountdown, currentMusicDetail?.vocal_audio_url, playAudioUrl, primeAudioUrl]);

  const handleToggleMainAction = useCallback(async () => {
    if (!currentStep) return;

    if (currentStep.type === 'listen') {
      const vocalUrl = currentMusicDetail?.vocal_audio_url || null;
      if (!vocalUrl) return;

      if (isMusicPlaying) {
        stopMusicPlayback(false);
        return;
      }

      if (currentListenEnded) {
        queueListenPlayback(true);
        return;
      }

      if (hasTriggeredListenPlayback && musicProgress > 0) {
        await playAudioUrl(vocalUrl, false);
        return;
      }

      queueListenPlayback(false);
      return;
    }

    if (currentStep.type === 'record') {
      const recorder = mediaRecorderRef.current;

      if (!hasStartedCurrentTake) {
        if (pendingReviewBlob) {
          clearPendingReview();
        }
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
  }, [
    clearPendingReview,
    currentListenEnded,
    currentMusicDetail?.vocal_audio_url,
    currentStep,
    hasStartedCurrentTake,
    hasTriggeredListenPlayback,
    isMusicPlaying,
    mediaRecorderRef,
    musicProgress,
    pendingReviewBlob,
    playAudioUrl,
    queueCurrentRecordTake,
    queueListenPlayback,
    resolveMetronomeConfig,
    selectedMonitorUrl,
    startMetronomeLoop,
    startRecording,
    stopMetronome,
    stopMusicPlayback,
  ]);

  const handleRestartCurrentStep = useCallback(async () => {
    if (!currentStep) return;

    setRuntimeError(null);
    setStepAudioError(null);
    clearPendingReview();

    if (currentStep.type === 'listen') {
      stopMusicPlayback(true);
      queueListenPlayback(true);
      return;
    }

    await finalizeRecording(true);
    resetTakeState();
    stopMusicPlayback(true);
    stopMetronome();

    if (currentStep.type === 'record') {
      return;
    }

    window.setTimeout(() => {
      void startRecording();
    }, 150);
  }, [clearPendingReview, currentStep, finalizeRecording, queueListenPlayback, resetTakeState, startRecording, stopMetronome, stopMusicPlayback]);

  const replaceCurrentPhrase = useCallback(() => {
    const step = currentStep;
    if (!step || step.type !== 'phrase') return false;

    if (step.alternatives.length === 0) {
      return false;
    }

    const [nextPrompt, ...remainingAlternatives] = step.alternatives;

    setSteps(previous => previous.map((item, index) => {
      if (index !== currentStepIndex || item.type !== 'phrase') {
        return item;
      }

      return {
        ...item,
        prompt: nextPrompt,
        alternatives: remainingAlternatives,
      };
    }));

    setSkipCount(previous => previous + 1);
    window.setTimeout(() => {
      void startRecording();
    }, 150);

    return true;
  }, [currentStep, currentStepIndex, startRecording]);

  const handleSkipCurrentStep = useCallback(async () => {
    if (!currentStep) return;

    setRuntimeError(null);
    setStepAudioError(null);
    clearPendingReview();
    stopMusicPlayback(true);
    stopMetronome();
    await finalizeRecording(true);
    resetTakeState();

    if (currentStep.type === 'phrase') {
      if (skipCount < 2) {
        const replaced = replaceCurrentPhrase();
        if (replaced) {
          return;
        }
      }

      setSkipCount(0);
      await advanceToNextStep();
      return;
    }

    await advanceToNextStep();
  }, [advanceToNextStep, clearPendingReview, currentStep, finalizeRecording, replaceCurrentPhrase, resetTakeState, skipCount, stopMetronome, stopMusicPlayback]);

  const handleGoBack = useCallback(async () => {
    if (currentStepIndex === 0) return;

    setRuntimeError(null);
    setStepAudioError(null);
    clearPendingReview();
    stopMusicPlayback(true);
    stopMetronome();
    await finalizeRecording(true);
    resetTakeState();
    setCurrentStepIndex(previous => Math.max(0, previous - 1));
  }, [clearPendingReview, currentStepIndex, finalizeRecording, resetTakeState, stopMetronome, stopMusicPlayback]);

  const handleStartSession = useCallback(async () => {
    const packageConfig = getPackageConfig(setup.packageKey);
    const selectedCount = setup.selectedMusicIds.length;

    if (selectedCount < packageConfig.minSongs) {
      setSetupError(`O pacote ${packageConfig.label.toLowerCase()} precisa de ${formatPackageRule(packageConfig)}.`);
      return;
    }

    if (packageConfig.maxSongs !== null && selectedCount > packageConfig.maxSongs) {
      setSetupError(`O pacote ${packageConfig.label.toLowerCase()} aceita no máximo ${packageConfig.maxSongs} músicas.`);
      return;
    }

    if (neutralPhrasePool.length === 0 || emotionPhraseGroups.length === 0) {
      setSetupError('As frases padrão ainda não foram carregadas. Atualize a página e tente novamente.');
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
      const newSession = session || await api.createSession(MUSIC_DATASET_ID, true, { session_type: 'music' });

      setSession(newSession);
      setSteps(preparedSteps);
      saveStoredMusicSessionSetup(newSession.id, setup);
      setCurrentStepIndex(session ? Math.max(0, Math.min(session.numero_frase || 0, preparedSteps.length - 1)) : 0);
      setRuntimeError(null);
    } catch (error: unknown) {
      const errorWithSession = error as Error & { session?: SessionResponse };
      const hasExistingSession = !!errorWithSession.session;

      if (hasExistingSession) {
        setExistingSessionInfo(errorWithSession.session || null);
        setExistingSessionModalMode('start');
        setShowExistingSessionModal(true);
      } else {
        console.error('Falha ao preparar a sessão de música:', error);
        setSetupError(errorWithSession.message || 'Não foi possível iniciar a sessão de música.');
      }
    } finally {
      setIsPreparingSession(false);
    }
  }, [buildSteps, emotionPhraseGroups.length, neutralPhrasePool.length, session, setup]);

  const handleFinalizeCurrentAndStartNew = useCallback(async () => {
    if (!existingSessionInfo) return;

    setIsProcessing(true);
    try {
      stopMetronome();
      await api.put(`/sessions/${existingSessionInfo.id}`, {
        ...existingSessionInfo,
        status: 'finished',
        finished_at: new Date().toISOString(),
      });

      if (pendingStepsRef.current.length > 0) {
        const newSession = await api.createSession(MUSIC_DATASET_ID, true, { session_type: 'music' });
        setSession(newSession);
        setSteps(pendingStepsRef.current);
        saveStoredMusicSessionSetup(newSession.id, setup);
        setCurrentStepIndex(0);
      } else {
        setSession(null);
        setSteps([]);
        setCurrentStepIndex(0);
      }

      setExistingSessionInfo(null);
      setShowExistingSessionModal(false);
      setRuntimeError(null);
      setSetupError(null);
    } catch (error) {
      console.error('Falha ao trocar a sessão de música ativa:', error);
      setSetupError('Não foi possível finalizar a sessão ativa e iniciar uma nova.');
    } finally {
      setIsProcessing(false);
    }
  }, [existingSessionInfo, setup, stopMetronome]);

  const handleResumeExistingSession = useCallback(async () => {
    if (!existingSessionInfo) return;

    setIsProcessing(true);
    setSetupError(null);

    try {
      let stepsToUse = pendingStepsRef.current;
      const storedSetup = getStoredMusicSessionSetup(existingSessionInfo.id);
      const resumeSetup = storedSetup || createResumeFallbackSetup(musics, existingSessionInfo.numero_frase || 0);

      if (stepsToUse.length === 0) {
        if (!resumeSetup || resumeSetup.selectedMusicIds.length === 0) {
          setSetupError('Não foi possível montar a sessão ativa porque nenhuma música está disponível.');
          return;
        }

        stepsToUse = await buildSteps(resumeSetup);
        pendingStepsRef.current = stepsToUse;
        setSetup(resumeSetup);
        saveStoredMusicSessionSetup(existingSessionInfo.id, resumeSetup);
      }

      if (stepsToUse.length === 0) {
        setSetupError('Não foi possível montar as etapas da sessão ativa.');
        return;
      }

      setSession(existingSessionInfo);
      setSteps(stepsToUse);
      setCurrentStepIndex(Math.max(0, Math.min(existingSessionInfo.numero_frase || 0, stepsToUse.length - 1)));
      setExistingSessionInfo(null);
      setShowExistingSessionModal(false);
      setRuntimeError(null);
      setSetupError(null);
    } catch (error) {
      console.error('Falha ao continuar sessão de música ativa:', error);
      setSetupError('Não foi possível continuar a sessão ativa. Tente selecionar as músicas novamente.');
    } finally {
      setIsProcessing(false);
    }
  }, [buildSteps, existingSessionInfo, musics]);

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

  const handleAdvanceSetupStage = useCallback(() => {
    setSetupStage('music');
    setSetupError(null);
  }, []);

  const handleBackToPackageStage = useCallback(() => {
    setSetupStage('package');
    setSetupError(null);
  }, []);

  const handleAdvanceToReviewStage = useCallback(() => {
    const packageConfig = getPackageConfig(setup.packageKey);
    const selectedCount = setup.selectedMusicIds.length;

    if (selectedCount < packageConfig.minSongs) {
      setSetupError(`O pacote ${packageConfig.label.toLowerCase()} precisa de ${formatPackageRule(packageConfig)}.`);
      return;
    }

    setSetupStage('review');
    setSetupError(null);
  }, [setup.packageKey, setup.selectedMusicIds.length]);

  const handleBackToMusicStage = useCallback(() => {
    setSetupStage('music');
    setSetupError(null);
  }, []);

  const handleCloseStepTutorial = useCallback(() => {
    if (stepTutorialContent) {
      seenTutorialKeysRef.current.add(stepTutorialContent.key);
    }

    setShowStepTutorialModal(false);
    setStepTutorialVersion(previous => previous + 1);
  }, [stepTutorialContent]);

  const handleNextButtonTutorialStep = useCallback(() => {
    if (!activeButtonTutorialKey || buttonTutorialStep === null) return;

    const totalSteps = activeButtonTutorialKey === 'phrase-controls'
      ? 6
      : activeButtonTutorialKey === 'listen-controls'
        ? 5
        : 5;

    if (buttonTutorialStep >= totalSteps - 1) {
      seenButtonTutorialKeysRef.current.add(activeButtonTutorialKey);
      setActiveButtonTutorialKey(null);
      setButtonTutorialStep(null);
      setButtonTooltipConfig(previous => ({ ...previous, open: false }));
      setButtonTutorialVersion(previous => previous + 1);
      return;
    }

    setButtonTutorialStep(previous => (previous === null ? null : previous + 1));
  }, [activeButtonTutorialKey, buttonTutorialStep]);

  const handleSkipButtonTutorial = useCallback(() => {
    if (!activeButtonTutorialKey) return;

    seenButtonTutorialKeysRef.current.add(activeButtonTutorialKey);
    setActiveButtonTutorialKey(null);
    setButtonTutorialStep(null);
    setButtonTooltipConfig(previous => ({ ...previous, open: false }));
    setButtonTutorialVersion(previous => previous + 1);
  }, [activeButtonTutorialKey]);

  const handlePackageChange = useCallback((packageKey: SessionPackageKey) => {
    const nextConfig = getPackageConfig(packageKey);
    const nextSelectedIds = nextConfig.maxSongs === null
      ? setup.selectedMusicIds
      : setup.selectedMusicIds.slice(0, nextConfig.maxSongs);

    setSetup(previous => ({
      ...previous,
      packageKey,
      selectedMusicIds: nextSelectedIds,
    }));

    setPreviewVisibleIds(previous => previous.filter(id => nextSelectedIds.includes(id)));
    setPreviewLoadingIds(previous => previous.filter(id => nextSelectedIds.includes(id)));

    if (nextSelectedIds.length !== setup.selectedMusicIds.length) {
      setSetupError(`O pacote ${nextConfig.label.toLowerCase()} permite ${formatPackageRule(nextConfig)}. A seleção foi ajustada.`);
    } else {
      setSetupError(null);
    }
  }, [setup.selectedMusicIds]);

  const handleSelectMusic = useCallback((musicId: number) => {
    const isSelected = setup.selectedMusicIds.includes(musicId);

    if (!isSelected && selectedPackageConfig.maxSongs !== null && setup.selectedMusicIds.length >= selectedPackageConfig.maxSongs) {
      setSetupError(`O pacote ${selectedPackageConfig.label.toLowerCase()} permite até ${selectedPackageConfig.maxSongs} músicas.`);
      return;
    }

    setSetup(previous => ({
      ...previous,
      selectedMusicIds: isSelected
        ? previous.selectedMusicIds.filter(id => id !== musicId)
        : [...previous.selectedMusicIds, musicId],
    }));

    setPreviewVisibleIds(previous => previous.filter(id => id !== musicId));
    setPreviewLoadingIds(previous => previous.filter(id => id !== musicId));
    setSetupError(null);
  }, [selectedPackageConfig.label, selectedPackageConfig.maxSongs, setup.selectedMusicIds]);

  const handleMoveSelectedMusic = useCallback((musicId: number, direction: 'up' | 'down') => {
    setSetup((previous) => {
      const currentIndex = previous.selectedMusicIds.indexOf(musicId);
      if (currentIndex === -1) return previous;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= previous.selectedMusicIds.length) {
        return previous;
      }

      const nextSelectedMusicIds = [...previous.selectedMusicIds];
      const [movedId] = nextSelectedMusicIds.splice(currentIndex, 1);
      nextSelectedMusicIds.splice(targetIndex, 0, movedId);

      return {
        ...previous,
        selectedMusicIds: nextSelectedMusicIds,
      };
    });
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

  const handleMusicAdminFieldChange = useCallback((field: keyof MusicAdminFormState, value: string | File | null) => {
    setMusicAdminForm(previous => ({
      ...previous,
      [field]: value,
    }));
    setMusicAdminStatus(null);
  }, []);

  const handleCreateMusic = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    const nome = musicAdminForm.nome.trim();
    const genero = musicAdminForm.genero.trim();
    const timeSignature = musicAdminForm.timeSignature.trim();
    const bpmText = musicAdminForm.bpm.trim();
    const parsedBpm = bpmText ? Number(bpmText) : null;

    if (!nome || !genero) {
      setMusicAdminStatus({ type: 'error', message: 'Informe o nome e o gênero da música.' });
      return;
    }

    if (bpmText && (parsedBpm === null || !Number.isFinite(parsedBpm) || parsedBpm <= 0)) {
      setMusicAdminStatus({ type: 'error', message: 'Informe um BPM válido ou deixe o campo vazio.' });
      return;
    }

    const bpm = parsedBpm;

    setIsSavingMusic(true);
    setMusicAdminStatus(null);

    try {
      const createdMusic = await api.createMusic({
        nome,
        genero,
        texto: musicAdminForm.texto.trim(),
        bpm,
        time_signature: timeSignature || null,
        vocal_audio_file: musicAdminForm.vocalAudioFile,
        instrumental_audio_file: musicAdminForm.instrumentalAudioFile,
      });

      setMusics(previous => [
        createdMusic,
        ...previous.filter(item => item.id !== createdMusic.id),
      ]);
      setMusicDetails(previous => ({
        ...previous,
        [createdMusic.id]: createdMusic,
      }));
      musicDetailsRef.current = {
        ...musicDetailsRef.current,
        [createdMusic.id]: createdMusic,
      };

      setSetup(previous => ({
        ...previous,
        sortBy: 'recent',
      }));
      setMusicAdminForm(createInitialMusicAdminForm());
      setMusicAdminStatus({ type: 'success', message: 'Música adicionada com sucesso.' });
    } catch (error: any) {
      console.error('Falha ao cadastrar música:', error);
      setMusicAdminStatus({ type: 'error', message: error.message || 'Não foi possível adicionar a música.' });
    } finally {
      setIsSavingMusic(false);
    }
  }, [musicAdminForm]);

  useEffect(() => {
    void loadSetupData();
  }, [loadSetupData]);

  useEffect(() => {
    let cancelled = false;

    const checkExistingMusicSession = async () => {
      setIsCheckingExistingSession(true);
      try {
        const currentUser = await api.getCurrentUser();
        const userSessions = await api.getUserSessions(currentUser.id);
        const activeMusicSession = userSessions.find(item => (
          item.dataset_id === MUSIC_DATASET_ID
          && item.status === 'active'
          && !item.finished_at
        ));

        if (!cancelled && activeMusicSession) {
          setExistingSessionInfo({
            id: activeMusicSession.id,
            user_id: activeMusicSession.user_id,
            dataset_id: activeMusicSession.dataset_id,
            started_at: activeMusicSession.started_at,
            finished_at: activeMusicSession.finished_at,
            notes: activeMusicSession.notes,
            status: 'active',
            numero_frase: activeMusicSession.numero_frase || 0,
          });
          setExistingSessionModalMode('entry');
          setShowExistingSessionModal(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Não foi possível verificar sessão de música ativa:', error);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingExistingSession(false);
        }
      }
    };

    void checkExistingMusicSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    clearPendingReview();
  }, [clearPendingReview, currentStepId]);

  useEffect(() => {
    setSkipCount(0);
  }, [currentStepId]);

  useEffect(() => {
    if (currentStep?.type !== 'record' || !showRecordSetup || stepCountdown !== null) {
      setMicPreviewReady(false);
      return;
    }

    void prepareMicPreview();
  }, [currentStep?.type, prepareMicPreview, showRecordSetup, stepCountdown]);

  useEffect(() => {
    if (buttonTutorialStep === null || !activeButtonTutorialKey) return;

    const config = {
      open: true,
      text: '',
      top: 0,
      left: 0,
      arrowTop: '50%' as string | number,
    };

    const resolveStep = () => {
      let rect: DOMRect | undefined;

      if (activeButtonTutorialKey === 'phrase-controls') {
        switch (buttonTutorialStep) {
          case 0:
            rect = dyslexicButtonRef.current?.getBoundingClientRect()
              || contrastButtonRef.current?.getBoundingClientRect()
              || fontSizeButtonRef.current?.getBoundingClientRect();
            config.text = 'Aqui você ajusta fonte, contraste e tamanho da frase para facilitar a leitura.';
            break;
          case 1:
            rect = mainActionButtonRef.current?.getBoundingClientRect();
            config.text = 'Este botão pausa ou retoma a leitura da frase atual.';
            break;
          case 2:
            rect = restartButtonRef.current?.getBoundingClientRect();
            config.text = 'Use aqui para recomeçar a frase atual desde o início.';
            break;
          case 3:
            rect = skipButtonRef.current?.getBoundingClientRect();
            config.text = 'Aqui você troca a frase ou pula a etapa atual se precisar.';
            break;
          case 4:
            rect = saveButtonRef.current?.getBoundingClientRect();
            config.text = 'Quando terminar, clique aqui para salvar e continuar.';
            break;
          case 5:
            rect = backButtonRef.current?.getBoundingClientRect();
            config.text = 'Este botão volta para a etapa anterior da sessão.';
            break;
          default:
            break;
        }
      }

      if (activeButtonTutorialKey === 'listen-controls') {
        switch (buttonTutorialStep) {
          case 0:
            rect = mainActionButtonRef.current?.getBoundingClientRect();
            config.text = 'Use este botão para tocar ou pausar a música original.';
            break;
          case 1:
            rect = restartButtonRef.current?.getBoundingClientRect();
            config.text = 'Aqui você ouve a música novamente desde o começo.';
            break;
          case 2:
            rect = saveButtonRef.current?.getBoundingClientRect();
            config.text = 'Quando terminar de ouvir, use este botão para ir para a gravação.';
            break;
          case 3:
            rect = skipButtonRef.current?.getBoundingClientRect();
            config.text = 'Se não quiser ouvir agora, você pode pular esta etapa aqui.';
            break;
          case 4:
            rect = backButtonRef.current?.getBoundingClientRect();
            config.text = 'Este botão volta para a etapa anterior.';
            break;
          default:
            break;
        }
      }

      if (activeButtonTutorialKey === 'record-controls') {
        switch (buttonTutorialStep) {
          case 0:
            rect = mainActionButtonRef.current?.getBoundingClientRect();
            config.text = 'Depois de ajustar tudo, clique aqui para começar a gravação. Durante a take, ele também pausa e retoma.';
            break;
          case 1:
            rect = restartButtonRef.current?.getBoundingClientRect();
            config.text = 'Use este botão para regravar a música atual desde o começo.';
            break;
          case 2:
            rect = saveButtonRef.current?.getBoundingClientRect();
            config.text = 'Quando terminar de cantar, clique aqui para salvar a take e continuar.';
            break;
          case 3:
            rect = skipButtonRef.current?.getBoundingClientRect();
            config.text = 'Se não quiser gravar esta música agora, você pode pular por aqui.';
            break;
          case 4:
            rect = backButtonRef.current?.getBoundingClientRect();
            config.text = 'Este botão volta para a etapa anterior da sessão.';
            break;
          default:
            break;
        }
      }

      if (!rect) {
        setButtonTooltipConfig(previous => ({ ...previous, open: false }));
        return;
      }

      setButtonTooltipConfig({
        ...config,
        top: rect.top + rect.height / 2,
        left: rect.right + 20,
      });
    };

    const timeoutId = window.setTimeout(resolveStep, 120);
    return () => clearTimeout(timeoutId);
  }, [activeButtonTutorialKey, buttonTutorialStep]);

  useEffect(() => {
    if (!currentStepId || !currentStepType) return;

    let cancelled = false;
    let timeoutId: number | undefined;
    const currentTutorial = currentStepRef.current ? getMusicStepTutorial(currentStepRef.current) : null;

    clearStepCountdown();
    stopMusicPlayback(true);
    stopMetronome();
    resetTakeState();
    setStepAudioError(null);
    setHasTriggeredListenPlayback(false);

    if (currentStepType !== 'record') {
      setVoiceMonitoring(false);
    }

    if (showStepTutorialModal) {
      return () => {
        cancelled = true;
      };
    }

    if (buttonTutorialStep !== null) {
      return () => {
        cancelled = true;
      };
    }

    if (currentTutorial && !seenTutorialKeysRef.current.has(currentTutorial.key)) {
      setStepTutorialContent(currentTutorial);
      setShowStepTutorialModal(true);
      return () => {
        cancelled = true;
      };
    }

    if (currentButtonTutorialKey && !seenButtonTutorialKeysRef.current.has(currentButtonTutorialKey)) {
      setActiveButtonTutorialKey(currentButtonTutorialKey);
      setButtonTutorialStep(0);
      return () => {
        cancelled = true;
      };
    }

    if (currentStepType === 'phrase') {
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

    if (!currentStepMusicId) return;

    setIsLoadingCurrentMusic(true);
    void ensureMusicDetails(currentStepMusicId)
      .then((detail) => {
        if (cancelled) return;

        setMetronomeConfig(createInitialMetronomeConfig(detail));

        if (currentStepType === 'record') {
          setMonitorMode(getDefaultMonitorMode(detail));
        } else {
          setMonitorMode('none');
          if (detail.vocal_audio_url) {
            setHasTriggeredListenPlayback(true);
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
  }, [beginStepCountdown, buttonTutorialStep, buttonTutorialVersion, clearStepCountdown, currentButtonTutorialKey, currentStepId, currentStepMusicId, currentStepType, ensureMusicDetails, playAudioUrl, resetTakeState, showStepTutorialModal, startRecording, stepTutorialVersion, stopMetronome, stopMusicPlayback]);

  useEffect(() => {
    if (!isRecording || isMicPaused) return;

    timerIntervalRef.current = setInterval(() => {
      setTimer(previous => previous + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isMicPaused, isRecording]);

  useEffect(() => {
    if (!isRecording || isMicPaused || timer < MAX_RECORDING_SECONDS || !currentStep || currentStep.type === 'listen') {
      return;
    }

    let cancelled = false;

    const stopAtDurationLimit = async () => {
      setIsProcessing(true);

      try {
        const audioBlob = await finalizeRecording(true);
        stopMusicPlayback(true);
        stopMetronome();

        if (cancelled) return;

        resetTakeState();

        if (!audioBlob || audioBlob.size === 0) {
          setRuntimeError('A gravação chegou ao limite de 1 minuto e 30 segundos, mas nenhum áudio foi capturado. Grave novamente.');
          return;
        }

        clearPendingReview();
        setPendingReviewBlob(audioBlob);
        setPendingReviewUrl(URL.createObjectURL(audioBlob));
        setRuntimeError('A gravação foi parada automaticamente ao atingir 1 minuto e 30 segundos. Revise, salve ou regrave antes de continuar.');
      } catch (error) {
        console.error('Falha ao parar gravação no limite de duração:', error);
        if (!cancelled) {
          setRuntimeError('Não foi possível encerrar a gravação automaticamente. Tente salvar ou regravar.');
        }
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
        }
      }
    };

    void stopAtDurationLimit();

    return () => {
      cancelled = true;
    };
  }, [
    clearPendingReview,
    currentStep,
    finalizeRecording,
    isMicPaused,
    isRecording,
    resetTakeState,
    stopMetronome,
    stopMusicPlayback,
    timer,
  ]);

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
    const preloadedAudioElements = preloadedAudioElementsRef.current;
    const preloadedAudioUrls = preloadedAudioUrlsRef.current;

    return () => {
      clearPendingReview();
      stopMusicPlayback(true);
      preloadedAudioElements.forEach((audio) => {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      });
      preloadedAudioElements.length = 0;
      preloadedAudioUrls.clear();
      stopMetronome();
      cleanupLiveIndicators();
      cleanupStream();
    };
  }, [cleanupLiveIndicators, cleanupStream, clearPendingReview, stopMetronome, stopMusicPlayback]);

  const mainToggleLabel = useMemo(() => {
    if (!currentStep) return 'Iniciar';
    if (stepCountdown !== null) return 'Preparando...';

    if (currentStep.type === 'listen') {
      if (isMusicPlaying) return 'Pausar música';
      if (hasTriggeredListenPlayback && musicProgress > 0 && !currentListenEnded) return 'Retomar música';
      return 'Iniciar audição';
    }

    if (!hasStartedCurrentTake) {
      return currentStep.type === 'record' ? 'Começar gravação' : 'Iniciar leitura';
    }

    if (currentStep.type === 'record') {
      return isMicPaused ? 'Retomar gravação' : 'Pausar gravação';
    }

    return isMicPaused ? 'Retomar' : 'Pausar';
  }, [currentListenEnded, currentStep, hasStartedCurrentTake, hasTriggeredListenPlayback, isMicPaused, isMusicPlaying, musicProgress, stepCountdown]);

  const restartLabel = useMemo(() => {
    if (!currentStep) return 'Recomeçar';
    if (currentStep.type === 'listen') return 'Ouvir novamente';
    if (currentStep.type === 'record') return 'Regravar música';
    return 'Regravar frase';
  }, [currentStep]);

  const skipLabel = useMemo(() => {
    if (!currentStep) return 'Pular';
    if (currentStep.type === 'record') return 'Pular música';
    if (currentStep.type === 'listen') return 'Pular audição';
    if (currentStep.alternatives.length === 0) return 'Pular frase';
    return `Trocar frase (${skipCount + 1}/3)`;
  }, [currentStep, skipCount]);

  const saveLabel = useMemo(() => {
    if (!currentStep) return 'Continuar';
    if (currentStep.type === 'listen') return 'Ir para gravação';
    if (pendingReviewBlob) return isLastStep ? 'Salvar definitivo e finalizar' : 'Salvar definitivo';
    if (isLastStep) return 'Salvar e finalizar';
    if (currentStep.type === 'record') return 'Salvar e próxima etapa';
    return 'Salvar e continuar';
  }, [currentStep, isLastStep, pendingReviewBlob]);

  const floatingAlerts = useMemo<FloatingAlertItem[]>(() => {
    const alerts: FloatingAlertItem[] = [];

    if (musicAdminStatus) {
      alerts.push({
        key: 'music-admin-status',
        severity: musicAdminStatus.type,
        message: musicAdminStatus.message,
      });
    }

    if (setupError) {
      const isSelectionWarning = setupError.toLocaleLowerCase('pt-BR').includes('pacote')
        || setupError.toLocaleLowerCase('pt-BR').includes('seleção')
        || setupError.toLocaleLowerCase('pt-BR').includes('músicas');

      alerts.push({
        key: 'setup-error',
        severity: isSelectionWarning ? 'warning' : 'error',
        message: setupError,
      });
    }

    if (runtimeError) {
      alerts.push({
        key: 'runtime-error',
        severity: runtimeError.includes('1 minuto e 30 segundos') ? 'warning' : 'error',
        message: runtimeError,
      });
    }

    if (stepAudioError) {
      alerts.push({
        key: 'step-audio-error',
        severity: 'error',
        message: stepAudioError,
      });
    }

    return alerts;
  }, [musicAdminStatus, runtimeError, setupError, stepAudioError]);

  const floatingAlertStack = floatingAlerts.length > 0 ? (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 2000,
        width: { xs: 'calc(100vw - 32px)', sm: 420 },
        pointerEvents: 'none',
      }}
    >
      <Stack spacing={1.25}>
        {floatingAlerts.map((item) => (
          <Alert
            key={item.key}
            severity={item.severity}
            variant="filled"
            sx={{
              borderRadius: 2,
              boxShadow: '0 14px 36px rgba(0, 0, 0, 0.22)',
              pointerEvents: 'auto',
              alignItems: 'center',
              fontWeight: 600,
              '& .MuiAlert-icon': {
                alignItems: 'center',
                fontSize: 24,
                opacity: 0.95,
              },
              '& .MuiAlert-message': {
                py: 0.5,
                lineHeight: 1.35,
              },
            }}
          >
            {item.message}
          </Alert>
        ))}
      </Stack>
    </Box>
  ) : null;

  if (!isSessionStarted) {
    return (
      <Container maxWidth="xl">
        {floatingAlertStack}
        <Modal open={showExistingSessionModal} onClose={() => undefined}>
          <Box sx={{ ...modalStyle, width: { xs: 'calc(100vw - 32px)', sm: 620 } }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 800 }}>
              Encontramos uma sessão de música em andamento
            </Typography>
            <Typography sx={{ mt: 2 }}>
              Este usuário já tem uma sessão ativa. Escolha se deseja continuar essa sessão ou encerrar a sessão anterior para configurar uma nova.
            </Typography>

            {existingSessionInfo && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Sessão ativa #{existingSessionInfo.id}. Progresso salvo até a etapa {Math.max(0, existingSessionInfo.numero_frase || 0)}.
              </Alert>
            )}

            <Alert severity="warning" sx={{ mt: 2 }}>
              Se você criar uma nova sessão, a sessão anterior será finalizada. Depois disso, ela não aparecerá mais como sessão ativa para continuar.
            </Alert>

            {existingSessionModalMode === 'entry' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Ao continuar, você volta para a tela de gravação no ponto salvo da sessão ativa.
              </Typography>
            )}

            <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <Button variant="contained" onClick={handleResumeExistingSession} disabled={isProcessing}>
                Continuar sessão ativa
              </Button>
              <Button variant="outlined" color="warning" onClick={handleFinalizeCurrentAndStartNew} disabled={isProcessing}>
                Encerrar anterior e criar nova
              </Button>
              <Button variant="outlined" color="error" onClick={() => navigate('/')} disabled={isProcessing} sx={{ gridColumn: { xs: 'auto', sm: '1 / -1' } }}>
                Voltar para a Home sem alterar nada
              </Button>
            </Box>
          </Box>
        </Modal>

        <Paper
          elevation={0}
          sx={{
            mt: 4,
            mb: 6,
            p: { xs: 2.5, md: 4 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(180deg, rgba(94,209,255,0.08) 0%, rgba(255,255,255,0) 28%)',
          }}
        >
          <Box sx={{ maxWidth: 860, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Sessão de Música
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Primeiro escolha o tamanho da sessão. Depois selecione as músicas e inicie a gravação.
            </Typography>
          </Box>

          {isLoadingSetupData || isCheckingExistingSession ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={3.5}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                  gap: 1.5,
                }}
              >
                {getSetupStageItems(setupStage).map((item) => (
                  <Paper
                    key={item.step}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      borderColor: item.active ? 'primary.main' : 'divider',
                      bgcolor: item.active ? 'action.selected' : 'background.paper',
                      opacity: item.active || item.done ? 1 : 0.72,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Etapa {item.step}{item.done ? ' • concluída' : ''}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {item.title}
                    </Typography>
                  </Paper>
                ))}
              </Box>

              {setupStage === 'package' ? (
                <>
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      1. Escolha o tamanho da sessão
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                        gap: 2,
                      }}
                    >
                      {MUSIC_SESSION_PACKAGES.map((packageOption) => {
                        const isActive = packageOption.key === setup.packageKey;

                        return (
                          <Paper
                            key={packageOption.key}
                            variant="outlined"
                            sx={{
                              p: 2.5,
                              borderRadius: 3,
                              borderColor: isActive ? 'primary.main' : 'divider',
                              bgcolor: isActive ? 'action.selected' : 'background.paper',
                            }}
                          >
                            <Stack spacing={1.25}>
                              <Box>
                                <Typography variant="h6">{packageOption.label}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {packageOption.description}
                                </Typography>
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {packageOption.helperText}
                              </Typography>
                              <Button
                                variant={isActive ? 'contained' : 'outlined'}
                                onClick={() => handlePackageChange(packageOption.key)}
                              >
                                {isActive ? 'Selecionado' : 'Usar este pacote'}
                              </Button>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Box>

                    {setupError && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {setupError}
                      </Alert>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" color="error" onClick={() => navigate('/')}>
                      Cancelar
                    </Button>
                    <Button variant="contained" onClick={handleAdvanceSetupStage}>
                      Continuar
                    </Button>
                  </Box>
                </>
              ) : setupStage === 'music' ? (
                <>
                  <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <Box>
                            <Typography variant="h6">
                              2. Escolha as músicas
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                              Pacote {selectedPackageConfig.label.toLowerCase()}: {formatPackageRule(selectedPackageConfig)}.
                            </Typography>
                          </Box>

                          {isAdmin && (
                            <Button
                              variant={showMusicAdminPanel ? 'contained' : 'outlined'}
                              startIcon={showMusicAdminPanel ? <AdminPanelSettingsIcon /> : <AddIcon />}
                              onClick={() => {
                                setShowMusicAdminPanel(previous => !previous);
                                setMusicAdminStatus(null);
                              }}
                            >
                              {showMusicAdminPanel ? 'Fechar admin' : 'Adicionar música'}
                            </Button>
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                          {isAdmin
                            ? 'Como administrador, você pode cadastrar músicas sem sair desta tela.'
                            : 'Selecione as músicas disponíveis para montar sua sessão.'}
                        </Typography>
                      </Box>

                      {setupError && (
                        <Alert severity="error">
                          {setupError}
                        </Alert>
                      )}

                      {isAdmin && showMusicAdminPanel && (
                        <Paper
                          component="form"
                          variant="outlined"
                          onSubmit={handleCreateMusic}
                          sx={{
                            p: { xs: 2, md: 2.5 },
                            borderRadius: 3,
                            bgcolor: 'rgba(25,118,210,0.04)',
                            borderColor: 'rgba(25,118,210,0.22)',
                          }}
                        >
                          <Stack spacing={2}>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                Cadastrar nova música
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Preencha os dados principais e envie os arquivos de áudio quando estiverem disponíveis.
                              </Typography>
                            </Box>

                            {musicAdminStatus && (
                              <Alert severity={musicAdminStatus.type}>
                                {musicAdminStatus.message}
                              </Alert>
                            )}

                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.2fr) minmax(0, 0.8fr)' },
                                gap: 2,
                              }}
                            >
                              <TextField
                                label="Nome da música"
                                value={musicAdminForm.nome}
                                onChange={(event) => handleMusicAdminFieldChange('nome', event.target.value)}
                                required
                                fullWidth
                              />
                              <TextField
                                label="Gênero"
                                value={musicAdminForm.genero}
                                onChange={(event) => handleMusicAdminFieldChange('genero', event.target.value)}
                                required
                                fullWidth
                              />
                            </Box>

                            <TextField
                              label="Letra ou trechos para leitura"
                              value={musicAdminForm.texto}
                              onChange={(event) => handleMusicAdminFieldChange('texto', event.target.value)}
                              multiline
                              minRows={4}
                              fullWidth
                            />

                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 0.8fr) minmax(0, 0.8fr)' },
                                gap: 2,
                              }}
                            >
                              <TextField
                                label="BPM"
                                type="number"
                                value={musicAdminForm.bpm}
                                onChange={(event) => handleMusicAdminFieldChange('bpm', event.target.value)}
                                inputProps={{ min: 1 }}
                                fullWidth
                              />
                              <TextField
                                label="Compasso"
                                placeholder="Ex.: 4/4"
                                value={musicAdminForm.timeSignature}
                                onChange={(event) => handleMusicAdminFieldChange('timeSignature', event.target.value)}
                                fullWidth
                              />
                            </Box>

                            <Divider />

                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                                gap: 2,
                              }}
                            >
                              <TextField
                                label="Áudio original com voz"
                                type="file"
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ accept: 'audio/*' }}
                                onChange={(event) => {
                                  const input = event.target as HTMLInputElement;
                                  handleMusicAdminFieldChange('vocalAudioFile', input.files?.[0] || null);
                                }}
                                helperText={musicAdminForm.vocalAudioFile?.name || 'Opcional'}
                                fullWidth
                              />
                              <TextField
                                label="Áudio instrumental"
                                type="file"
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ accept: 'audio/*' }}
                                onChange={(event) => {
                                  const input = event.target as HTMLInputElement;
                                  handleMusicAdminFieldChange('instrumentalAudioFile', input.files?.[0] || null);
                                }}
                                helperText={musicAdminForm.instrumentalAudioFile?.name || 'Opcional'}
                                fullWidth
                              />
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, flexWrap: 'wrap' }}>
                              <Button
                                type="button"
                                variant="outlined"
                                onClick={() => {
                                  setMusicAdminForm(createInitialMusicAdminForm());
                                  setMusicAdminStatus(null);
                                }}
                                disabled={isSavingMusic}
                              >
                                Limpar
                              </Button>
                              <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={isSavingMusic}>
                                {isSavingMusic ? 'Salvando...' : 'Salvar música'}
                              </Button>
                            </Box>
                          </Stack>
                        </Paper>
                      )}

                      <Paper
                        variant="outlined"
                        sx={{
                          px: 1.5,
                          py: 1,
                          borderRadius: 2.5,
                          bgcolor: 'background.default',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Selecionadas
                        </Typography>
                        <Typography variant="body2">
                          {selectedMusicSummaries.length > 0
                            ? selectedMusicSummaries.map((music, index) => `${index + 1}. ${music.nome}`).join('   •   ')
                            : 'Nenhuma música selecionada ainda.'}
                        </Typography>
                      </Paper>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.5fr) minmax(200px, 0.8fr) minmax(180px, 0.7fr)' },
                          gap: 2,
                        }}
                      >
                        <TextField
                          label="Buscar por nome ou gênero"
                          placeholder="Ex.: pop suave acústico"
                          value={setup.searchTerm}
                          onChange={(event) => {
                            const value = event.target.value;
                            setSetup(previous => ({ ...previous, searchTerm: value }));
                          }}
                          fullWidth
                        />

                        <FormControl fullWidth>
                          <InputLabel id="music-genre-filter-label">Filtrar por gênero</InputLabel>
                          <Select
                            labelId="music-genre-filter-label"
                            label="Filtrar por gênero"
                            value={setup.genreFilter}
                            onChange={(event) => {
                              const value = event.target.value;
                              setSetup(previous => ({ ...previous, genreFilter: value }));
                            }}
                          >
                            <MenuItem value="">Todos os gêneros</MenuItem>
                            {genreOptions.map((genre) => (
                              <MenuItem key={genre} value={genre}>
                                {genre}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl fullWidth>
                          <InputLabel id="music-sort-filter-label">Ordenar por</InputLabel>
                          <Select
                            labelId="music-sort-filter-label"
                            label="Ordenar por"
                            value={setup.sortBy}
                            onChange={(event) => {
                              setSetup(previous => ({ ...previous, sortBy: event.target.value as MusicSortOption }));
                            }}
                          >
                            <MenuItem value="selected">Selecionadas primeiro</MenuItem>
                            <MenuItem value="name">Nome</MenuItem>
                            <MenuItem value="genre">Gênero</MenuItem>
                            <MenuItem value="recent">Mais recentes</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', lg: 'minmax(260px, 0.9fr) minmax(0, 1.6fr)' },
                          gap: 2,
                          alignItems: 'start',
                        }}
                      >
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            Ordem escolhida
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Defina aqui a sequência em que você quer cantar.
                          </Typography>

                          {selectedMusicSummaries.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              Nenhuma música selecionada ainda.
                            </Typography>
                          ) : (
                            <Stack spacing={1}>
                              {selectedMusicSummaries.map((music, index) => (
                                <Paper key={music.id} variant="outlined" sx={{ p: 1.25, borderRadius: 2.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body2" sx={{ minWidth: 22, fontWeight: 700 }}>
                                      {index + 1}.
                                    </Typography>
                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {music.nome}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {music.genero || 'Gênero não informado'}
                                      </Typography>
                                    </Box>
                                    <Button size="small" variant="outlined" onClick={() => handleMoveSelectedMusic(music.id, 'up')} disabled={index === 0}>
                                      Subir
                                    </Button>
                                    <Button size="small" variant="outlined" onClick={() => handleMoveSelectedMusic(music.id, 'down')} disabled={index === selectedMusicSummaries.length - 1}>
                                      Descer
                                    </Button>
                                  </Box>
                                </Paper>
                              ))}
                            </Stack>
                          )}
                        </Paper>

                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              {filteredMusics.length} música{filteredMusics.length !== 1 ? 's' : ''} encontrada{filteredMusics.length !== 1 ? 's' : ''}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Selecionadas: {setup.selectedMusicIds.length}
                              {selectedPackageConfig.maxSongs !== null ? ` / ${selectedPackageConfig.maxSongs}` : '+'}
                            </Typography>
                          </Box>

                          {musics.length === 0 ? (
                            <Alert severity="warning">
                              Nenhuma música foi retornada pela API no momento.
                            </Alert>
                          ) : filteredMusics.length === 0 ? (
                            <Alert severity="info">
                              Nenhuma música encontrada com esse filtro.
                            </Alert>
                          ) : (
                            <Stack spacing={1.25} sx={{ maxHeight: 620, overflowY: 'auto', pr: 0.5 }}>
                              {filteredMusics.map((music) => {
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
                                      p: 1.5,
                                      borderRadius: 2.5,
                                      borderColor: isSelected ? 'primary.main' : 'divider',
                                      bgcolor: isSelected ? 'action.selected' : 'background.paper',
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                      <Button
                                        variant={isSelected ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => handleSelectMusic(music.id)}
                                        sx={{ minWidth: 120 }}
                                      >
                                        {isSelected ? `Selecionada ${selectionOrder}` : 'Selecionar'}
                                      </Button>

                                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                          {music.nome}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {music.genero || 'Gênero não informado'}
                                        </Typography>
                                      </Box>

                                      <Button
                                        variant="text"
                                        size="small"
                                        onClick={() => {
                                          void handleToggleMusicPreview(music.id);
                                        }}
                                        disabled={isPreviewLoading}
                                      >
                                        {isPreviewLoading
                                          ? 'Carregando...'
                                          : isPreviewVisible
                                            ? 'Ocultar prévia'
                                            : 'Prévia'}
                                      </Button>
                                    </Box>

                                    {isPreviewVisible && musicPreview && (
                                      <Paper variant="outlined" sx={{ mt: 1.5, p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
                                        <Stack spacing={2}>
                                          <Box>
                                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                              Música original
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
                                              Instrumental
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
                                  </Paper>
                                );
                              })}
                            </Stack>
                          )}
                        </Box>
                      </Box>
                    </Stack>
                  </Paper>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" onClick={handleBackToPackageStage}>
                      Voltar
                    </Button>
                    <Button variant="contained" onClick={handleAdvanceToReviewStage} disabled={musics.length === 0}>
                      Revisar seleção
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6">
                          3. Revisar seleção
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                          Confira a quantidade e a ordem das músicas antes de começar.
                        </Typography>
                      </Box>

                      {setupError && (
                        <Alert severity="error">
                          {setupError}
                        </Alert>
                      )}

                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.default' }}>
                        <Typography variant="body2" color="text.secondary">
                          Quantidade escolhida
                        </Typography>
                        <Typography variant="h4" sx={{ mt: 0.5 }}>
                          {setup.selectedMusicIds.length}
                        </Typography>
                      </Paper>

                      <Stack spacing={1.25}>
                        {selectedMusicSummaries.map((music, index) => (
                          <Paper key={music.id} variant="outlined" sx={{ p: 1.75, borderRadius: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ minWidth: 26, fontWeight: 800 }}>
                                {index + 1}.
                              </Typography>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {music.nome}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {music.genero || 'Gênero não informado'}
                                </Typography>
                              </Box>
                              <Button size="small" variant="outlined" onClick={() => handleMoveSelectedMusic(music.id, 'up')} disabled={index === 0}>
                                Subir
                              </Button>
                              <Button size="small" variant="outlined" onClick={() => handleMoveSelectedMusic(music.id, 'down')} disabled={index === selectedMusicSummaries.length - 1}>
                                Descer
                              </Button>
                            </Box>
                          </Paper>
                        ))}
                      </Stack>
                    </Stack>
                  </Paper>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" onClick={handleBackToMusicStage}>
                      Voltar
                    </Button>
                    <Button variant="contained" onClick={handleStartSession} disabled={isPreparingSession || musics.length === 0}>
                      {isPreparingSession ? <CircularProgress color="inherit" size={24} /> : 'Iniciar sessão'}
                    </Button>
                  </Box>
                </>
              )}
            </Stack>
          )}
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ pb: 18 }}>
      {floatingAlertStack}
      <Modal open={showStepTutorialModal && !!stepTutorialContent} onClose={handleCloseStepTutorial}>
        <Box sx={{ ...modalStyle, p: 0, overflow: 'hidden', borderRadius: 2, width: 560, maxWidth: 'calc(100vw - 32px)' }}>
          <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 2, display: 'flex', alignItems: 'center' }}>
            <InfoOutlinedIcon sx={{ mr: 1 }} />
            <Typography variant="h6">{stepTutorialContent?.title}</Typography>
          </Box>
          <Box sx={{ p: 3 }}>
            <Typography sx={{ mt: 1, fontSize: '1.05rem' }}>
              {stepTutorialContent?.description}
            </Typography>

            <Stack spacing={1.25} sx={{ mt: 3 }}>
              {stepTutorialContent?.tips.map((tip) => (
                <Typography key={tip} variant="body2" color="text.secondary">
                  • {tip}
                </Typography>
              ))}
            </Stack>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={handleCloseStepTutorial} variant="contained" size="large">
                Entendi
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>

      <Modal open={showCancelModal} onClose={() => setShowCancelModal(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Cancelar sessão de música</Typography>
          <Typography sx={{ mt: 2 }}>
            Tem certeza que deseja cancelar esta sessão? O progresso atual não será salvo.
          </Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Button variant="outlined" onClick={() => setShowCancelModal(false)}>
              Voltar
            </Button>
            <Button variant="contained" color="error" onClick={handleCancelSession}>
              Cancelar sessão
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={Boolean(pendingReviewUrl && currentStep?.type === 'record')} onClose={() => undefined}>
        <Box sx={{ ...modalStyle, width: 560, maxWidth: 'calc(100vw - 32px)' }}>
          <Typography variant="h6">Como ficou a canção</Typography>
          <Typography sx={{ mt: 1.5 }} color="text.secondary">
            Ouça a gravação da música antes de salvar definitivamente.
          </Typography>
          {pendingReviewUrl && (
            <Box sx={{ mt: 3 }}>
              <audio controls src={pendingReviewUrl} style={{ width: '100%' }} />
            </Box>
          )}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={() => { void handleRestartCurrentStep(); }} disabled={isProcessing}>
              Regravar música
            </Button>
            <Button variant="contained" onClick={() => { void handleSaveCurrentStep(); }} disabled={isProcessing}>
              {isProcessing ? <CircularProgress size={24} color="inherit" /> : 'Salvar definitivo'}
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

      {isButtonTutorialActive && buttonTooltipConfig.open && (
        <TutorialTooltip
          text={buttonTooltipConfig.text}
          top={buttonTooltipConfig.top}
          left={buttonTooltipConfig.left}
          arrowTop={buttonTooltipConfig.arrowTop}
          onNext={handleNextButtonTutorialStep}
          onSkip={handleSkipButtonTutorial}
        />
      )}

      <Paper
        elevation={3}
        sx={{
          p: { xs: 2.5, md: 4 },
          borderRadius: 4,
          filter: isButtonTutorialActive ? 'brightness(0.7)' : 'none',
          pointerEvents: isButtonTutorialActive ? 'none' : 'auto',
        }}
      >
        <Box sx={{ width: '100%', mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0}
          />
          <Box display="flex" justifyContent="space-between" gap={2} mt={1} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              {currentStep ? `${currentStep.order} de ${steps.length} etapas` : 'Preparando etapa'}
            </Typography>
            <Box sx={{ textAlign: 'center', minWidth: 220 }}>
              <Typography variant="body2" color="primary" fontWeight="bold">
                {selectedPackageConfig.label} • {currentStep?.musicName || 'Fluxo padrão'}
              </Typography>
              <Typography
                variant="h6"
                component="h1"
                sx={{ mt: 0.35, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, textAlign: 'center' }}
              >
                Sessão de Música
              </Typography>
            </Box>
          </Box>
        </Box>

        {(runtimeError || stepAudioError) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {runtimeError || stepAudioError}
          </Alert>
        )}

        {currentStep && (
          <>
            {currentStep.type !== 'phrase' && !(currentStep.type === 'record' && isRecordPreStart && stepCountdown === null) && (
              <Paper
                elevation={0}
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  p: { xs: 2, md: 2.5 },
                  background: currentStepTheme.surface,
                  border: `1px solid ${currentStepTheme.accent}22`,
                  textAlign: 'left',
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: '0.12em',
                    color: currentStepTheme.accent,
                    fontWeight: 800,
                  }}
                >
                  {currentStepTheme.eyebrow}
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.25 }}>
                  {currentStep.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.75,
                    maxWidth: 'none',
                    mx: 0,
                  }}
                >
                  {describeStep(currentStep)}
                </Typography>
              </Paper>
            )}

            {stepCountdown !== null && currentStep.type !== 'phrase' && (
              <Box
                sx={{
                  mb: 3,
                  px: 2,
                  py: { xs: 4, md: 5 },
                  textAlign: 'center',
                  borderRadius: 3,
                  background: 'radial-gradient(circle at center, rgba(25,118,210,0.18), rgba(25,118,210,0.03) 65%)',
                  border: '1px solid rgba(25,118,210,0.18)',
                }}
              >
                <Typography variant="overline" sx={{ letterSpacing: '0.14em', color: 'primary.main', fontWeight: 800 }}>
                  {countdownLabel || 'Preparando'}
                </Typography>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '5.5rem', md: '7rem' },
                    fontWeight: 900,
                    lineHeight: 1,
                    color: 'primary.main',
                    textShadow: '0 12px 32px rgba(25,118,210,0.22)',
                  }}
                >
                  {stepCountdown}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  {currentStep.type === 'listen'
                    ? 'A audição vai começar em instantes.'
                    : metronomeConfig.enabled && metronomeConfig.countInBars > 0
                      ? 'Contagem inicial do metrônomo em andamento.'
                      : 'A gravação da música vai começar em instantes.'}
                </Typography>
              </Box>
            )}

            {isLoadingCurrentMusic && currentStep.type !== 'phrase' ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {currentStep.type === 'phrase' && (
                  <Box>
                    <Box display="flex" alignItems="center" mb={0.75}>
                      {isRecording && <FiberManualRecordIcon sx={{ color: 'error.main', animation: 'blinking 1s infinite' }} />}
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

                    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, textAlign: 'center', borderRadius: 3 }}>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: '1fr auto 1fr' },
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.75,
                        }}
                      >
                        <Box sx={{ display: { xs: 'none', md: 'block' } }} />
                        <Typography
                          variant="h6"
                          color="primary"
                          sx={{
                            fontSize: `${Math.max(18, phraseFontSize * 0.58)}px`,
                            lineHeight: 1.15,
                            fontWeight: 700,
                            transition: 'all 0.3s ease',
                            backgroundColor: isHighContrast ? '#000000' : 'transparent',
                            color: isHighContrast ? '#FFFF00' : 'primary.main',
                            display: 'inline-block',
                            textAlign: 'center',
                            p: isHighContrast ? 1 : 0,
                            borderRadius: 1,
                            justifySelf: 'center',
                            fontFamily: isDyslexicFont ? ACCESSIBLE_READING_FONT : 'inherit',
                          }}
                        >
                          {currentStep.helperText}
                        </Typography>

                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 1,
                            justifySelf: { xs: 'center', md: 'end' },
                            mr: { xs: 0, md: -0.5 },
                          }}
                        >
                          <IconButton
                            ref={dyslexicButtonRef}
                            onClick={() => setIsDyslexicFont(previous => !previous)}
                            color={isDyslexicFont ? 'primary' : 'default'}
                            title="Fonte para dislexia"
                            size="small"
                          >
                            <FontDownloadIcon />
                          </IconButton>
                          <IconButton
                            ref={contrastButtonRef}
                            onClick={() => setIsHighContrast(previous => !previous)}
                            color={isHighContrast ? 'primary' : 'default'}
                            title="Alto contraste"
                            size="small"
                          >
                            <ContrastIcon />
                          </IconButton>
                          <Button
                            ref={fontSizeButtonRef}
                            size="small"
                            variant="outlined"
                            onClick={() => setPhraseFontSize(previous => Math.max(18, previous - 4))}
                            sx={{ minWidth: 44, px: 1 }}
                          >
                            A-
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setPhraseFontSize(previous => Math.min(72, previous + 4))}
                            sx={{ minWidth: 44, px: 1 }}
                          >
                            A+
                          </Button>
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                        Você pode trocar esta frase até 3 vezes.
                        {` Trocas usadas: ${skipCount}/3.`}
                      </Typography>

                      <Typography
                        variant="h4"
                        sx={{
                          fontSize: `${phraseFontSize}px`,
                          fontFamily: isDyslexicFont ? ACCESSIBLE_READING_FONT : 'inherit',
                          letterSpacing: isDyslexicFont ? '0.6px' : 'normal',
                          wordSpacing: isDyslexicFont ? '1.5px' : 'normal',
                          minHeight: 96,
                          textAlign: 'center',
                          my: 1,
                          px: { xs: 0.5, md: 1.5 },
                          py: { xs: 1, md: 1.5 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: isDyslexicFont ? 1.35 : 1.2,
                          backgroundColor: isHighContrast ? '#000000' : 'transparent',
                          color: isHighContrast ? '#FFFF00' : 'inherit',
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {currentStep.prompt}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {currentStep.type === 'listen' && (
                  <Stack spacing={2.5}>
                    {listeningUnavailable ? (
                      <Alert severity="info">
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

                    <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
                      <Typography variant="h6">{currentStep.musicName}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {currentStep.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        {formatBpmLabel(currentMusicDetail?.bpm)} • Compasso {currentTimeSignatureLabel}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Quando clicar em iniciar, a faixa entra com contagem 3, 2, 1.
                      </Typography>
                    </Paper>
                  </Stack>
                )}

                {currentStep.type === 'record' && (
                  <Stack spacing={2.5}>
                    {!isRecordPreStart && (
                      <>
                        <Box display="flex" alignItems="center" mb={-0.5}>
                          {isRecording && <FiberManualRecordIcon sx={{ color: 'error.main', animation: 'blinking 1s infinite' }} />}
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
                          isActive={(isRecording && !isMicPaused) || micPreviewReady}
                        />
                      </>
                    )}

                    {!isRecordPreStart && (
                      <>
                        {selectedMonitorUrl ? (
                          <AudioVisualizer
                            mode="music"
                            isActive={isMusicPlaying}
                            musicProgress={musicProgress}
                            musicLabel={monitorMode === 'instrumental' ? 'Instrumental' : 'Música de referência'}
                          />
                        ) : (
                          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                              Esta gravação ficará sem música de fundo.
                            </Typography>
                          </Paper>
                        )}
                      </>
                    )}

                    {showRecordSetup ? (
                      <Stack spacing={2}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: { xs: 1.75, md: 2 },
                            borderRadius: 3,
                            bgcolor: 'rgba(46,125,50,0.04)',
                            borderColor: 'rgba(46,125,50,0.16)',
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.dark', mb: 1.25 }}>
                            Como esta etapa funciona
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25 }}>
                            {[
                              '1. Escolha o que vai ouvir no fone.',
                              '2. Ajuste o metrônomo se precisar.',
                              '3. Clique no botão verde para começar.',
                            ].map((item) => (
                              <Paper
                                key={item}
                                variant="outlined"
                                sx={{
                                  p: 1.5,
                                  borderRadius: 2.5,
                                  bgcolor: 'rgba(255,255,255,0.72)',
                                  borderColor: 'rgba(46,125,50,0.12)',
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {item}
                                </Typography>
                              </Paper>
                            ))}
                          </Box>
                        </Paper>

                        {micPreviewLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                            <CircularProgress size={26} />
                          </Box>
                        ) : (
                          <Alert severity={micSignalDetected ? 'success' : 'warning'}>
                            {micSignalDetected ? 'Microfone detectado.' : 'Sem sinal de voz no momento.'}
                          </Alert>
                        )}

                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                            gap: 2,
                          }}
                        >
                          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.08em' }}>
                              Áudio de apoio
                            </Typography>
                            <Typography variant="h6" sx={{ mb: 0.75 }}>
                              1. O que você quer ouvir
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25 }}>
                              Esse áudio é só para te orientar enquanto canta. Ele não entra no arquivo final.
                            </Typography>

                            <Stack spacing={2}>
                              <FormControl fullWidth disabled={stepCountdown !== null || (hasStartedCurrentTake && !isMicPaused)}>
                                <InputLabel id="monitor-mode-label">Áudio de referência</InputLabel>
                                <Select
                                  labelId="monitor-mode-label"
                                  label="Áudio de referência"
                                  value={monitorMode}
                                  onChange={(event: SelectChangeEvent<MonitorMode>) => {
                                    setMonitorMode(event.target.value as MonitorMode);
                                    setStepAudioError(null);
                                  }}
                                >
                                  <MenuItem value="none">Sem música de fundo</MenuItem>
                                  {currentMusicDetail?.vocal_audio_url && (
                                    <MenuItem value="vocal">Original com voz</MenuItem>
                                  )}
                                  {currentMusicDetail?.instrumental_audio_url && (
                                    <MenuItem value="instrumental">Instrumental</MenuItem>
                                  )}
                                </Select>
                                <FormHelperText>
                                  Escolha o que fica mais fácil para você acompanhar.
                                </FormHelperText>
                              </FormControl>

                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 1.5,
                                  borderRadius: 2.5,
                                  bgcolor: 'background.default',
                                }}
                              >
                                <FormControlLabel
                                  sx={{ m: 0, alignItems: 'flex-start' }}
                                  control={(
                                    <Switch
                                      checked={voiceMonitoring}
                                      disabled={stepCountdown !== null || (hasStartedCurrentTake && !isMicPaused)}
                                      onChange={(event) => setVoiceMonitoring(event.target.checked)}
                                    />
                                  )}
                                  label={(
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        Ouvir minha própria voz durante o canto
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Ative isso apenas se quiser retorno local da sua voz no fone.
                                      </Typography>
                                    </Box>
                                  )}
                                />
                              </Paper>
                            </Stack>
                          </Paper>

                          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: 'rgba(25,118,210,0.03)' }}>
                            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '0.08em' }}>
                              Ritmo
                            </Typography>
                            <Typography variant="h6" sx={{ mb: 0.75 }}>
                              2. Metrônomo opcional
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25 }}>
                              Essas opções valem só para esta gravação e podem ser ajustadas livremente.
                            </Typography>

                            <Stack spacing={2}>
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

                              <Box
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(140px, 0.7fr)' },
                                  gap: 1.5,
                                }}
                              >
                                <TextField
                                  label="BPM da sessão"
                                  type="number"
                                  value={metronomeConfig.bpm}
                                  disabled={stepCountdown !== null || !metronomeConfig.enabled || (hasStartedCurrentTake && !isMicPaused)}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setMetronomeConfig(previous => ({ ...previous, bpm: value }));
                                  }}
                                  helperText="Carregado da música, mas editável só nesta gravação."
                                  fullWidth
                                />

                                <TextField
                                  label="Compasso"
                                  value={metronomeConfig.timeSignature}
                                  disabled
                                  helperText="Carregado automaticamente da música."
                                  fullWidth
                                />
                              </Box>

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

                              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'background.paper' }}>
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
                              </Paper>

                              <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
                                Para evitar que o metrônomo apareça na gravação, use fones de ouvido.
                              </Alert>
                            </Stack>
                          </Paper>
                        </Box>
                      </Stack>
                    ) : (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: { xs: 2.5, md: 3 },
                          borderRadius: 3,
                          bgcolor: 'action.hover',
                        }}
                      >
                        <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                          Gravação em foco
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {currentStep.musicName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {recordSessionSummary}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                          Pause a gravação se quiser rever ou mudar essas opções.
                        </Typography>
                      </Paper>
                    )}
                  </Stack>
                )}
              </>
            )}
          </>
        )}
      </Paper>

      <Paper
        elevation={6}
        sx={{
          position: 'sticky',
          bottom: 12,
          zIndex: 20,
          mt: 3,
          mb: 2,
          p: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'rgba(94,209,255,0.16)',
          bgcolor: 'rgba(16,18,23,0.96)',
          color: '#f8fbff',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Box display="flex" flexWrap="wrap" justifyContent="space-between" gap={2}>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Button
              ref={backButtonRef}
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                void handleGoBack();
              }}
              disabled={isProcessing || currentStepIndex === 0}
            >
              Voltar
            </Button>

            <Button ref={restartButtonRef} variant="outlined" onClick={() => { void handleRestartCurrentStep(); }} disabled={isProcessing || !currentStep || stepCountdown !== null}>
              {restartLabel}
            </Button>

            <Button
              ref={mainActionButtonRef}
              variant={emphasizeRecordStart ? 'contained' : 'outlined'}
              color={emphasizeRecordStart ? 'success' : 'primary'}
              startIcon={<PlayArrowIcon />}
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
              ref={skipButtonRef}
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
              ref={saveButtonRef}
              variant="contained"
              onClick={() => {
                void handleSaveCurrentStep();
              }}
              disabled={isProcessing || (currentStep?.type !== 'listen' && !hasStartedCurrentTake && !pendingReviewBlob)}
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
