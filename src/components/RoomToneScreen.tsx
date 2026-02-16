import React, { useState, useEffect } from 'react';
import { Button, Typography, Box, Paper, CircularProgress } from '@mui/material';

interface RoomToneScreenProps {
  onRecordingComplete: () => void;
}

const RoomToneScreen: React.FC<RoomToneScreenProps> = ({ onRecordingComplete }) => {
  const [step, setStep] = useState<'initial' | 'countdown' | 'recording'>('initial');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (step === 'countdown' || step === 'recording') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            if (step === 'countdown') {
              setStep('recording');
              return 5; // Duração da gravação
            } else {
              clearInterval(timer);
              onRecordingComplete();
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, onRecordingComplete]);

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
          <Button variant="contained" color="primary" onClick={() => setStep('countdown')}>
            Iniciar
          </Button>
        )}

        {step === 'countdown' && (
          <Box>
            <Typography variant="h2" component="p" sx={{ my: 2 }}>{countdown}</Typography>
            <Typography variant="h6" sx={{ mt: 2 }}>Prepare-se...</Typography>
          </Box>
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
