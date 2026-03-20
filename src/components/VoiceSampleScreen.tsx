import React from 'react';
import { Button, Typography, Box, Modal, Card, CardContent, Grid, CircularProgress } from '@mui/material';

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

type VoiceSampleStep = 'ready' | 'recording' | 'recorded' | 'playing';

interface VoiceSampleScreenProps {
  step: VoiceSampleStep;
  audioUrl: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPlay: () => void;
  onSampleRecorded: (audioUrl: string) => void; 
  onPlaybackEnded: () => void;
}

const VoiceSampleScreen: React.FC<VoiceSampleScreenProps> = ({
  step,
  audioUrl,
  onStartRecording,
  onStopRecording,
  onPlay,
  onSampleRecorded,
  onPlaybackEnded,
}) => {
  return (
    <Modal open={true} aria-labelledby="voice-sample-modal-title">
      <Box sx={modalStyle}>
        <Typography id="voice-sample-modal-title" variant="h6" component="h2" textAlign="center">
          Teste de Microfone
        </Typography>
        <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
          Grave uma pequena amostra de áudio para garantir que seu microfone está funcionando corretamente. Fale algo como "Teste de som, um, dois, três".
        </Typography>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60px' }}>
          {step === 'ready' && (
            <Button variant="contained" onClick={onStartRecording}>
              Gravar Amostra
            </Button>
          )}

          {step === 'recording' && (
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress />
              <Typography sx={{ mt: 1 }}>Gravando...</Typography>
              <Button variant="contained" color="error" onClick={onStopRecording} sx={{ mt: 2 }}>
                Parar
              </Button>
            </Box>
          )}

          {step === 'recorded' && (
            <Grid container spacing={2} justifyContent="center">
              <Grid item>
                <Button variant="outlined" onClick={onStartRecording}>
                  Gravar Novamente
                </Button>
              </Grid>
              <Grid item>
                <Button variant="contained" onClick={onPlay} disabled={!audioUrl}>
                  Ouvir Amostra
                </Button>
              </Grid>
              <Grid item>
                <Button variant="contained" color="primary" onClick={() => onSampleRecorded(audioUrl!)} disabled={!audioUrl}>
                  Continuar
                </Button>
              </Grid>
            </Grid>
          )}

          {step === 'playing' && (
             <Box sx={{ textAlign: 'center' }}>
                <Typography>Reproduzindo...</Typography>
                <audio src={audioUrl || ''} autoPlay onEnded={onPlaybackEnded} />
             </Box>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default VoiceSampleScreen;
