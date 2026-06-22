import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Container, Paper, Button, LinearProgress, IconButton } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import HeadsetIcon from '@mui/icons-material/Headset';
import HeadsetOffIcon from '@mui/icons-material/HeadsetOff';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { MusicSessionConfig, Song, Phrase } from '../components/MusicManager';

type StepType = 'music' | 'phrase' | 'finished';

interface SessionState {
  currentSongIndex: number;
  currentPhraseIndex: number;
  stepType: StepType;
  phrasesInCurrentInterval: number;
}

const MusicSessionPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const config = location.state?.config as MusicSessionConfig;

  const [sessionState, setSessionState] = useState<SessionState>({
    currentSongIndex: 0,
    currentPhraseIndex: 0,
    stepType: 'music',
    phrasesInCurrentInterval: 0
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio visualization state
  const [dbfs, setDbfs] = useState(-100);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRecording, setIsRecording] = useState(false); // Used just for visual UI consistency

  useEffect(() => {
    if (!config || !config.songs || config.songs.length === 0) {
      navigate('/');
    }
  }, [config, navigate]);

  const currentSong = config?.songs[sessionState.currentSongIndex];
  const currentPhrase = config?.phrases[sessionState.currentPhraseIndex];

  // Logic to advance the session
  const handleNext = useCallback(() => {
    setSessionState(prev => {
      // If we're on a music step and we have phrases to show, switch to phrase step
      if (prev.stepType === 'music') {
        if (config.phrases.length > 0 && config.intervalCount > 0) {
          return {
            ...prev,
            stepType: 'phrase',
            phrasesInCurrentInterval: 1,
            currentPhraseIndex: config.randomOrder
              ? Math.floor(Math.random() * config.phrases.length)
              : (prev.currentPhraseIndex + 1) % config.phrases.length
          };
        } else {
          // No phrases, just go to next song
          const nextSongIndex = prev.currentSongIndex + 1;
          if (nextSongIndex >= config.songs.length) {
            return { ...prev, stepType: 'finished' };
          }
          return { ...prev, currentSongIndex: nextSongIndex };
        }
      }
      // If we're on a phrase step
      else if (prev.stepType === 'phrase') {
        if (prev.phrasesInCurrentInterval < config.intervalCount) {
          // Show another phrase in this interval
          return {
            ...prev,
            phrasesInCurrentInterval: prev.phrasesInCurrentInterval + 1,
            currentPhraseIndex: config.randomOrder
              ? Math.floor(Math.random() * config.phrases.length)
              : (prev.currentPhraseIndex + 1) % config.phrases.length
          };
        } else {
          // Interval done, go to next song
          const nextSongIndex = prev.currentSongIndex + 1;
          if (nextSongIndex >= config.songs.length) {
            return { ...prev, stepType: 'finished' };
          }
          return {
            ...prev,
            stepType: 'music',
            currentSongIndex: nextSongIndex,
            phrasesInCurrentInterval: 0
          };
        }
      }
      return prev;
    });
  }, [config]);

  // Handle Audio Playback
  useEffect(() => {
    if (sessionState.stepType === 'music' && currentSong) {
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.play().catch(e => {
            console.error("Audio playback failed", e);
            setIsPlaying(false);
        });
      }
    } else {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [sessionState.stepType, currentSong]);

  // Audio Visualization Logic for Phrases
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
  }, []);

  useEffect(() => {
    if (sessionState.stepType === 'phrase') {
      setIsRecording(true);
      const startMic = async () => {
        try {
          if (!streamRef.current) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioContextRef.current.state === 'suspended') {
              await audioContextRef.current.resume();
            }

            if (!analyserRef.current) {
              analyserRef.current = audioContextRef.current.createAnalyser();
              analyserRef.current.fftSize = 2048;
            }

            if (!sourceRef.current) {
              const source = audioContextRef.current.createMediaStreamSource(stream);
              source.connect(analyserRef.current);
              sourceRef.current = source;
            }

            visualize();
          }
        } catch (err) {
          console.error("Mic error:", err);
        }
      };
      startMic();
    } else {
      setIsRecording(false);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }
  }, [sessionState.stepType, visualize]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getDbfsColor = (dbfs: number) => {
    if (!Number.isFinite(dbfs) || dbfs <= -35) return '#666';
    if (dbfs > -12) return '#f44336';
    if (dbfs > -25) return '#ffeb3b';
    return '#4caf50';
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!config) return null;

  if (sessionState.stepType === 'finished') {
    return (
      <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 10 }}>
        <Typography variant="h4" gutterBottom>Sessão de Música Finalizada!</Typography>
        <Button variant="contained" onClick={() => navigate('/')}>Voltar ao Início</Button>
      </Container>
    );
  }

  const progressValue = ((sessionState.currentSongIndex) / config.songs.length) * 100;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h4" component="h1" textAlign="center" gutterBottom>
            Sessão de Música
        </Typography>
        <LinearProgress variant="determinate" value={progressValue} sx={{ mb: 1 }} />
        <Typography variant="body2" textAlign="center">
            Música {sessionState.currentSongIndex + 1} de {config.songs.length}
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 4, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        {sessionState.stepType === 'music' && currentSong ? (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
            <HeadsetIcon sx={{ fontSize: 100, color: 'primary.main', mb: 4 }} />
            <Typography variant="h5" gutterBottom>{currentSong.name}</Typography>

            <audio
                ref={audioRef}
                src={currentSong.url}
                onEnded={handleNext}
                style={{ display: 'none' }}
            />

            <Box display="flex" gap={2} mt={4}>
                <IconButton onClick={togglePlayPause} color="primary" sx={{ border: '1px solid', p: 2 }}>
                    {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
                </IconButton>
                <IconButton onClick={handleNext} color="primary" sx={{ border: '1px solid', p: 2 }}>
                    <SkipNextIcon fontSize="large" />
                </IconButton>
            </Box>
            <Typography variant="body2" color="textSecondary" mt={2}>
                A reprodução avançará automaticamente ao final da música.
            </Typography>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" flexGrow={1}>
             <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="h6" sx={{ ml: 1 }}>{isRecording ? 'Lendo Frase...' : 'Pronto'}</Typography>
                <Box flexGrow={1} />
                {isRecording && isFinite(dbfs) && (
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
            </Box>

            <Box sx={{ height: 100, backgroundColor: '#1e1e1e', mb: 2, borderRadius: 1 }}>
                <canvas ref={canvasRef} width="600" height="100" style={{ width: '100%', height: '100%' }} />
            </Box>

            <Box flexGrow={1} display="flex" alignItems="center" justifyContent="center">
                <Typography
                    variant="h3"
                    sx={{ textAlign: 'center', my: 2, p: 2, lineHeight: 1.2 }}
                >
                    {currentPhrase?.text || 'Nenhuma frase configurada.'}
                </Typography>
            </Box>

            <Box mt={4} display="flex" justifyContent="center">
                <Button variant="contained" color="primary" size="large" onClick={handleNext}>
                    Próxima Etapa
                </Button>
            </Box>
          </Box>
        )}
      </Paper>

      <Box mt={4} display="flex" justifyContent="center">
        <Button variant="outlined" color="error" onClick={() => navigate('/')}>
            Sair da Sessão
        </Button>
      </Box>
    </Container>
  );
};

export default MusicSessionPage;