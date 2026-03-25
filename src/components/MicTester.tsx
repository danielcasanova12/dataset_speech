import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MicIcon from '@mui/icons-material/Mic';

interface MicTesterProps {
  onMicStatusChange?: (hasMic: boolean) => void;
}

const MicTester: React.FC<MicTesterProps> = ({ onMicStatusChange }) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    // Tenta pegar a lista inicial (pode requerer permissão prévia)
    const getDevices = async () => {
      setIsSearching(true);
      try {
        const d = await navigator.mediaDevices.enumerateDevices();
        let audioInputs = d.filter(device => device.kind === 'audioinput' && device.deviceId !== '');
        
        if (audioInputs.length === 0) {
          // Se não listou, pede permissão e lista de novo
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            const d2 = await navigator.mediaDevices.enumerateDevices();
            audioInputs = d2.filter(device => device.kind === 'audioinput' && device.deviceId !== '');
          } catch (err) {
             console.error("Erro ao pedir permissão para listar microfones", err);
          }
        }

        setDevices(audioInputs);
        if (onMicStatusChange) {
          onMicStatusChange(audioInputs.length > 0);
        }
        
        const savedMic = localStorage.getItem('selectedMicId');
        if (savedMic && audioInputs.some(d => d.deviceId === savedMic)) {
          setSelectedDeviceId(savedMic);
        } else if (audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error("Erro ao listar dispositivos", err);
        if (onMicStatusChange) {
          onMicStatusChange(false);
        }
      } finally {
        setIsSearching(false);
      }
    };
    getDevices();

    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
      stopStream();
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  useEffect(() => {
    if (!selectedDeviceId) return;

    const startMic = async () => {
      stopStream();
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: selectedDeviceId } }
        });
        streamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass({ sampleRate: 8000 });
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyserRef.current = analyser;
        analyser.fftSize = 512;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        drawWave();
        localStorage.setItem('selectedMicId', selectedDeviceId);
      } catch (err) {
        console.error("Erro ao iniciar microfone", err);
        setError("Não foi possível acessar este microfone.");
      }
    };

    startMic();
  }, [selectedDeviceId]);

  const drawWave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(240, 240, 240)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(0, 123, 255)';

      canvasCtx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, margin: 'auto', mt: 3, mb: 4 }}>
      <Accordion variant="outlined" sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} id="mic-tester-header">
          <Box display="flex" alignItems="center" width="100%">
            <MicIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="subtitle1" fontWeight="bold">Configuração de Microfone</Typography>
            {!isSearching && devices.length > 0 && selectedDeviceId && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', mr: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                {devices.find(d => d.deviceId === selectedDeviceId)?.label?.replace(/\s*\(\d+:\d+\)$/, '').trim() || 'Microfone Ativo'}
              </Typography>
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ textAlign: 'center' }}>
            {isSearching ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, p: 2 }}>
                <CircularProgress size={24} sx={{ mr: 2 }} />
                <Typography variant="body2">Procurando microfones...</Typography>
              </Box>
            ) : devices.length > 0 ? (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="mic-select-label">Selecione o Microfone</InputLabel>
                <Select
                  labelId="mic-select-label"
                  value={selectedDeviceId}
                  label="Selecione o Microfone"
                  onChange={(e) => setSelectedDeviceId(e.target.value as string)}
                  sx={{ textAlign: 'left' }}
                >
                  {devices.map((device, index) => (
                    <MenuItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microfone ${index + 1}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Box sx={{ mb: 2, p: 2, border: '1px solid #ff9800', borderRadius: 2, backgroundColor: 'rgba(255, 152, 0, 0.1)' }}>
                <Typography color="warning.main" variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Nenhum microfone encontrado
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Certifique-se de que o microfone está conectado e que você deu permissão de acesso no navegador (clicando no ícone de cadeado na barra de endereços).
                </Typography>
              </Box>
            )}

            {!isSearching && devices.length > 0 && (
              error ? (
                <Typography color="error" variant="body2">{error}</Typography>
              ) : (
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: 80, 
                    borderRadius: 2, 
                    overflow: 'hidden', 
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#1e1e1e',
                    boxShadow: 'inset 0px 4px 10px rgba(0,0,0,0.5)'
                  }}
                >
                  <canvas ref={canvasRef} width="600" height="80" style={{ width: '100%', height: '100%', display: 'block' }} />
                </Box>
              )
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default MicTester;