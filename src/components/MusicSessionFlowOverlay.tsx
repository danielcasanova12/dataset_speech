import React from 'react';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import HourglassTopOutlinedIcon from '@mui/icons-material/HourglassTopOutlined';
import { Box, CircularProgress, Paper, Typography } from '@mui/material';

export type MusicSessionFlowPhase = 'countdown' | 'uploading' | null;

interface MusicSessionFlowOverlayProps {
  countdown: number | null;
  label: string | null;
  message: string;
  phase?: MusicSessionFlowPhase;
  countdownOnly?: boolean;
}

const MusicSessionFlowOverlay: React.FC<MusicSessionFlowOverlayProps> = ({
  countdown,
  label,
  message,
  phase = null,
  countdownOnly = false,
}) => {
  const isOpen = countdown !== null || (!countdownOnly && phase !== null);
  if (!isOpen) return null;

  if (countdownOnly) {
    return (
      <Box
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 2600,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'rgba(9, 12, 18, 0.72)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <Typography
          aria-label={`Contagem: ${countdown}`}
          sx={{
            color: 'primary.contrastText',
            fontSize: { xs: '7rem', sm: '10rem' },
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {countdown}
        </Typography>
      </Box>
    );
  }

  const isUploading = countdown === null && phase === 'uploading';

  return (
    <Box
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 2600,
        display: 'grid',
        placeItems: 'center',
        p: 2,
        bgcolor: 'rgba(9, 12, 18, 0.72)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Paper
        elevation={16}
        sx={{
          width: 'min(420px, 100%)',
          minHeight: 292,
          p: { xs: 3, sm: 4 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {isUploading ? (
          <>
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2.5 }}>
              <CircularProgress size={76} thickness={4} />
              <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                <CloudUploadOutlinedIcon color="primary" fontSize="large" />
              </Box>
            </Box>
            <Typography variant="h5" component="p" sx={{ fontWeight: 800 }}>
              Enviando gravação
            </Typography>
          </>
        ) : (
          <>
            <HourglassTopOutlinedIcon color="primary" sx={{ fontSize: 30, mb: 1 }} />
            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800 }}>
              {label || 'Preparando'}
            </Typography>
            <Typography
              sx={{
                my: 1,
                color: 'primary.main',
                fontSize: { xs: '5.5rem', sm: '7rem' },
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {countdown}
            </Typography>
          </>
        )}

        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 320 }}>
          {isUploading ? 'Aguarde a confirmação do servidor antes de continuar.' : message}
        </Typography>
      </Paper>
    </Box>
  );
};

export default MusicSessionFlowOverlay;
