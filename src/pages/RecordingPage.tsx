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

const modalStyle = { position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4 };

const TutorialTooltip: React.FC<{ text: string; top: number; left: number; onNext: () => void; arrowTop?: string | number; }> = ({ text, top, left, onNext, arrowTop = '50%' }) => (
  <Box sx={{ position: 'fixed', top, left, zIndex: 1400, transform: 'translateY(-50%)' }}>
    <Paper elevation={6} sx={{ position: 'relative', p: 2, maxWidth: 260, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="body2" sx={{ mb: 2 }}>{text}</Typography>
      <Button onClick={onNext} variant="contained" size="small">Próximo</Button>
      <Box sx={{ position: 'absolute', top: arrowTop, left: 0, transform: 'translate(-100%, -50%)', width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderRight: '10px solid #1976d2' }} />
    </Paper>
  </Box>
);

const RecordingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { datasetId } = useParams<{ datasetId: string }>();
  const { token } = useAuth();
  
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [existingSessionInfo, setExistingSessionInfo] = useState<SessionResponse | null>(null);
  const [showExistingSessionModal, setShowExistingSessionModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalizationStep, setFinalizationStep] = useState<'idle' | 'notes'>('idle');
  const [sessionNotes, setSessionNotes] = useState('');
  const [openFinishModal, setOpenFinishModal] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [preRecordingStep, setPreRecordingStep] = useState<'voiceCheck' | 'voiceSample' | 'roomTone' | 'recording' | 'idle'>('idle'); 
  const [voiceSampleUrl, setVoiceSampleUrl] = useState<string | null>(null);
  const [voiceSampleStep, setVoiceSampleStep] = useState<'ready' | 'recording' | 'recorded' | 'playing'>('ready');

  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [dbfs, setDbfs] = useState(-100);
  const [isClipping, setIsClipping] = useState(false);

  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [tooltipConfig, setTooltipConfig] = useState<{ open: boolean; text: string; top: number; left: number; arrowTop?: string | number; }>({ open: false, text: '', top: 0, left: 0 });
  const isTutorialActive = tutorialStep !== null;

  const sessionCreationLock = useRef(false);
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

  // Define visualize and stopRecording before startRecording
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

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
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
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    }

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
    
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        console.log("Recording stopped, blob created:", audioBlob);
        audioChunksRef.current = [];
      };
    
      audioChunksRef.current = [];
      recorder.start();
      setIsRecording(true);
      setTimer(0);
      visualize();

    } catch (err) {
      console.error("Error obtaining audio stream:", err);
      setError("Não foi possível acessar o microfone. Verifique as permissões do seu navegador.");
      return;
    }
  }, [isRecording, stopRecording, visualize, setError]);

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
      
      const frontendId = parseInt(datasetId, 10);
      const datasetInfo = findByFrontendId(frontendId);
      if (!datasetInfo) {
        setError("Dataset não encontrado.");
        setIsLoading(false);
        return;
      }
      
      sessionCreationLock.current = true;
      setIsLoading(true);
      
      try {
        const newSession = await api.createSession(datasetInfo.backendId, true, token);
        setSession(newSession);
        setCurrentPhraseIndex(0);
        setPreRecordingStep('voiceCheck');
      } catch (error: any) {
        if (error.session) {
          setExistingSessionInfo(error.session as SessionResponse);
          setShowExistingSessionModal(true);
        } else {
          console.error("Failed to create session:", error);
          setError("Não foi possível iniciar a sessão. Por favor, tente novamente mais tarde.");
        }
      } finally {
        setIsLoading(false); 
        sessionCreationLock.current = false;
      }
    };
    createOrResumeSession();
  }, [token, datasetId, navigate, location.state, session]);

  useEffect(() => {
    if (preRecordingStep === 'recording' && !isRecording) {
      startRecording();
    }
  }, [preRecordingStep, isRecording, startRecording]);

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
      } catch (error) {
        console.error("Failed to load CSV:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCsvData();
  }, [session]);
  
  useEffect(() => {
    if (countdown === null) return;
  
    if (countdown === 0) {
      setCountdown(null);
      const advance = async () => {
        if (!session || !token) return;
        
        try {
          const canvas = canvasRef.current;
          if (canvas) {
              const canvasCtx = canvas.getContext('2d');
              if (canvasCtx) {
                  canvasCtx.fillStyle = '#CCCCCC';
                  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
              }
          }
          setDbfs(-100);
          setIsClipping(false);
          setTimer(0);

          setIsProcessing(true);
          const nextPhraseIndex = currentPhraseIndex + 1;
          if (nextPhraseIndex < phrases.length) {
            const updatedSession = { ...session, numero_frase: nextPhraseIndex };
            await api.put(`/sessions/${session.id}`, updatedSession, token);
            setSession(updatedSession);
            setCurrentPhraseIndex(nextPhraseIndex);
            startRecording(); 
          } else {
            setFinalizationStep('notes');
          }
        } catch (error) {
            console.error("Failed to advance phrase:", error);
        } finally {
            setIsProcessing(false);
        }
      };
      advance();
    } else {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, session, token, currentPhraseIndex, phrases, startRecording]);

  const handleResumeSession = () => {
    if (existingSessionInfo) {
      const info = findByBackendId(existingSessionInfo.dataset_id);
      if (info) {
        setShowExistingSessionModal(false);
        navigate(`/recording/${info.frontendId}`, { state: { sessionToResume: existingSessionInfo } });
      }
    }
  };

  const handleCancelAndCreateNewSession = async () => {
    if (existingSessionInfo && token && datasetId) {
      try {
        const finished_at = new Date().toISOString();
        await api.put(`/sessions/${existingSessionInfo.id}`, { ...existingSessionInfo, status: "cancelada", finished_at }, token);
        
        setShowExistingSessionModal(false);
        setExistingSessionInfo(null);
        setSession(null); // Reset session state to trigger re-creation
        
      } catch (error) {
        console.error("Failed to cancel and create new session:", error);
        setError("Ocorreu um erro ao criar uma nova sessão.");
        setIsLoading(false);
      }
    }
  };
  
  const handleVoiceCheckSubmit = () => setPreRecordingStep('voiceSample');

  const handleStartSampleRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderSampleRef.current = recorder;
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksSampleRef.current.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksSampleRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setVoiceSampleUrl(url);
        setVoiceSampleStep('recorded');
        audioChunksSampleRef.current = [];
      };
      
      recorder.start();
      setVoiceSampleStep('recording');
    } catch (err) {
      console.error("Error starting sample recording:", err);
      setError("Não foi possível acessar o microfone. Verifique as permissões do seu navegador.");
    }
  };

  const handleStopSampleRecording = () => {
    if (mediaRecorderSampleRef.current && mediaRecorderSampleRef.current.state === 'recording') {
      mediaRecorderSampleRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };
  
  const handlePlaySample = () => setVoiceSampleStep('playing');
  const handleSamplePlaybackEnded = () => setVoiceSampleStep('recorded');
  
  const handleSampleRecorded = () => setPreRecordingStep('roomTone');

  const handleRoomToneRecordingComplete = () => {
    setPreRecordingStep('recording');
    if (currentPhraseIndex === 0) {
      setTutorialStep(0);
    }
  };

  useEffect(() => {
    if (isRecording) {
      timerIntervalId.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
    } else {
      if (timerIntervalId.current) clearInterval(timerIntervalId.current);
    }
    return () => {
      if (timerIntervalId.current) clearInterval(timerIntervalId.current);
    };
  }, [isRecording]);

  useEffect(() => {
    const tutorialSteps = [
      { ref: timerElementRef, text: "Aqui você verá o tempo da sua gravação. Na primeira frase, este é um exemplo." },
      { ref: phraseTextRef, text: "Leia esta frase em voz alta." },
      { ref: skipButtonRef, text: "Use este botão se não quiser ou não puder gravar a frase atual." },
      { ref: saveButtonRef, text: "Use este botão para salvar e ir para a próxima frase." },
    ];
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));

    if (tutorialStep !== null) {
      if (tutorialStep >= tutorialSteps.length) {
        setTutorialStep(null); 
      } else {
        const { ref, text } = tutorialSteps[tutorialStep];
        if (ref.current) {
          ref.current.classList.add('tutorial-highlight');
          const rect = ref.current.getBoundingClientRect();
          setTooltipConfig({ open: true, text, top: rect.top, left: rect.right + 15 });
        }
      }
    } else {
      setTooltipConfig({ open: false, text: '', top: 0, left: 0 });
    }
  }, [tutorialStep]);

  const handleNextTutorialStep = () => {
    if (tutorialStep === 3) {
      setTutorialStep(null);
      startRecording();
    } else {
      setTutorialStep(prev => (prev === null ? null : prev + 1));
    }
  };

  const processPhraseChange = async (skip = false) => {
    if (!session || !token) return;
    
    stopRecording();
    
    if (skip) {
      try {
        setIsProcessing(true);
        const nextPhraseIndex = currentPhraseIndex + 1;
        if (nextPhraseIndex < phrases.length) {
            const updatedSession = { ...session, numero_frase: nextPhraseIndex };
            await api.put(`/sessions/${session.id}`, updatedSession, token);
            setSession(updatedSession);
            setCurrentPhraseIndex(nextPhraseIndex);
            startRecording(); 
        } else {
            setFinalizationStep('notes');
        }
    } catch (error) {
        console.error("Failed to advance phrase:", error);
    } finally {
        setIsProcessing(false);
    }
    } else {
      setCountdown(3);
    }
  };

  const handleNextPhrase = () => processPhraseChange(false);
  const handleSkipPhrase = () => processPhraseChange(true);

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
  
  const totalPhrases = phrases.length;
  const progressValue = totalPhrases > 0 ? ((currentPhraseIndex + 1) / totalPhrases) * 100 : 0;
  const currentPhrase = phrases[currentPhraseIndex];
  const formatTime = (time: number) => `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
  const getDbfsColor = (dbfs: number) => dbfs > -20 ? 'red' : dbfs > -40 ? 'yellow' : 'green';
  
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
          <Typography sx={{ mt: 2 }}>Tem certeza que deseja cancelar esta sessão?</Typography>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setIsCancelModalOpen(false)}>Voltar</Button>
            <Button onClick={confirmCancelSession} color="error">Cancelar</Button>
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
                    {isRecording && isFinite(dbfs) ? `${dbfs.toFixed(2)} dBFS` : ''}
                  </Typography>
                  <Typography ref={timerElementRef} variant="h6">{currentPhraseIndex === 0 && !isRecording ? '0:03' : formatTime(timer)}</Typography>
                </Box>

                <Box sx={{ height: 100, backgroundColor: 'rgba(0,0,0,0.1)', mb: 2, borderRadius: 1 }}>
                  <canvas ref={canvasRef} width="600" height="100" style={{ width: '100%', height: '100%' }} />
                </Box>
                
                <Typography ref={phraseTextRef} variant="h4" sx={{ minHeight: 100, textAlign: 'center', my: 2 }}>
                  {currentPhrase.text}
                </Typography>
                
                <Box mt={4} display="flex" justifyContent="space-around">
                  <Button ref={skipButtonRef} variant="outlined" onClick={handleSkipPhrase} disabled={isProcessing}>Pular Áudio</Button>
                  <Button ref={saveButtonRef} variant="contained" color="primary" onClick={handleNextPhrase} disabled={isProcessing || !isRecording}>
                    {isProcessing ? <CircularProgress size={24} /> : 'Salvar e Próxima'}
                  </Button>
                </Box>
              </Paper>
            ) : (
              isLoading ? <CircularProgress /> : <Typography>Nenhuma frase encontrada para este dataset.</Typography>
            )}

            <Box mt={2} display="flex" justifyContent="center">
                <Button component={Link} to="/" sx={{ mr: 2 }}>Voltar</Button>
                <Button variant="outlined" color="error" onClick={() => setIsCancelModalOpen(true)}>Cancelar Sessão</Button>
            </Box>
          </Box>
        </>
      )}

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
          <Button component={Link} to="/" variant="contained" sx={{ mt: 2 }}>Voltar para Home</Button>
        </Box>
      </Modal>
      <Modal open={countdown !== null}>
        <Box sx={{ ...modalStyle, width: 200, textAlign: 'center' }}>
          <Typography variant="h1">{countdown}</Typography>
        </Box>
      </Modal>
    </Container>
  );
};

export default RecordingPage;
