import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Typography, Box, Paper, CircularProgress } from '@mui/material';

interface RoomToneScreenProps {
  onRecordingComplete: (blob: Blob) => void;
}

const RoomToneScreen: React.FC<RoomToneScreenProps> = ({ onRecordingComplete }) => {
  const [step, setStep] = useState<'initial' | 'recording' | 'finished'>('initial');
  const [countdown, setCountdown] = useState(5);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        audioChunksRef.current = [];
        onRecordingComplete(audioBlob);
      };
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [onRecordingComplete]);

  const startRecordingFlow = () => {
    setCountdown(5);
    setStep('recording');
  };

  useEffect(() => {
    const handleStartRecording = async () => {
      try {
        const savedMicId = localStorage.getItem('selectedMicId');
        const audioConstraints = savedMicId ? { deviceId: { exact: savedMicId } } : true;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        streamRef.current = stream;
        mediaRecorderRef.current = new MediaRecorder(stream);
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // Inicia a gravação
        mediaRecorderRef.current.start();
        
        // Configura um timeout para parar a gravação após 5 segundos
        setTimeout(() => {
          stopRecording();
          setStep('finished');
        }, 5000);

      } catch (err) {
        console.error("Erro ao iniciar a gravação de som ambiente:", err);
        // Em caso de erro, avança para a próxima etapa para não bloquear o usuário
        onRecordingComplete(new Blob()); 
      }
    };

    if (step === 'recording') {
      handleStartRecording();
    }
    
    // Cleanup: Garante que a gravação pare se o componente for desmontado
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        stopRecording();
      }
    };
  }, [onRecordingComplete, step, stopRecording]);

  useEffect(() => {
    if (step === 'recording') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev > 1) {
            return prev - 1;
          } else {
            clearInterval(timer);
            return 0;
          }
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  return (
    <Box
      sx={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1500,
      }}
    >
      <Paper elevation={12} sx={{ p: 4, maxWidth: '600px', borderRadius: 4, m: 2, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Gravação de Som Ambiente
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Agora, vamos gravar 5 segundos de silêncio para capturar o som do seu ambiente. Por favor, não fale.
        </Typography>

        {step === 'initial' && (
          <Button variant="contained" color="primary" onClick={startRecordingFlow}>
            Iniciar
          </Button>
        )}

        {step === 'recording' && (
          <Box>
            <Typography variant="h2" component="p" sx={{ my: 2 }}>{countdown}</Typography>
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>Gravando... Fique em silêncio.</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default RoomToneScreen;
