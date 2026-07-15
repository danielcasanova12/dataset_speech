import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '../contexts/AuthContext';
import { api, RecordingAudioRead } from '../services/api';

type SearchMode = 'recent' | 'email' | 'user_id' | 'session_id' | 'recording_id';

interface SessionSummary {
  sessionId: number;
  datasetId: number;
  recordingsCount: number;
  lastRecordingAt: string | null;
}

const getRecordingId = (recording: RecordingAudioRead) => recording.id_recordings;

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR');
};

const formatDuration = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return `${value.toFixed(1)}s`;
};

const buildSessionSummaries = (items: RecordingAudioRead[]): SessionSummary[] => {
  const summaries = new Map<number, SessionSummary>();

  items.forEach((recording) => {
    const current = summaries.get(recording.session_id);
    const createdAt = recording.created_at || null;

    if (!current) {
      summaries.set(recording.session_id, {
        sessionId: recording.session_id,
        datasetId: recording.dataset_id,
        recordingsCount: 1,
        lastRecordingAt: createdAt,
      });
      return;
    }

    current.recordingsCount += 1;
    if (createdAt && (!current.lastRecordingAt || new Date(createdAt) > new Date(current.lastRecordingAt))) {
      current.lastRecordingAt = createdAt;
    }
  });

  return Array.from(summaries.values()).sort((a, b) => {
    const aTime = a.lastRecordingAt ? new Date(a.lastRecordingAt).getTime() : 0;
    const bTime = b.lastRecordingAt ? new Date(b.lastRecordingAt).getTime() : 0;
    return bTime - aTime;
  });
};

const AdminRecordingsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [searchMode, setSearchMode] = useState<SearchMode>('recent');
  const [query, setQuery] = useState('');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [recordings, setRecordings] = useState<RecordingAudioRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({});
  const [audioLoadingIds, setAudioLoadingIds] = useState<number[]>([]);
  const [audioErrors, setAudioErrors] = useState<Record<number, string>>({});
  const [detailsRecording, setDetailsRecording] = useState<RecordingAudioRead | null>(null);

  const pageSize = 25;

  const modeLabel = useMemo(() => {
    if (searchMode === 'email') return 'E-mail do usuário';
    if (searchMode === 'user_id') return 'ID do usuário';
    if (searchMode === 'session_id') return 'ID da sessão';
    if (searchMode === 'recording_id') return 'ID da gravação';
    return 'Busca';
  }, [searchMode]);

  const loadRecentRecordings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.listRecordings({
        page: 1,
        page_size: pageSize,
        order: 'desc',
        has_audio: true,
      });

      setSessions(buildSessionSummaries(response.items));
      setSelectedSessionId(null);
      setRecordings([]);
      setTotal(response.total);
      setPage(response.page);
    } catch (error: any) {
      setSessions([]);
      setSelectedSessionId(null);
      setRecordings([]);
      setTotal(0);
      setError(error.message || 'Não foi possível carregar as gravações.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRecordings = useCallback(async (nextPage = 1) => {
    const trimmedQuery = query.trim();

    if (searchMode !== 'recent' && !trimmedQuery) {
      setError('Informe um valor para buscar.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (searchMode === 'session_id') {
        const sessionId = Number(trimmedQuery);
        if (!Number.isInteger(sessionId) || sessionId <= 0) {
          throw new Error('Informe um ID de sessão válido.');
        }

        const items = await api.getAdminSessionRecordings(sessionId);
        setSessions(buildSessionSummaries(items));
        setSelectedSessionId(sessionId);
        setRecordings(items);
        setTotal(items.length);
        setPage(1);
        return;
      }

      let userId: string | null = null;
      let recordingId: number | null = null;

      if (searchMode === 'email') {
        userId = await api.getAdminUserIdByEmail(trimmedQuery);
      }

      if (searchMode === 'user_id') {
        userId = trimmedQuery;
      }

      if (searchMode === 'recording_id') {
        recordingId = Number(trimmedQuery);
        if (!Number.isInteger(recordingId) || recordingId <= 0) {
          throw new Error('Informe um ID de gravação válido.');
        }
      }

      const response = await api.listRecordings({
        user_id: userId,
        recording_id: recordingId,
        page: nextPage,
        page_size: recordingId ? 1 : pageSize,
        order: 'desc',
        has_audio: true,
      });

      const nextSessions = buildSessionSummaries(response.items);
      setSessions(nextSessions);
      setSelectedSessionId(recordingId && nextSessions.length === 1 ? nextSessions[0].sessionId : null);
      setRecordings(recordingId ? response.items : []);
      setTotal(response.total);
      setPage(response.page);
    } catch (error: any) {
      setSessions([]);
      setSelectedSessionId(null);
      setRecordings([]);
      setTotal(0);
      setError(error.message || 'Não foi possível carregar as gravações.');
    } finally {
      setIsLoading(false);
    }
  }, [query, searchMode]);

  useEffect(() => {
    if (isAdmin) {
      void loadRecentRecordings();
    }
  }, [isAdmin, loadRecentRecordings]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void loadRecordings(1);
  };

  const handleSelectSession = async (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setIsLoadingRecordings(true);
    setError(null);
    setRecordings([]);
    setAudioUrls({});
    setAudioErrors({});

    try {
      const items = await api.getAdminSessionRecordings(sessionId);
      setRecordings(items);
    } catch (error: any) {
      setError(error.message || 'Não foi possível carregar as gravações da sessão.');
    } finally {
      setIsLoadingRecordings(false);
    }
  };

  const handleLoadAudio = async (recordingId: number) => {
    setAudioLoadingIds(previous => (previous.includes(recordingId) ? previous : [...previous, recordingId]));
    setAudioErrors(previous => {
      const next = { ...previous };
      delete next[recordingId];
      return next;
    });

    try {
      const audio = await api.getRecordingAudio(recordingId);
      if (!audio.audio_available || !audio.audio_url) {
        throw new Error('Áudio indisponível para esta gravação.');
      }

      setAudioUrls(previous => ({
        ...previous,
        [recordingId]: audio.audio_url || '',
      }));
    } catch (error: any) {
      setAudioErrors(previous => ({
        ...previous,
        [recordingId]: error.message || 'Não foi possível carregar o áudio.',
      }));
    } finally {
      setAudioLoadingIds(previous => previous.filter(id => id !== recordingId));
    }
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
              Gravações
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Consulte gravações por usuário, sessão ou ID da gravação.
            </Typography>
          </Box>

          <Button component={Link} to="/" variant="outlined" startIcon={<ArrowBackIcon />}>
            Voltar
          </Button>
        </Box>

        <Paper component="form" onSubmit={handleSubmit} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px 1fr auto' }, gap: 2 }}>
              <TextField
                select
                label="Filtro"
                value={searchMode}
                onChange={(event) => {
                  setSearchMode(event.target.value as SearchMode);
                  setQuery('');
                  setError(null);
                  setSelectedSessionId(null);
                  setRecordings([]);
                }}
                fullWidth
              >
                <MenuItem value="recent">Recentes</MenuItem>
                <MenuItem value="email">E-mail</MenuItem>
                <MenuItem value="user_id">ID do usuário</MenuItem>
                <MenuItem value="session_id">ID da sessão</MenuItem>
                <MenuItem value="recording_id">ID da gravação</MenuItem>
              </TextField>

              <TextField
                label={modeLabel}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                disabled={searchMode === 'recent'}
                placeholder={searchMode === 'recent' ? 'Mostrando as gravações mais recentes' : undefined}
                fullWidth
              />

              <Button type="submit" variant="contained" startIcon={<SearchIcon />} disabled={isLoading}>
                Buscar
              </Button>
            </Box>

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Sessões
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Selecione uma sessão para ver os áudios gravados.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                disabled={isLoading || page <= 1 || searchMode === 'session_id'}
                onClick={() => void loadRecordings(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outlined"
                disabled={isLoading || searchMode === 'session_id' || page * pageSize >= total}
                onClick={() => void loadRecordings(page + 1)}
              >
                Próxima
              </Button>
            </Stack>
          </Box>

          <Divider />

          {isLoading ? (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : sessions.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              Nenhuma sessão para exibir.
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sessão</TableCell>
                    <TableCell>Dataset</TableCell>
                    <TableCell>Áudios encontrados</TableCell>
                    <TableCell>Última gravação</TableCell>
                    <TableCell align="right">Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.sessionId} hover selected={session.sessionId === selectedSessionId}>
                      <TableCell>
                        <Chip label={session.sessionId} size="small" color={session.sessionId === selectedSessionId ? 'primary' : 'default'} />
                      </TableCell>
                      <TableCell>{session.datasetId}</TableCell>
                      <TableCell>{session.recordingsCount}</TableCell>
                      <TableCell>{formatDateTime(session.lastRecordingAt)}</TableCell>
                      <TableCell align="right">
                        <Button
                          variant={session.sessionId === selectedSessionId ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => void handleSelectSession(session.sessionId)}
                          disabled={isLoadingRecordings && session.sessionId === selectedSessionId}
                        >
                          {isLoadingRecordings && session.sessionId === selectedSessionId ? 'Carregando...' : 'Ver áudios'}
                        </Button>
                      </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {selectedSessionId && (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Áudios da sessão {selectedSessionId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {recordings.length} áudio{recordings.length === 1 ? '' : 's'} nesta sessão.
              </Typography>
            </Box>

            <Divider />

            {isLoadingRecordings ? (
              <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : recordings.length === 0 ? (
              <Alert severity="info" sx={{ m: 2 }}>
                Nenhum áudio encontrado para esta sessão.
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Bloco</TableCell>
                      <TableCell>Frase</TableCell>
                      <TableCell>Duração</TableCell>
                      <TableCell>Criada em</TableCell>
                      <TableCell>Áudio</TableCell>
                      <TableCell align="right">Detalhes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recordings.map((recording) => {
                      const recordingId = getRecordingId(recording);
                      const isAudioLoading = audioLoadingIds.includes(recordingId);
                      const audioUrl = audioUrls[recordingId] || recording.audio_url || null;

                      return (
                        <TableRow key={recordingId} hover>
                          <TableCell>
                            <Chip label={recordingId} size="small" />
                          </TableCell>
                          <TableCell>{recording.bloco_id}</TableCell>
                          <TableCell>{recording.frase_id ?? '-'}</TableCell>
                          <TableCell>{formatDuration(recording.duration)}</TableCell>
                          <TableCell>{formatDateTime(recording.created_at)}</TableCell>
                          <TableCell sx={{ minWidth: 280 }}>
                            <Stack spacing={1}>
                              {audioUrl ? (
                                <audio controls src={audioUrl} style={{ width: '100%' }} />
                              ) : (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<PlayArrowIcon />}
                                  disabled={isAudioLoading}
                                  onClick={() => void handleLoadAudio(recordingId)}
                                >
                                  {isAudioLoading ? 'Carregando...' : 'Carregar áudio'}
                                </Button>
                              )}

                              {audioErrors[recordingId] && (
                                <Typography variant="caption" color="error">
                                  {audioErrors[recordingId]}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => setDetailsRecording(recording)}
                            >
                              Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        )}
      </Stack>

      <Dialog open={!!detailsRecording} onClose={() => setDetailsRecording(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Detalhes da gravação {detailsRecording ? getRecordingId(detailsRecording) : ''}
        </DialogTitle>
        <DialogContent dividers>
          {detailsRecording && (
            <Stack spacing={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <Typography><strong>Sessão:</strong> {detailsRecording.session_id}</Typography>
                <Typography><strong>Dataset:</strong> {detailsRecording.dataset_id}</Typography>
                <Typography><strong>Bloco:</strong> {detailsRecording.bloco_id}</Typography>
                <Typography><strong>ID da frase:</strong> {detailsRecording.frase_id ?? '-'}</Typography>
                <Typography><strong>Duração:</strong> {formatDuration(detailsRecording.duration)}</Typography>
                <Typography><strong>Formato:</strong> {detailsRecording.format || '-'}</Typography>
                <Typography><strong>Sample rate:</strong> {detailsRecording.sample_rate || '-'}</Typography>
                <Typography><strong>Criada em:</strong> {formatDateTime(detailsRecording.created_at)}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Frase
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography>{detailsRecording.frase_content || 'Sem frase registrada.'}</Typography>
                </Paper>
              </Box>

              {detailsRecording.extra_info && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                    Informações extras
                  </Typography>
                  <Paper component="pre" variant="outlined" sx={{ p: 2, m: 0, overflow: 'auto', bgcolor: 'background.default' }}>
                    {JSON.stringify(detailsRecording.extra_info, null, 2)}
                  </Paper>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default AdminRecordingsPage;
