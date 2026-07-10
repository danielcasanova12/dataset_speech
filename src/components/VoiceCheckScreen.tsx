import React from 'react';
import { Button, Typography, Box, Modal, Grid } from '@mui/material';

const modalStyle = {
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

interface VoiceCheckScreenProps {
  onSubmit: (voiceQuality: string) => void;
}

const VoiceCheckScreen: React.FC<VoiceCheckScreenProps> = ({ onSubmit }) => {
  return (
    <Modal open={true} aria-labelledby="voice-check-modal-title">
      <Box sx={modalStyle}>
        <Typography id="voice-check-modal-title" variant="h6" component="h2" textAlign="center">
          Como está sua voz hoje?
        </Typography>
        <Grid container spacing={2} sx={{ mt: 3 }} justifyContent="center">
          <Grid item>
            <Button variant="contained" onClick={() => onSubmit('boa')}>
              Boa
            </Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={() => onSubmit('razoavel')}>
              Razoável
            </Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" color="secondary" onClick={() => onSubmit('ruim')}>
              Ruim
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
};

export default VoiceCheckScreen;
