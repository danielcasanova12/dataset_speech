import React from 'react';
import { Box, LinearProgress, Typography, Paper } from '@mui/material';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

type VisualizerMode = 'mic' | 'music';

interface AudioVisualizerProps {
  mode: VisualizerMode;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  dbfs?: number;
  isActive?: boolean;
  musicProgress?: number;
  musicLabel?: string;
}

const getDbfsColor = (dbfs: number) => {
  if (!Number.isFinite(dbfs) || dbfs <= -35) return '#666';
  if (dbfs > -12) return '#f44336';
  if (dbfs > -25) return '#ffeb3b';
  return '#4caf50';
};

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  mode,
  canvasRef,
  dbfs = -100,
  isActive = false,
  musicProgress = 0,
  musicLabel = 'Reproduzindo música',
}) => {
  if (mode === 'mic') {
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
            MICROFONE
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isActive && <GraphicEqIcon sx={{ color: 'primary.main' }} />}
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                bgcolor: getDbfsColor(dbfs),
                boxShadow: dbfs > -35 ? `0 0 14px ${getDbfsColor(dbfs)}` : 'none',
                border: '1px solid #555',
              }}
            />
          </Box>
        </Box>
        <Paper elevation={0} sx={{ height: 104, bgcolor: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
          <canvas ref={canvasRef} width="600" height="100" style={{ width: '100%', height: '100%' }} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Paper
        elevation={0}
        sx={{
          minHeight: 104,
          borderRadius: 2,
          p: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(25,118,210,0.12), rgba(3,169,244,0.22))',
          border: '1px solid rgba(25,118,210,0.18)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(25,118,210,0.16)',
              animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}
          >
            <MusicNoteIcon sx={{ color: 'primary.main', fontSize: 30 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
              {musicLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              O áudio de fundo está tocando.
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(0, musicProgress))}
          sx={{ height: 10, borderRadius: 999 }}
        />
      </Paper>
    </Box>
  );
};

export default AudioVisualizer;
