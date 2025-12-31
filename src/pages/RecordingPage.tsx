import React, { useState, useRef, useEffect } from 'react';
import { Button, Typography, Container, Paper, Box, Modal, Card, CardContent, CircularProgress } from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ConsentScreen from '../components/ConsentScreen';

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

const uploadAudio = async (audioBlob: Blob, metadata: any) => {
  const formData = new FormData();

  // Sanitize the MIME type by removing the ';codecs=...' part.
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
  formData.append("deviceInfo", JSON.stringify({
    userAgent: navigator.userAgent
  }));

  const credentials = btoa("admin:admin");

  try {
    const response = await fetch("http://127.0.0.1:8000/api/v1/recordings", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
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
  const [consentModalOpen, setConsentModalOpen] = useState(true);
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
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);


  // --- REFS ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0); // For precise duration
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

  // --- NAVIGATION & PARAMS ---
  const navigate = useNavigate();
  const { datasetId } = useParams<{ datasetId: string }>();

  // --- PERMISSION HANDLER ---
  const requestMicPermission = async () => {
    setMicPermissionStatus('pending');
    setIsMicErrorModalOpen(false); // Close modal when trying again
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop tracks immediately
      setMicPermissionStatus('granted');
      setTutorialStep(0); // Proceed to tutorial
      return true;
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setMicPermissionStatus('denied');
      setIsMicErrorModalOpen(true);
      return false;
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    setConsentModalOpen(true);
  }, []);

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
    setConsentModalOpen(false);
    requestMicPermission();
  };
  const handleDeclineConsent = () => navigate('/');
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
        setIsCountdownModalOpen(true);
        // Use a simple promise for delay to keep flow linear
        await new Promise(res => setTimeout(res, 3000));
        setIsCountdownModalOpen(false);
        await startRecording();
      }
    } else {
      if (currentCsvFile === 'apresentacao.csv') {
        setTransitionMessage({
          title: 'Você concluiu a apresentação!',
          body: 'Agora vamos para a parte de leitura de frases.'
        });
        setIsTransitionModalOpen(true);
      } else {
        setOpenFinishModal(true);
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
            const metadata = {
              userId: "admin",
              sessionId: sessionId,
              datasetId: datasetId,
              phraseId: currentPhrase.id,
              duration: durationInSeconds,
              recordedAt: new Date().toISOString(),
              emotionId: currentPhrase.emocaoid,
              format: format,
            };
            await uploadAudio(audioBlob, metadata);
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

  const getDbfsColor = (dbfs: number) => dbfs > -20 ? 'red' : dbfs > -40 ? 'yellow' : 'green';
  const formatTime = (time: number) => `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`;

  // --- RENDER ---
  if (isLoading && !phrases.length) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Container>;
  }

  return (
    <Container maxWidth="lg">
      {consentModalOpen && <ConsentScreen onAccept={handleAcceptConsent} onDecline={handleDeclineConsent} />}
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

        <Box mt={2} display="flex" justifyContent="center"><Button ref={homeButtonRef} component={Link} to="/">Voltar para a Home</Button></Box>
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
      <Modal open={openFinishModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" textAlign="center">Sessão Finalizada!</Typography>
          <Box mt={2} display="flex" justifyContent="center">
            <Button component={Link} to="/">Voltar para a Home</Button>
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
    </Container>
  );
};

export default RecordingPage;