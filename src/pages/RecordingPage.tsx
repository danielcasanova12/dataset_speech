import React, { useState, useRef, useEffect } from 'react';
import { Button, Typography, Container, Box, Modal, Card, CardContent, CircularProgress, ThemeProvider, createTheme, CssBaseline, Snackbar, Alert } from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { purple, grey } from '@mui/material/colors';
import { getOrCreateSession, uploadAudio, fetchPhrases } from '../services/api';
import { useAuth } from '../context/AuthContext';

// --- THEME ---
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: purple[300] },
        secondary: { main: grey[700] },
        background: { default: '#101010', paper: '#1e1e1e' },
        text: { primary: grey[200], secondary: grey[400] },
    },
    typography: {
        fontFamily: 'Roboto, sans-serif',
        h3: { fontWeight: 700 },
        h4: { fontWeight: 700 },
        subtitle1: { fontWeight: 300 },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 8, textTransform: 'none', fontWeight: 600, padding: '10px 20px' },
            },
        },
    },
});

const datasetNames: { [key: string]: string } = {
    "1": "Dataset voz geral",
    "2": "Dataset canto",
    "3": "Dataset emoção",
};

interface Phrase {
    id: number; emocaoid: number; datasetid: number; text: string;
}

const modalStyle = {
    position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 400, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4,
};

// --- MAIN COMPONENT ---
const RecordingPage: React.FC = () => {
    const { datasetId } = useParams<{ datasetId: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    // --- STATE ---
    const [phrases, setPhrases] = useState<Phrase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const [isCountdownModalOpen, setIsCountdownModalOpen] = useState(false);
    const [openFinishModal, setOpenFinishModal] = useState(false);
    const [timer, setTimer] = useState(0);
    const [countdown, setCountdown] = useState(3);
    const [isMicErrorModalOpen, setIsMicErrorModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
    const [sessionId, setSessionId] = useState<string | null>(null);

    // --- REFS ---
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recordingStartTimeRef = useRef<number>(0);
    const timerIntervalId = useRef<NodeJS.Timeout | null>(null);

    const currentPhrase = phrases[currentPhraseIndex];

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const initializeSession = async () => {
            if (!datasetId) return;
            try {
                const id = await getOrCreateSession(datasetId);
                setSessionId(id);
            } catch (error) {
                console.error("Failed to initialize session:", error);
                setToast({ open: true, message: 'Erro ao iniciar sessão. Redirecionando...', severity: 'error' });
                setTimeout(() => navigate('/'), 2000);
            }
        };

        const loadPhrases = async () => {
            if (!datasetId) return;
            setIsLoading(true);
            try {
                const phrasesData = await fetchPhrases(datasetId);
                setPhrases(phrasesData);
            } catch (error) {
                console.error("Failed to load phrases:", error);
                setToast({ open: true, message: 'Erro ao carregar frases.', severity: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        
        initializeSession();
        loadPhrases();

    }, [datasetId, navigate]);


    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    setAudioChunks((prev) => [...prev, event.data]);
                }
            };
            recorder.start();
            recordingStartTimeRef.current = performance.now();
            setIsRecording(true);
            setTimer(0);
        } catch (err) {
            console.error("Failed to start recording:", err);
            setIsMicErrorModalOpen(true);
        }
    };

    const stopRecording = (): Promise<Blob> => {
        return new Promise(resolve => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
                resolve(new Blob());
                return;
            }
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                streamRef.current?.getTracks().forEach(track => track.stop());
                resolve(blob);
            };
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setAudioChunks([]);
        });
    };

    const startCountdownAndRecording = async () => {
        setCountdown(3);
        setIsCountdownModalOpen(true);
        await new Promise<void>((resolve) => {
            const countdownTimer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev > 1) return prev - 1;
                    clearInterval(countdownTimer);
                    setIsCountdownModalOpen(false);
                    resolve();
                    return 0;
                });
            }, 1000);
        });
        await startRecording();
    };

    const handleNextPhrase = async () => {
        if (isProcessing) return;
        setIsProcessing(true);

        if (isRecording) {
            const recordingEndTime = performance.now();
            const claimed_duration = (recordingEndTime - recordingStartTimeRef.current) / 1000;
            const audioBlob = await stopRecording();

            if (audioBlob.size > 0 && datasetId) {
                setIsUploading(true);
                try {
                    const metadata = {
                        datasetId,
                        emotionId: currentPhrase.emocaoid,
                        format: 'webm',
                        claimed_duration
                    };
                    await uploadAudio(audioBlob, metadata, datasetId);
                    setToast({ open: true, message: 'Áudio enviado com sucesso!', severity: 'success' });
                } catch (error) {
                    setToast({ open: true, message: 'Erro ao enviar áudio.', severity: 'error' });
                } finally {
                    setIsUploading(false);
                }
            }
        }

        if (currentPhraseIndex < phrases.length - 1) {
            setCurrentPhraseIndex(currentPhraseIndex + 1);
            await startCountdownAndRecording();
        } else {
            setOpenFinishModal(true);
            localStorage.removeItem('recordingSessionId');
        }

        setIsProcessing(false);
    };

    useEffect(() => {
        if (phrases.length > 0) {
            startCountdownAndRecording();
        }
    }, [phrases]);


    useEffect(() => {
        if (isRecording) {
            timerIntervalId.current = setInterval(() => setTimer(prev => prev + 1), 1000);
        } else {
            if (timerIntervalId.current) clearInterval(timerIntervalId.current);
        }
        return () => {
            if (timerIntervalId.current) clearInterval(timerIntervalId.current);
        };
    }, [isRecording]);

    const handleCloseToast = () => setToast(prev => ({ ...prev, open: false }));
    const formatTime = (time: number) => `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`;

    if (isLoading || !phrases.length) {
        return <ThemeProvider theme={darkTheme}><CssBaseline /><Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Container></ThemeProvider>;
    }

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Snackbar open={toast.open} autoHideDuration={6000} onClose={handleCloseToast} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%' }}>{toast.message}</Alert>
            </Snackbar>
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Typography variant="h3" component="h1" textAlign="center" sx={{ mb: 1 }}>
                    Gravação ({datasetId ? datasetNames[datasetId] : ''})
                </Typography>
                {sessionId && <Typography variant="subtitle1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>ID da Sessão: {sessionId}</Typography>}
                
                <Card sx={{ p: 4, borderRadius: 4 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                        {isRecording && <FiberManualRecordIcon sx={{ color: 'red', animation: 'blinking 1s infinite' }} />}
                        <Typography variant="h6" sx={{ ml: 1 }}>{isRecording ? 'Gravando...' : isUploading ? 'Enviando...' : 'Pronto'}</Typography>
                        <Box flexGrow={1} />
                        <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>{formatTime(timer)}</Typography>
                    </Box>
                    
                    <Box sx={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
                        <Typography variant="h4" sx={{ textAlign: 'center' }}>{currentPhrase?.text}</Typography>
                    </Box>
                    
                    <Box mt={4} display="flex" justifyContent="flex-end">
                        <Button variant="contained" color="primary" onClick={handleNextPhrase} disabled={isProcessing || isUploading}>
                            {isUploading ? <CircularProgress size={24} /> : (currentPhraseIndex < phrases.length - 1 ? 'Salvar e Próxima' : 'Finalizar')}
                        </Button>
                    </Box>
                </Card>

                <Box mt={4} display="flex" justifyContent="center">
                    <Button onClick={() => navigate('/')} variant="outlined" color="error">Abandonar Sessão</Button>
                </Box>
            </Container>

            {/* Modals */}
            <Modal open={isCountdownModalOpen}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <Typography variant="h1" sx={{ fontSize: '20rem', color: 'white' }}>{countdown}</Typography>
                </Box>
            </Modal>
            <Modal open={openFinishModal}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" component="h2" textAlign="center">Sessão Finalizada!</Typography>
                    <Box mt={2} display="flex" justifyContent="center">
                        <Button component={Link} to="/">Voltar para a Home</Button>
                    </Box>
                </Box>
            </Modal>
            <Modal open={isMicErrorModalOpen}>
                <Box sx={modalStyle}>
                    <Typography variant="h6" component="h2" textAlign="center">Acesso ao Microfone Bloqueado</Typography>
                    <Typography sx={{ mt: 2, textAlign: 'center' }}>Permita o acesso ao microfone nas configurações do seu navegador e recarregue a página.</Typography>
                    <Box mt={3} display="flex" justifyContent="center">
                        <Button onClick={() => window.location.reload()} variant="contained">Recarregar</Button>
                    </Box>
                </Box>
            </Modal>
        </ThemeProvider>
    );
};

export default RecordingPage;