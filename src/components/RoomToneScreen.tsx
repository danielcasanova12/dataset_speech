import React from 'react';
import { Button, Typography, Box, Paper, CircularProgress } from '@mui/material';

interface RoomToneScreenProps {
  onStartRecording: () => void;
  isRecording: boolean;
  initialCountdownActive: boolean;
  countdown: number;
}

const RoomToneScreen: React.FC<RoomToneScreenProps> = ({ 
  onStartRecording, 
  isRecording, 
  initialCountdownActive, 
  countdown 
}) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1500,
      }}
    >
      <Paper elevation={12} sx={{ p: 4, maxWidth: '600px', borderRadius: 4, m: 2, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Gravação de Som Ambiente
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Agora, vamos gravar 5 segundos de silêncio para capturar o som do seu ambiente. Por favor, não fale durante a contagem regressiva.
        </Typography>

        {!isRecording && !initialCountdownActive && (
          <Button variant="contained" color="primary" onClick={onStartRecording}>
            Iniciar Gravação de Som Ambiente
          </Button>
        )}

        {initialCountdownActive && (
          <Box>
            <Typography variant="h2" component="p" sx={{ my: 2 }}>
              {countdown}
            </Typography>
            <Typography variant="h6" sx={{ mt: 2 }}>
              Prepare-se...
            </Typography>
          </Box>
        )}

        {isRecording && (
          <Box>
            <Typography variant="h2" component="p" sx={{ my: 2 }}>
              {countdown}
            </Typography>
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Gravando... Fique em silêncio.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default RoomToneScreen;