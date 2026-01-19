import React, { useState, useRef, useEffect } from 'react';
import { Button, Typography, Container, Grid, Box, Modal, Card, CardContent, CircularProgress, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ConsentScreen from '../components/ConsentScreen';
import UserInfoForm, { UserInfo } from '../components/UserInfoForm';
import { purple, grey } from '@mui/material/colors';

// --- THEME ---
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: purple[300],
    },
    secondary: {
      main: grey[700],
    },
    background: {
      default: '#101010',
      paper: '#1e1e1e',
    },
    text: {
      primary: grey[200],
      secondary: grey[400],
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 700,
    },
    subtitle1: {
      fontWeight: 300,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 20px',
        },
      },
    },
  },
});

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

const uploadAudio = async (audioBlob: Blob, metadata: any, userInfo: UserInfo | null) => {
  const formData = new FormData();

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const apiUser = process.env.REACT_APP_API_USER;
  const apiPassword = process.env.REACT_APP_API_PASSWORD;

  if (!apiBaseUrl || !apiUser || !apiPassword) {
    const errorMsg = "API configuration is missing. Please check your .env file.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const sanitizedType = audioBlob.type.split(';')[0];
  const sanitizedBlob = new Blob([audioBlob], { type: sanitizedType });

  formData.append("audio", sanitizedBlob, `recording.${metadata.format || 'webm'}`);
  formData.append("userId", metadata.userId);
  formData.append("sessionId", metadata.sessionId);
  formData.append("datasetId", metadata.datasetId);
  formData.append("phraseId", metadata.phraseId);
  formData.append("duration", metadata.duration);
  formData.append("recordedAt", metadata.recordedAt);
  if (metadata.emotionId) {
    formData.append("emotionId", metadata.emotionId);
  }
  formData.append("format", metadata.format || 'webm');
  formData.append("deviceInfo", JSON.stringify({ userAgent: navigator.userAgent }));

  if (userInfo) {
    formData.append("userGender", userInfo.gender);
    formData.append("userAge", userInfo.age);
    formData.append("userBirthState", userInfo.birthState);
    formData.append("userCurrentState", userInfo.currentState);
  }

  const credentials = btoa(`${apiUser}:${apiPassword}`);
  const apiUrl = `${apiBaseUrl}/api/v1/recordings`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Authorization": `Basic ${credentials}`, "Accept": "application/json" },
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

const TutorialTooltip: React.FC<{ text: string; top: number; left: number; onNext: () => void; onSkip: () => void; arrowTop?: string | number; }> = ({
  text, top, left, onNext, onSkip, arrowTop = '50%',
}) => (
  <Box sx={{ position: 'fixed', top, left, zIndex: 1400, transform: 'translateY(-50%)' }}>
    <Card elevation={6} sx={{ position: 'relative', p: 2, width: 260, borderRadius: 2 }}>
      <Typography variant="body2" sx={{ mb: 2 }}>{text}</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button onClick={onSkip} size="small">Pular</Button>
        <Button onClick={onNext} variant="contained" size="small">Próximo</Button>
      </Box>
      <Box sx={{ position: 'absolute', top: arrowTop, left: 0, transform: 'translate(-100%, -50%)', width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderRight: `10px solid ${darkTheme.palette.primary.main}` }} />
    </Card>
  </Box>
);

// --- MAIN COMPONENT ---
const RecordingPage: React.FC = () => {
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
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [tooltipConfig, setTooltipConfig] = useState<{ open: boolean; text: string; top: number; left: number; arrowTop?: string | number; }>({ open: false, text: '', top: 0, left: 0 });
  const [currentCsvFile, setCurrentCsvFile] = useState('apresentacao.csv');
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [isPhraseVisible, setIsPhraseVisible] = useState(true);
  const [transitionMessage, setTransitionMessage] = useState({ title: '', body: '' });
  const [micPermissionStatus, setMicPermissionStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle');
  const [isMicErrorModalOpen, setIsMicErrorModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionResumed, setIsSessionResumed] = useState(false);
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // --- REFS ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const timerIntervalId = useRef<NodeJS.Timeout | null>(null);
  const phraseTextRef = useRef<HTMLElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ignoreButtonRef = useRef<HTMLButtonElement>(null);
  const homeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentPhrase = phrases[currentPhraseIndex];
  const currentVideoSrc = resolveVideoSrc(currentPhrase?.videoSrc);
  const hasVideo = !!currentVideoSrc;

  const navigate = useNavigate();
  const { datasetId } = useParams<{ datasetId: string }>();

  const requestMicPermission = async () => {
    setMicPermissionStatus('pending');
    setIsMicErrorModalOpen(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermissionStatus('granted');
      setTutorialStep(0);
      return true;
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setMicPermissionStatus('denied');
      setIsMicErrorModalOpen(true);
      return false;
    }
  };

  useEffect(() => {
    let storedSessionId = localStorage.getItem('recordingSessionId');
    if (!storedSessionId) {
      storedSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('recordingSessionId', storedSessionId);
    }
    setSessionId(storedSessionId);

    const consentGiven = localStorage.getItem(`consent_given_for_${storedSessionId}`);
    if (!consentGiven) setConsentModalOpen(true);

    const storedUserInfo = localStorage.getItem(`userInfo_for_${storedSessionId}`);
    if (storedUserInfo) setUserInfo(JSON.parse(storedUserInfo));

    const savedProgressJSON = localStorage.getItem('recordingProgress');
    if (savedProgressJSON) {
      const savedProgress = JSON.parse(savedProgressJSON);
      if (savedProgress.datasetId === datasetId) {
        if (savedProgress.currentPhraseIndex > 0) {
          console.log('Progresso encontrado! Restaurando para a frase:', savedProgress.currentPhraseIndex);
          setCurrentPhraseIndex(savedProgress.currentPhraseIndex);
          setCurrentCsvFile(savedProgress.currentCsvFile || 'apresentacao.csv');
          setIsSessionResumed(true);
        } else {
          setCurrentPhraseIndex(0);
          setCurrentCsvFile(savedProgress.currentCsvFile || 'apresentacao.csv');
        }
      }
    }
  }, [datasetId]);

  useEffect(() => {
    if (sessionId && datasetId && phrases.length > 0 && currentPhraseIndex > 0) {
      const progress = { datasetId, currentPhraseIndex, currentCsvFile };
      localStorage.setItem('recordingProgress', JSON.stringify(progress));
    }
  }, [currentPhraseIndex, sessionId, datasetId, currentCsvFile, phrases.length]);

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
        let filteredPhrases = phraseData.filter(p => currentCsvFile === 'apresentacao.csv' || p.datasetid.toString() === datasetId);
        const uniquePhrases = filteredPhrases.filter((phrase, index, self) => index === self.findIndex(p => p.text === phrase.text && p.datasetid === phrase.datasetid && (p.videoSrc || '') === (phrase.videoSrc || '')));
        setPhrases(uniquePhrases);
      } catch (error) {
        console.error("Failed to load phrases:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPhrases();
  }, [datasetId, currentCsvFile]);

  useEffect(() => {
    const isReadingPart = currentCsvFile === 'phrases_leitura.csv';
    const tutorialSteps = isReadingPart
      ? [{ ref: phraseTextRef, text: "Nesta parte, você só precisa ler a frase em voz alta.", arrowPosition: '50%' }, { ref: saveButtonRef, text: "Use este botão para salvar sua gravação e ir para a próxima frase.", arrowPosition: '50%' }]
      : [{ ref: timerRef, text: "Aqui você verá quando começar a gravar e o tempo decorrido da gravação desta frase.", arrowPosition: '60%' }, { ref: phraseTextRef, text: "Quando começar a gravar, responda a esta pergunta em voz alta.", arrowPosition: '65%' }, { ref: ignoreButtonRef, text: "Caso não queira gravar o áudio para esta frase, use este botão para pular para a próxima.", arrowPosition: '65%' }, { ref: homeButtonRef, text: "A qualquer momento, você pode usar este botão para abandonar a sessão e voltar para a página inicial.", arrowPosition: '65%' }, { ref: saveButtonRef, text: "Use este botão para salvar sua gravação e ir para a próxima frase.", arrowPosition: '65%' }];
    tutorialSteps.forEach(step => step.ref.current?.classList.remove('tutorial-highlight'));
    if (tutorialStep !== null && tutorialStep < tutorialSteps.length) {
      setTimeout(() => {
        const { ref, text, arrowPosition } = tutorialSteps[tutorialStep];
        if (ref.current) {
          ref.current.classList.add('tutorial-highlight');
          const rect = ref.current.getBoundingClientRect();
          setTooltipConfig({ open: true, text, top: rect.top + window.scrollY, left: rect.right + window.scrollX + 15, arrowTop: arrowPosition ?? (rect.height / 2) });
        }
      }, 100);
    } else {
      setTooltipConfig({ open: false, text: '', top: 0, left: 0 });
      if (tutorialStep !== null) setTutorialStep(null);
    }
    return () => tutorialSteps.forEach(step => step.ref.current?.classList.remove('tutorial-highlight'));
  }, [tutorialStep, currentCsvFile]);

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

  const handleAcceptConsent = () => {
    if (sessionId) localStorage.setItem(`consent_given_for_${sessionId}`, 'true');
    setConsentModalOpen(false);
    if (userInfo) requestMicPermission();
    else setIsUserInfoModalOpen(true);
  };

  const handleUserInfoSubmit = (data: UserInfo) => {
    setUserInfo(data);
    if (sessionId) localStorage.setItem(`userInfo_for_${sessionId}`, JSON.stringify(data));
    setIsUserInfoModalOpen(false);
    requestMicPermission();
  };

  const handleSkipTutorial = () => {
    setTutorialStep(null);
    handleNextPhrase();
  };

  const handleDeclineConsent = () => navigate('/');
  const handleNextTutorialStep = () => {
    const isReadingPart = currentCsvFile === 'phrases_leitura.csv';
    const isLastStep = tutorialStep === (isReadingPart ? 1 : 4);
    if (isLastStep) {
      setTutorialStep(null);
      handleNextPhrase();
    } else {
      setTutorialStep(prev => (prev === null ? 0 : prev + 1));
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
        if (sourceRef.current) sourceRef.current.disconnect();
        sourceRef.current = null;
        if (streamRef.current) streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        streamRef.current = null;
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
        resolve(blob);
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    });
  };

  const startCountdownAndRecording = async () => {
    setCountdown(3);
    setIsCountdownModalOpen(true);
    await new Promise<void>((resolve) => {
      const countdownTimer = setInterval(() => {
        setCountdown((prev) => {
          if (prev > 1) return prev - 1;
          clearInterval(countdownTimer);
          setIsCountdownModalOpen(false);
          resolve();
          return 0;
        });
      }, 1000);
    });
    await startRecording();
  };

  const triggerNextPhrase = async () => {
    if (currentPhraseIndex < phrases.length - 1) {
      const nextIndex = currentPhraseIndex + 1;
      setCurrentPhraseIndex(nextIndex);
      const nextPhrase = phrases[nextIndex];
      if (nextPhrase && !nextPhrase.videoSrc) await startCountdownAndRecording();
    } else {
      if (currentCsvFile === 'apresentacao.csv') {
        setTransitionMessage({ title: 'Você concluiu a apresentação!', body: 'Agora vamos para a parte de leitura de frases.' });
        setIsTransitionModalOpen(true);
      } else {
        setOpenFinishModal(true);
        console.log('Sessão finalizada. Limpando progresso salvo.');
        localStorage.removeItem('recordingSessionId');
        localStorage.removeItem('recordingProgress');
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
            const metadata = { userId: "admin", sessionId, datasetId, phraseId: currentPhrase.id, duration: durationInSeconds, recordedAt: new Date().toISOString(), emotionId: currentPhrase.emocaoid, format };
            await uploadAudio(audioBlob, metadata, userInfo);
            setUploadStatus('success');
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
      if (isRecording) await stopRecording();
      await triggerNextPhrase();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResumeSession = async () => {
    setIsSessionResumed(false);
    const phrase = phrases[currentPhraseIndex];
    if (phrase && !phrase.videoSrc) await startCountdownAndRecording();
    else if (phrase && phrase.videoSrc) playVideo();
  };

  const handleReplayVideo = async () => {
    if (isProcessing || !hasVideo) return;
    setIsProcessing(true);
    try {
      if (isRecording) await stopRecording();
      playVideo();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueToNextPart = () => {
    setIsTransitionModalOpen(false);
    if (currentCsvFile === 'apresentacao.csv') setCurrentCsvFile('phrases_leitura.csv');
    setCurrentPhraseIndex(0);
    setTutorialStep(0);
  };

  const handleAbandonSession = () => {
    if (window.confirm("Você tem certeza que quer abandonar a sessão? Seu progresso será perdido.")) {
      localStorage.removeItem('recordingSessionId');
      localStorage.removeItem('recordingProgress');
      navigate('/');
    }
  };

  const startRecording = async () => {
    setAudioChunks([]);
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") mediaRecorderRef.current.stop();
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') audioContextRef.current = new AudioContext();
      if (!analyserRef.current) analyserRef.current = audioContextRef.current.createAnalyser();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) setAudioChunks((prev) => [...prev, event.data]); };
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
    if (reload) videoElement.load();
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
      canvasCtx.fillStyle = darkTheme.palette.background.paper;
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = darkTheme.palette.primary.main;
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

  const getDbfsColor = (dbfs: number) => dbfs > -20 ? '#f44336' : dbfs > -40 ? '#ffeb3b' : '#4caf50';
  const formatTime = (time: number) => `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`;

  if (isLoading && !phrases.length) {
    return <ThemeProvider theme={darkTheme}><CssBaseline /><Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Container></ThemeProvider>;
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {consentModalOpen && <ConsentScreen onAccept={handleAcceptConsent} onDecline={handleDeclineConsent} />}
        <UserInfoForm open={isUserInfoModalOpen} onSubmit={handleUserInfoSubmit} onClose={() => setIsUserInfoModalOpen(false)} />
        {tooltipConfig.open && <TutorialTooltip text={tooltipConfig.text} top={tooltipConfig.top} left={tooltipConfig.left} onNext={handleNextTutorialStep} onSkip={handleSkipTutorial} arrowTop={tooltipConfig.arrowTop} />}

        <Box sx={{ filter: tutorialStep !== null ? 'brightness(0.7)' : 'none', transition: 'filter 0.3s', '@keyframes tutorial-glow': { '0%': { boxShadow: `0 0 0 0px ${purple[300]}70` }, '70%': { boxShadow: `0 0 10px 10px ${purple[300]}00` }, '100%': { boxShadow: `0 0 0 0px ${purple[300]}00` } }, '.tutorial-highlight': { animation: 'tutorial-glow 1.5s infinite', borderRadius: '8px', zIndex: 1301, position: 'relative' } }}>
          <Typography variant="h3" component="h1" textAlign="center" sx={{ mb: 1 }}>
            Gravação de Fala ({datasetId ? datasetNames[parseInt(datasetId, 10)] : ''})
          </Typography>
          {sessionId && <Typography variant="subtitle1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>ID da Sessão: {sessionId}</Typography>}

          {phrases.length > 0 ? (
            <Card sx={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(30, 30, 30, 0.75)', borderRadius: 4, border: `1px solid ${grey[800]}` }}>
              {isSessionResumed && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: '16px' }}>
                  <Typography variant="h4" color="white" gutterBottom>Sessão Restaurada</Typography>
                  <Button variant="contained" color="primary" size="large" onClick={handleResumeSession}>Continuar de onde parou</Button>
                </Box>
              )}
              <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                <Box display="flex" alignItems="center" mb={2} p={2} bgcolor="rgba(0,0,0,0.2)" borderRadius={2}>
                  {isRecording && <FiberManualRecordIcon sx={{ color: 'red', animation: 'blinking 1s infinite' }} />}
                  <Typography variant="h6" sx={{ ml: 1, fontWeight: 500 }}>{isRecording ? 'Gravando...' : isUploading ? 'Enviando...' : isVideoPlaying ? 'Reproduzindo Vídeo...' : 'Pronto'}</Typography>
                  <Box flexGrow={1} />
                  <Typography variant="h6" sx={{ color: getDbfsColor(dbfs), mr: 2, fontWeight: 'bold' }}>{isRecording && isFinite(dbfs) ? `${dbfs.toFixed(2)} dBFS` : ''}</Typography>
                  <Typography ref={timerRef} variant="h6" sx={{ fontFamily: 'monospace' }}>{formatTime(timer)}</Typography>
                </Box>
                <Box ref={waveformRef} sx={{ height: 120, backgroundColor: 'rgba(0,0,0,0.2)', mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                  <canvas ref={canvasRef} width="600" height="120" style={{ width: '100%', height: '100%' }} />
                </Box>
                {hasVideo && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                    <video ref={videoRef} src={currentVideoSrc} onEnded={handleVideoEnd} onError={handleVideoError} width="100%" height="300" controls />
                  </Box>
                )}
                <Box sx={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
                  <Typography ref={phraseTextRef} variant="h4" sx={{ textAlign: 'center', color: 'text.primary', fontWeight: 500 }}>
                    {isPhraseVisible ? currentPhrase?.text : ''}
                  </Typography>
                </Box>
                
                <Box mt={4} display="flex" justifyContent="flex-end" alignItems="center" gap={2}>
                  {hasVideo && <Button variant="outlined" color="secondary" onClick={handleReplayVideo} disabled={tutorialStep !== null || isInitialPlayback || isCountdownModalOpen || isUploading || isProcessing}>Repetir Vídeo</Button>}
                  <Button ref={ignoreButtonRef} variant="outlined" color="secondary" sx={{minWidth: 180}} onClick={handleIgnoreAndGoNext} disabled={tutorialStep !== null || isInitialPlayback || isCountdownModalOpen || isUploading || isProcessing}>Ignorar Áudio</Button>
                  <Button ref={saveButtonRef} variant="contained" color="primary" sx={{minWidth: 180}} onClick={handleNextPhrase} disabled={tutorialStep !== null || isInitialPlayback || isCountdownModalOpen || isUploading || isProcessing}>
                    {isUploading ? <CircularProgress size={24} color="inherit" /> : (currentPhraseIndex < phrases.length - 1 ? 'Salvar e Próxima' : 'Finalizar')}
                  </Button>
                </Box>

              </CardContent>
            </Card>
          ) : (
            <Typography variant="h5" textAlign="center">Nenhuma frase encontrada para este dataset.</Typography>
          )}
          <Box mt={4} display="flex" justifyContent="center">
            <Button ref={homeButtonRef} onClick={handleAbandonSession} variant="outlined" color="error">Abandonar Sessão</Button>
          </Box>
        </Box>

        {/* Modals */}
        <Modal open={isCountdownModalOpen}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)', '@keyframes pulse': { '0%': { transform: 'scale(0.8)', opacity: 0 }, '50%': { transform: 'scale(1.1)', opacity: 1 }, '100%': { transform: 'scale(1.5)', opacity: 0 } } }}>
            <Typography key={countdown} variant="h1" sx={{ fontSize: '20rem', fontWeight: 'bold', color: 'white', textShadow: '0 0 25px rgba(255, 255, 255, 0.7)', animation: 'pulse 1s ease-in-out' }}>{countdown}</Typography>
          </Box>
        </Modal>
        <Modal open={isTransitionModalOpen}>
          <Box sx={modalStyle}><Typography variant="h6" component="h2" textAlign="center">{transitionMessage.title}</Typography><Typography sx={{ mt: 2, textAlign: 'center' }}>{transitionMessage.body}</Typography><Box mt={3} display="flex" justifyContent="center"><Button onClick={handleContinueToNextPart} variant="contained">Continuar</Button></Box></Box>
        </Modal>
        <Modal open={openFinishModal}>
          <Box sx={modalStyle}><Typography variant="h6" component="h2" textAlign="center">Sessão Finalizada!</Typography><Box mt={2} display="flex" justifyContent="center"><Button component={Link} to="/">Voltar para a Home</Button></Box></Box>
        </Modal>
        <Modal open={isMicErrorModalOpen}>
          <Box sx={modalStyle}><Typography variant="h6" component="h2" textAlign="center">Acesso ao Microfone Bloqueado</Typography><Typography sx={{ mt: 2, textAlign: 'center' }}>Para continuar, você precisa permitir o acesso ao microfone.</Typography><Typography sx={{ mt: 2, textAlign: 'center' }}>Clique no ícone de cadeado 🔒 na barra de endereço do seu navegador, encontre a configuração do Microfone e mude para "Permitir".</Typography><Typography sx={{ mt: 2, textAlign: 'center' }}>Depois de permitir, recarregue a página.</Typography><Box mt={3} display="flex" justifyContent="center"><Button onClick={() => window.location.reload()} variant="contained">Recarregar a Página</Button></Box></Box>
        </Modal>
      </Container>
    </ThemeProvider>
  );
};

export default RecordingPage;