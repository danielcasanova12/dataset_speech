import React from 'react';
import { Box, Button } from '@mui/material';

interface ControlButtonsProps {
  sessionType: 'general' | 'music';
  stepType: 'music' | 'spoken';
  isBusy?: boolean;
  canGoBack: boolean;
  canGoNext: boolean;
  canFinish: boolean;
  onRestart: () => void;
  onPlayPause: () => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

const ControlButtons: React.FC<ControlButtonsProps> = ({
  sessionType,
  stepType,
  isBusy = false,
  canGoBack,
  canGoNext,
  canFinish,
  onRestart,
  onPlayPause,
  onBack,
  onNext,
  onFinish,
}) => {
  const primaryLabel = stepType === 'music'
    ? 'Pausar/Tocar'
    : 'Pausar/Retomar';

  const restartLabel = stepType === 'music'
    ? 'Recomeçar'
    : 'Reiniciar Gravação';

  return (
    <Box
      mt={4}
      display="flex"
      flexWrap="wrap"
      justifyContent="space-between"
      gap={2}
    >
      <Box display="flex" flexWrap="wrap" gap={2}>
        <Button variant="outlined" onClick={onRestart} disabled={isBusy}>
          {restartLabel}
        </Button>
        <Button variant="outlined" onClick={onPlayPause} disabled={isBusy}>
          {primaryLabel}
        </Button>
      </Box>

      <Box display="flex" flexWrap="wrap" gap={2}>
        <Button variant="outlined" onClick={onBack} disabled={!canGoBack || isBusy}>
          Voltar
        </Button>
        <Button variant="outlined" onClick={onNext} disabled={!canGoNext || isBusy}>
          Próximo
        </Button>
        <Button
          variant="contained"
          onClick={onFinish}
          disabled={isBusy || !canFinish}
          color={sessionType === 'music' ? 'primary' : 'success'}
        >
          Finalizar
        </Button>
      </Box>
    </Box>
  );
};

export default ControlButtons;
