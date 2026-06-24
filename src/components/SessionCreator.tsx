import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  TextField,
  Typography,
  Divider,
  Stack,
  Chip,
  Slider,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';

export interface MusicSessionRow {
  backgroundAudioUrl: string;
  backgroundAudioName?: string;
  textPrompt: string;
}

interface SessionCreatorProps {
  title: string;
  description: string;
  initialRows?: MusicSessionRow[];
  onCreate: (rows: MusicSessionRow[], spokenPercentage: number) => void;
  onCancel?: () => void;
}

const createEmptyRow = (): MusicSessionRow => ({
  backgroundAudioUrl: '',
  backgroundAudioName: '',
  textPrompt: '',
});

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de áudio.'));
    reader.readAsDataURL(file);
  });
};

const SessionCreator: React.FC<SessionCreatorProps> = ({
  title,
  description,
  initialRows,
  onCreate,
  onCancel,
}) => {
  const [rows, setRows] = useState<MusicSessionRow[]>(
    () => (initialRows && initialRows.length > 0 ? initialRows : [createEmptyRow()])
  );
  const [spokenPercentage, setSpokenPercentage] = useState(15);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (index: number, patch: Partial<MusicSessionRow>) => {
    setRows(prev => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows(prev => [...prev, createEmptyRow()]);
  };

  const removeRow = (index: number) => {
    setRows(prev => (prev.length > 1 ? prev.filter((_, rowIndex) => rowIndex !== index) : prev));
  };

  const handleFileChange = async (index: number, file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      updateRow(index, {
        backgroundAudioUrl: dataUrl,
        backgroundAudioName: file.name,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar o áudio.');
    }
  };

  const handleCreate = () => {
    const hasInvalidRow = rows.some(row => !row.backgroundAudioUrl.trim() || !row.textPrompt.trim());
    if (hasInvalidRow) {
      setError('Preencha a URL/arquivo de áudio e o texto de todos os blocos antes de continuar.');
      return;
    }
    onCreate(rows, spokenPercentage);
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ mt: 6, p: 4, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" textAlign="center" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
          {description}
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Percentual de trechos falados na sessão: {spokenPercentage}%
          </Typography>
          <Slider
            value={spokenPercentage}
            onChange={(_, value) => setSpokenPercentage(Array.isArray(value) ? value[0] : value)}
            step={1}
            min={0}
            max={20}
            valueLabelDisplay="auto"
          />
          <Typography variant="body2" color="text.secondary">
            Ajusta quantos trechos falados serão gerados a partir dos blocos digitados.
          </Typography>
        </Box>

        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {rows.map((row, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Par {index + 1}</Typography>
                <IconButton onClick={() => removeRow(index)} aria-label={`Remover par ${index + 1}`}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>

              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField
                  label="URL do áudio de fundo"
                  placeholder="https://... ou cole uma URL pública"
                  helperText="Cole a URL direta do áudio ou use o botão abaixo para anexar um arquivo local."
                  type="text"
                  value={row.backgroundAudioUrl}
                  onChange={(event) => updateRow(index, { backgroundAudioUrl: event.target.value, backgroundAudioName: undefined })}
                  fullWidth
                />

                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button variant="outlined" component="label" startIcon={<AudiotrackIcon />}>
                    Anexar áudio
                    <input
                      hidden
                      type="file"
                      accept="audio/*"
                      onChange={(event) => handleFileChange(index, event.target.files?.[0] || null)}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {row.backgroundAudioName || 'Nenhum arquivo anexado'}
                  </Typography>
                  {row.backgroundAudioUrl && (
                    <Chip
                      size="small"
                      label={row.backgroundAudioName ? 'Arquivo anexado' : 'URL informada'}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Stack>

                <TextField
                  label="Trechos falados"
                  placeholder="Digite um trecho por linha. Ex: Nossa, nossa"
                  value={row.textPrompt}
                  onChange={(event) => updateRow(index, { textPrompt: event.target.value })}
                  fullWidth
                  multiline
                  minRows={3}
                  helperText="Separe os trechos apenas por ENTER. Cada linha vira um trecho falado."
                />
              </Box>
            </Paper>
          ))}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<AddCircleOutlineIcon />} onClick={addRow}>
            Adicionar par
          </Button>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {onCancel && (
              <Button variant="outlined" color="error" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button variant="contained" onClick={handleCreate}>
              Iniciar sessão
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default SessionCreator;
