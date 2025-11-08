import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Typography,
  Container,
  Paper,
  Box,
  Modal,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { Link } from 'react-router-dom';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

interface Phrase {
  id: number;
  text: string;
  videoSrc?: string;
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const RecordingPage: React.FC = () => {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [openStartModal, setOpenStartModal] = useState(true);
  const [isCountdownModalOpen, setIsCountdownModalOpen] = useState(false);
  const [openFinishModal, setOpenFinishModal] = useState(false);
  const [timer, setTimer] = useState(0);
  const [dbfs, setDbfs] = useState(-100);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isInitialPlayback, setIsInitialPlayback] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [totalSessionTime, setTotalSessionTime] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [countdownPhraseText, setCountdownPhraseText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const timerIntervalId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchPhrases = async () => {
      console.log("fetchPhrases: Starting to fetch phrases.");
      console.log("fetchPhrases: Starting to fetch phrases.");
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/phrases.csv`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        console.log("fetchPhrases: CSV text loaded.", csvText.substring(0, 100) + "..."); // Log first 100 chars
        console.log("fetchPhrases: CSV text loaded.", csvText.substring(0, 100) + "..."); // Log first 100 chars
        
        const lines = csvText.trim().split('\n');
        const header = lines[0].split(',');
        const phraseData: Phrase[] = lines.slice(1).map(line => {
          const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
          const rawVideoSrc = values[2] ? values[2].replace(/"/g, '').trim() : '';
          const normalizedVideoSrc = rawVideoSrc
            ? rawVideoSrc.startsWith('http')
              ? rawVideoSrc
              : `${process.env.PUBLIC_URL}${rawVideoSrc.startsWith('/') ? '' : '/'}${rawVideoSrc}`
            : undefined;

          return {
            id: parseInt(values[0] || '0', 10),
            text: values[1] ? values[1].replace(/"/g, '') : '',
            videoSrc: normalizedVideoSrc,
          };
        });

        setPhrases(phraseData);
        console.log("fetchPhrases: Phrases loaded successfully.", phraseData);
        console.log("fetchPhrases: Phrases loaded successfully.", phraseData);
      } catch (error) {
        console.error("fetchPhrases: Failed to load phrases:", error);
      } finally {
        setIsLoading(false);
        console.log("fetchPhrases: Finished loading phrases. isLoading set to false.");
      }
    };

    fetchPhrases();
  }, []);

  useEffect(() => {
    // Generate a unique session ID on mount
    const newSessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    setSessionId(newSessionId);

    // Start total session timer
    const totalTimeInterval = setInterval(() => {
      setTotalSessionTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(totalTimeInterval);
    };
  }, []);

  const triggerPhraseAction = async (index: number) => {
    // Show countdown
    const phraseText = phrases[index]?.text ?? '';
    setCountdownPhraseText(phraseText);
    setCountdown(3);
    setIsCountdownModalOpen(true);
    await new Promise(resolve => {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(timer);
            resolve(null);
          }
          return prev - 1;
        });
      }, 1000);
    });
    setIsCountdownModalOpen(false);

    // Execute action
    const phrase = phrases[index];
    if (phrase && phrase.videoSrc) {
      playVideo(phrase.videoSrc);
    } else {
      setIsVideoPlaying(false);
      startRecording();
    }
  };

  const playVideo = (src: string) => {
    if (videoRef.current) {
      videoRef.current.src = src;
      setIsVideoPlaying(true);
      setIsInitialPlayback(true);
      videoRef.current.play().catch(err => {
        console.error("Video play failed:", err);
        setIsInitialPlayback(false);
        setIsVideoPlaying(false);
      });
    }
  };

  const handleVideoEnd = () => {
    setIsInitialPlayback(false);
    startRecording();
  };

  const handleStartProcess = () => {
    setOpenStartModal(false);
    triggerPhraseAction(currentPhraseIndex);
  };

  useEffect(() => {
    if (isRecording) {
      timerIntervalId.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      visualize();
    } else {
      if (timerIntervalId.current) {
        clearInterval(timerIntervalId.current);
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }
    return () => {
      if (timerIntervalId.current) {
        clearInterval(timerIntervalId.current);
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [isRecording]);

  

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;
    sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
    sourceRef.current.connect(analyserRef.current);

    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.ondataavailable = (event) => {
      setAudioChunks((prev) => [...prev, event.data]);
    };
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setTimer(0);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false); // This will trigger the useEffect cleanup
      if (canvasRef.current) {
        const canvasCtx = canvasRef.current.getContext('2d');
        if (canvasCtx) {
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    }
  };

  const handleNextPhrase = () => {
    if (isRecording) {
      stopRecording();
    }

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
    if (isRecording) {
      stopRecording();
    }

    if (currentPhraseIndex > 0) {
      const prevIndex = currentPhraseIndex - 1;
      setCurrentPhraseIndex(prevIndex);
      setAudioChunks([]);
      triggerPhraseAction(prevIndex);
    }
  };

  const handleRestartRecording = async () => {
    if (isRecording) {
      stopRecording();
    }
    setAudioChunks([]);
    await startRecording();
  };

  const visualize = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyserRef.current.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      analyserRef.current?.getByteTimeDomainData(dataArray);

      // Calculate dBFS
      let sumSquares = 0.0;
      for (let i = 0; i < dataArray.length; i++) {
        const amplitude = dataArray[i];
        const normalizedAmplitude = (amplitude / 128.0) - 1.0;
        sumSquares += normalizedAmplitude * normalizedAmplitude;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);
      const db = 20 * Math.log10(rms);
      setDbfs(db);

      // Drawing the waveform
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

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };
    draw();
  };

  const getDbfsColor = (dbfsValue: number) => {
    if (dbfsValue > -20) return 'red';
    if (dbfsValue > -40) return 'yellow';
    return 'green';
  };

  const downloadAudio = () => {
    const blob = new Blob(audioChunks, { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'recording.wav';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60).toString().padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box textAlign="center" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h3" component="h1">
          Gravação de Fala
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          ID da Sessão: {sessionId}
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Tempo Total: {formatTime(totalSessionTime)}
        </Typography>
      </Box>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Card>
          <CardContent>
            {/* Status Bar */}
            <Box display="flex" alignItems="center" mb={1}>
              {isRecording && (
                <FiberManualRecordIcon
                  sx={{
                    color: 'red',
                    animation: 'blinking 1s infinite',
                    '@keyframes blinking': { '0%': { opacity: 1 }, '50%': { opacity: 0 }, '100%': { opacity: 1 } },
                  }}
                />
              )}
              <Typography variant="h6" sx={{ ml: 1 }}>
                {isRecording ? 'Gravando...' : isVideoPlaying ? 'Reproduzindo Vídeo...' : 'Pronto'}
              </Typography>
              <Box flexGrow={1} />
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Typography
                  variant="h6"
                  sx={{ color: getDbfsColor(dbfs), mr: 2, fontWeight: 'bold' }}
                >
                  {isRecording && isFinite(dbfs) ? `${dbfs.toFixed(2)} dBFS` : ''}
                </Typography>
                <Typography variant="h6">{formatTime(timer)}</Typography>
              </Box>
            </Box>

            {/* Smaller Waveform Display */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 100,
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderRadius: 1,
                mb: 2,
              }}
            >
              <canvas ref={canvasRef} width="600" height="100" style={{ width: '100%', height: '100%' }} />
            </Box>

            {/* Main Video Display */}
            <Box
              sx={{
                display: isVideoPlaying ? 'flex' : 'none',
                justifyContent: 'center',
                alignItems: 'center',
                height: 300,
                backgroundColor: 'rgba(0,0,0,0.1)',
                borderRadius: 1,
                mb: 2,
              }}
            >
              <video
                ref={videoRef}
                onEnded={handleVideoEnd}
                width="100%"
                height="300"
                controls
              />
            </Box>

            {/* Phrase */}
            <Typography variant="h4" sx={{ minHeight: 100, textAlign: 'center', my: 2 }}>
              {phrases.length > 0 && phrases[currentPhraseIndex].text}
            </Typography>

            {/* Action Buttons */}
            <Box mt={4} display="flex" justifyContent="space-around">
              <Button
                variant="outlined"
                onClick={handlePreviousPhrase}
                disabled={isInitialPlayback || isCountdownModalOpen || currentPhraseIndex === 0}
              >
                Frase Anterior
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleRestartRecording}
                disabled={isInitialPlayback || isCountdownModalOpen || isVideoPlaying}
              >
                Reiniciar Gravação
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleNextPhrase}
                disabled={isInitialPlayback || isCountdownModalOpen}
              >
                {phrases.length > 0 && currentPhraseIndex < phrases.length - 1 ? 'Próxima Frase' : 'Finalizar'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Paper>
      <Box mt={2} display="flex" justifyContent="center">
        <Button component={Link} to="/">
          Voltar para o Início
        </Button>
      </Box>

      <Modal open={openStartModal}>
        <Box sx={style}>
          <Typography variant="h6" component="h2" textAlign="center">
            Pronto para Começar?
          </Typography>
          <Box mt={2} display="flex" justifyContent="center">
            <Button onClick={handleStartProcess} variant="contained">
              Iniciar
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={isCountdownModalOpen}>
        <Box sx={style}>
          <Typography variant="h6" component="h2" textAlign="center">
            Prepare-se...
          </Typography>
          <Typography variant="body1" textAlign="center" sx={{ my: 2 }}>
            {countdownPhraseText}
          </Typography>
          <Typography variant="h1" component="p" textAlign="center">
            {countdown}
          </Typography>
        </Box>
      </Modal>

      <Modal open={openFinishModal}>
        <Box sx={style}>
          <Typography variant="h6" component="h2" textAlign="center">
            Sessão de Gravação Finalizada!
          </Typography>
          <Box mt={2} display="flex" justifyContent="center">
            <Button onClick={() => setOpenFinishModal(false)} component={Link} to="/">
              Ir para o Início
            </Button>
          </Box>
        </Box>
      </Modal>
    </Container>
  );
};

export default RecordingPage;
