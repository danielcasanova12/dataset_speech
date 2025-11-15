import React, { useState, useRef, useEffect } from 'react';
import { Button, Typography, Container, Paper, Box, Modal, Card, CardContent, CircularProgress } from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ConsentScreen from '../components/ConsentScreen';

// --- INTERFACES & STYLES ---
interface Phrase {
  id: number; emocaoid: number; datasetid: number; text: string; videoSrc?: string; id_origem: number;
}

const modalStyle = {
  position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  width: 400, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4,
};

const TutorialTooltip: React.FC<{ text: string; top: number; left: number; onNext: () => void }> = ({
  text,
  top,
  left,
  onNext,
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
          top: '50%',
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
  const [tooltipConfig, setTooltipConfig] = useState<{ open: boolean; text: string; top: number; left: number }>({ open: false, text: '', top: 0, left: 0 });

  // --- REFS ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const timerIntervalId = useRef<NodeJS.Timeout | null>(null);
  const phraseTextRef = useRef<HTMLElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- NAVIGATION & PARAMS ---
  const navigate = useNavigate();
  const { datasetId } = useParams<{ datasetId: string }>();

  // --- EFFECTS ---
  useEffect(() => {
    setConsentModalOpen(true);
  }, []);

  useEffect(() => {
    if (!datasetId) return;
    const fetchPhrases = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/phrases.csv`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        const header = lines[0].split(',').map(h => h.trim());
        const phraseData: Phrase[] = lines.slice(1).map(line => {
            const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            return {
                id: parseInt(values[header.indexOf('id')] || '0'),
                emocaoid: parseInt(values[header.indexOf('emocaoid')] || '0'),
                datasetid: parseInt(values[header.indexOf('datasetid')] || '0'),
                text: values[header.indexOf('text')]?.replace(/"/g, '') || '',
                videoSrc: values[header.indexOf('videoSrc')]?.replace(/"/g, '') || undefined,
                id_origem: parseInt(values[header.indexOf('id_origem')] || '0'),
            };
        });
        const filteredPhrases = phraseData.filter(p => p.datasetid.toString() === datasetId);
        setPhrases(filteredPhrases);
      } catch (error) {
        console.error("Failed to load phrases:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPhrases();
  }, [datasetId]);

  useEffect(() => {
    const tutorialSteps = [
      { ref: phraseTextRef, text: "Este é o texto que você deve ler em voz alta." },
      { ref: waveformRef, text: "Aqui você verá a onda do seu áudio enquanto grava." },
      { ref: saveButtonRef, text: "Use este botão para salvar sua gravação e ir para a próxima frase." },
    ];
    if (tutorialStep !== null && tutorialStep < tutorialSteps.length) {
      setTimeout(() => {
        const { ref, text } = tutorialSteps[tutorialStep];
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          setTooltipConfig({ open: true, text, top: rect.top + window.scrollY, left: rect.right + window.scrollX + 15 });
        }
      }, 100);
    } else {
      setTooltipConfig({ open: false, text: '', top: 0, left: 0 });
      if (tutorialStep !== null) setTutorialStep(null);
    }
  }, [tutorialStep]);

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
    setTutorialStep(0);
  };
  const handleDeclineConsent = () => navigate('/');
  const handleNextTutorialStep = () => setTutorialStep(prev => (prev === null ? 0 : prev + 1));

  const isTutorialActive = tutorialStep !== null;

  const triggerPhraseAction = async (index: number) => {
    const phrase = phrases[index];
    if (!phrase) return;
    setCountdown(3);
    setIsCountdownModalOpen(true);
    await new Promise(resolve => {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) { clearInterval(timer); resolve(null); }
          return prev - 1;
        });
      }, 1000);
    });
    setIsCountdownModalOpen(false);
    if (phrase.videoSrc) playVideo(phrase.videoSrc);
    else { setIsVideoPlaying(false); await startRecording(); }
  };

  const handleNextPhrase = () => {
    if (isRecording) stopRecording();
    if (currentPhraseIndex < phrases.length - 1) {
      const nextIndex = currentPhraseIndex + 1;
      setCurrentPhraseIndex(nextIndex);
      setAudioChunks([]);
      triggerPhraseAction(nextIndex);
    } else {
      setOpenFinishModal(true);
    }
  };
  
  const handleIgnoreAndGoNext = () => {
    if (isRecording) stopRecording();
    if (currentPhraseIndex < phrases.length - 1) {
      const nextIndex = currentPhraseIndex + 1;
      setCurrentPhraseIndex(nextIndex);
      setAudioChunks([]);
      triggerPhraseAction(nextIndex);
    } else {
      setOpenFinishModal(true);
    }
  };

  const handlePreviousPhrase = () => {
    if (isRecording) stopRecording();
    if (currentPhraseIndex > 0) {
      const prevIndex = currentPhraseIndex - 1;
      setCurrentPhraseIndex(prevIndex);
      setAudioChunks([]);
      triggerPhraseAction(prevIndex);
    }
  };

  const handleReplayVideo = () => {
    if (isRecording) stopRecording();
    const currentPhrase = phrases[currentPhraseIndex];
    if (currentPhrase?.videoSrc) playVideo(currentPhrase.videoSrc);
  };

  const startRecording = async () => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      if (!analyserRef.current) analyserRef.current = audioContextRef.current.createAnalyser();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => setAudioChunks((prev) => [...prev, event.data]);
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setTimer(0);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (sourceRef.current) sourceRef.current.disconnect();
    }
  };

  const playVideo = (src: string) => {
    if (videoRef.current) {
      videoRef.current.src = src;
      setIsVideoPlaying(true);
      setIsInitialPlayback(true);
      videoRef.current.play().catch(err => console.error("Video play failed:", err));
    }
  };

  const handleVideoEnd = () => {
    setIsInitialPlayback(false);
    setIsVideoPlaying(false);
    startRecording();
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

  const hasVideo = !!phrases[currentPhraseIndex]?.videoSrc;

  return (
    <Container maxWidth="lg">
      {consentModalOpen && <ConsentScreen onAccept={handleAcceptConsent} onDecline={handleDeclineConsent} />}
      {tooltipConfig.open && <TutorialTooltip text={tooltipConfig.text} top={tooltipConfig.top} left={tooltipConfig.left} onNext={handleNextTutorialStep} />}

      <Box sx={{ filter: isTutorialActive ? 'brightness(0.7)' : 'none', transition: 'filter 0.3s' }}>
        <Typography variant="h3" component="h1" textAlign="center" sx={{ mt: 4, mb: 2 }}>
          Gravação de Fala (Dataset: {datasetId})
        </Typography>

        {phrases.length > 0 ? (
          <Paper elevation={3} sx={{ p: 4, pointerEvents: isTutorialActive ? 'none' : 'auto' }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  {isRecording && <FiberManualRecordIcon sx={{ color: 'red', animation: 'blinking 1s infinite' }} />}
                  <Typography variant="h6" sx={{ ml: 1 }}>{isRecording ? 'Gravando...' : isVideoPlaying ? 'Reproduzindo Vídeo...' : 'Pronto'}</Typography>
                  <Box flexGrow={1} />
                  <Typography variant="h6" sx={{ color: getDbfsColor(dbfs), mr: 2, fontWeight: 'bold' }}>
                    {isRecording && isFinite(dbfs) ? `${dbfs.toFixed(2)} dBFS` : ''}
                  </Typography>
                  <Typography variant="h6">{formatTime(timer)}</Typography>
                </Box>
                <Box ref={waveformRef} sx={{ height: 100, backgroundColor: 'rgba(0,0,0,0.1)', mb: 2, borderRadius: 1 }}>
                  <canvas ref={canvasRef} width="600" height="100" style={{ width: '100%', height: '100%' }} />
                </Box>
                {hasVideo && <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}><video ref={videoRef} onEnded={handleVideoEnd} width="100%" height="300" controls /></Box>}
                <Typography ref={phraseTextRef} variant="h4" sx={{ minHeight: 100, textAlign: 'center', my: 2 }}>
                  {phrases[currentPhraseIndex]?.text}
                </Typography>
                <Box mt={4} display="flex" justifyContent="space-around" alignItems="center">
                  <Button variant="outlined" onClick={handlePreviousPhrase} disabled={isTutorialActive || isInitialPlayback || isCountdownModalOpen || currentPhraseIndex === 0}>Frase Anterior</Button>
                  {hasVideo && <Button variant="outlined" color="info" onClick={handleReplayVideo} disabled={isTutorialActive || isInitialPlayback || isCountdownModalOpen}>Repetir Vídeo</Button>}
                  <Button variant="outlined" color="secondary" onClick={handleIgnoreAndGoNext} disabled={isTutorialActive || isInitialPlayback || isCountdownModalOpen}>Ignorar Áudio</Button>
                  <Button ref={saveButtonRef} variant="contained" color="primary" onClick={handleNextPhrase} disabled={isTutorialActive || isInitialPlayback || isCountdownModalOpen}>
                    {currentPhraseIndex < phrases.length - 1 ? 'Salvar e Próxima' : 'Finalizar'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Paper>
        ) : (
          <Typography variant="h5" textAlign="center">Nenhuma frase encontrada para este dataset.</Typography>
        )}

        <Box mt={2} display="flex" justifyContent="center"><Button component={Link} to="/">Voltar para a Home</Button></Box>
      </Box>

      {/* Modals */}
      <Modal open={isCountdownModalOpen}><Box sx={modalStyle}><Typography variant="h1" textAlign="center">{countdown}</Typography></Box></Modal>
      <Modal open={openFinishModal}><Box sx={modalStyle}><Typography variant="h6" textAlign="center">Sessão Finalizada!</Typography></Box></Modal>
    </Container>
  );
};

export default RecordingPage;