import React, { useState, useEffect } from 'react';
import { Container, Typography, TextField, Button, Box, Link as MuiLink, Alert, Grid, IconButton, Card, CardContent, Avatar, Select, MenuItem, FormControl, InputLabel, Modal, Stepper, Step, StepLabel } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRegistrationData } from '../services/api';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import ChildCareOutlinedIcon from '@mui/icons-material/ChildCareOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import ConsentScreen from '../components/ConsentScreen';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import BrazilLocationFields from '../components/BrazilLocationFields';
import { createGuestPassword, normalizeHousingHistory, validateRegistrationData } from '../utils/registration';

const GuestRegisterPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Dados Básicos', 'Localização Atual', 'Histórico de Moradia'];
  const [formData, setFormData] = useState<UserRegistrationData>({
    email: '',
    password: '',
    nome_completo: '',
    data_nascimento: '',
    genero: '',
    language: 'pt-BR',
    cidade_nascimento: { cidade: '', estado: '' },
    cidade_atual: { cidade: '', estado: '' },
    historico_moradia: [{ periodo: '', endereco: { cidade: '', estado: '' } }],
    familiares: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [validationError, setValidationError] = useState({ email: '' });
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    setConsentModalOpen(true);
    
  }, []);

  const handleAcceptConsent = () => {
    sessionStorage.setItem('has_consented_guest', 'true');
    setHasConsented(true);
    setConsentModalOpen(false);
  };

  const handleDeclineConsent = () => {
    navigate('/');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleHistoricoChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      historico_moradia: prev.historico_moradia.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
  };
  
  const addHistorico = () => {
    setFormData(prev => ({
      ...prev,
      historico_moradia: [...prev.historico_moradia, { periodo: '', endereco: { cidade: '', estado: '' } }]
    }));
  };

  const removeHistorico = (index: number) => {
    setFormData(prev => ({
      ...prev,
      historico_moradia: prev.historico_moradia.filter((_, i) => i !== index)
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasConsented) {
      setConsentModalOpen(true);
      return;
    }

    let guestPassword: string;
    try {
      guestPassword = createGuestPassword();
    } catch (passwordError: any) {
      setError(passwordError.message || 'Não foi possível criar uma credencial segura para visitante.');
      return;
    }

    const registrationData: UserRegistrationData = {
      ...formData,
      password: guestPassword,
      historico_moradia: normalizeHousingHistory(formData.historico_moradia),
    };

    const validationMessage = validateRegistrationData(registrationData, { requirePassword: false });
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setValidationError({ email: '' });
    setIsLoading(true);

    try {
      await register(registrationData);
      await login(registrationData.email, registrationData.password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha no cadastro. Verifique os dados.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Modal open={consentModalOpen} onClose={() => {}}>
        <ConsentScreen onAccept={handleAcceptConsent} onDecline={handleDeclineConsent} />
      </Modal>
        <Card sx={{ 
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            backdropFilter: 'blur(4px)',
            borderRadius: '10px',
        }}>
            <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
                        <HowToRegOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">Entrar como Visitante</Typography>
                </Box>
                <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
                <Box component="form" onSubmit={(e) => { e.preventDefault(); if (activeStep === steps.length - 1) handleSubmit(e); else setActiveStep(prev => prev + 1); }} sx={{ mt: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {activeStep === 0 && (
                  <>
                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Dados Pessoais</Typography>
                <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
                    <Box display="flex" alignItems="center" mb={2}>
                        <PersonOutlineOutlinedIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="subtitle1" fontWeight="bold">Informações Básicas</Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField required fullWidth label="Nome Completo" name="nome_completo" value={formData.nome_completo} onChange={handleChange} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField 
                            required 
                            fullWidth 
                            label="Email" 
                            name="email" 
                            type="email" 
                            value={formData.email} 
                            onChange={handleChange}
                            error={!!validationError.email}
                            helperText={validationError.email}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                          <DatePicker
                            label="Data de Nascimento *"
                            value={formData.data_nascimento ? dayjs(formData.data_nascimento) : null}
                            onChange={(newValue) => {
                              setFormData(prev => ({
                                ...prev,
                                data_nascimento: newValue ? newValue.format('YYYY-MM-DD') : ''
                              }));
                            }}
                            format="DD/MM/YYYY"
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                required: true,
                              }
                            }}
                          />
                        </LocalizationProvider>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                          <InputLabel>Gênero</InputLabel>
                          <Select name="genero" value={formData.genero} onChange={(e) => handleChange(e as any)}>
                            <MenuItem value="Masculino">Masculino</MenuItem>
                            <MenuItem value="Feminino">Feminino</MenuItem>
                            <MenuItem value="Outro">Outro</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl fullWidth required>
                          <InputLabel>Idioma principal</InputLabel>
                          <Select
                            name="language"
                            label="Idioma principal"
                            value={formData.language}
                            onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                          >
                            <MenuItem value="pt-BR">Português (Brasil)</MenuItem>
                            <MenuItem value="en">Inglês</MenuItem>
                            <MenuItem value="es">Espanhol</MenuItem>
                            <MenuItem value="other">Outro</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                </Box>
                </>
                )}

                {activeStep === 1 && (
                  <>
                <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Localização Atual</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Box display="flex" alignItems="center" mb={1}>
                            <ChildCareOutlinedIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="subtitle1" fontWeight="bold">Cidade de Nascimento</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Informe aqui o estado e a cidade onde você nasceu. Essa informação é fundamental para identificarmos a origem do seu sotaque.
                        </Typography>
                        <BrazilLocationFields
                          required
                          value={formData.cidade_nascimento}
                          onChange={(address) => setFormData(prev => ({ ...prev, cidade_nascimento: address }))}
                        />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Box display="flex" alignItems="center" mb={1}>
                            <HomeOutlinedIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="subtitle1" fontWeight="bold">Cidade Atual</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Informe o local onde você reside atualmente.
                        </Typography>
                        <BrazilLocationFields
                          required
                          value={formData.cidade_atual}
                          onChange={(address) => setFormData(prev => ({ ...prev, cidade_atual: address }))}
                        />
                    </Box>
                  </Grid>
                </Grid>
                </>
                )}

                {activeStep === 2 && (
                  <>
                <Box display="flex" flexDirection="column" mt={4} mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center">
                            <HistoryOutlinedIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h6">Histórico de Moradia</Typography>
                        </Box>
                        <Button startIcon={<AddCircleOutlineIcon />} onClick={addHistorico} variant="outlined" size="small">Adicionar Local</Button>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Por favor, adicione os locais onde você já morou e informe por quanto tempo residiu em cada um. Isso nos ajuda a entender melhor a formação do seu sotaque.
                    </Typography>
                </Box>
                {formData.historico_moradia.map((item, index) => {
                  const periodos = ["Menos de 1 ano", ...Array.from({ length: 100 }, (_, i) => `${i + 1} ano${i === 0 ? '' : 's'}`), "Mais de 100 anos"];
                  return (
                    <Box key={index} sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
                      <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={4}>
                              <FormControl fullWidth>
                                  <InputLabel>Tempo de residência</InputLabel>
                                  <Select
                                      value={item.periodo}
                                      onChange={(e) => handleHistoricoChange(index, 'periodo', e.target.value)}
                                  >
                                      {periodos.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                                  </Select>
                              </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                              <BrazilLocationFields
                                value={item.endereco}
                                onChange={(address) => {
                                  setFormData(prev => {
                                    const newHistorico = [...prev.historico_moradia];
                                    newHistorico[index] = { ...newHistorico[index], endereco: address };
                                    return { ...prev, historico_moradia: newHistorico };
                                  });
                                }}
                              />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                              <IconButton color="error" onClick={() => removeHistorico(index)}>
                                  <RemoveCircleOutlineIcon />
                              </IconButton>
                          </Grid>
                      </Grid>
                    </Box>
                  );
                })}
                </>
                )}


                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={activeStep === 0 || isLoading}
                    onClick={() => setActiveStep((prev) => prev - 1)}
                    sx={{ mr: 1 }}
                  >
                    Voltar
                  </Button>
                  
                  <Button type="submit" variant="contained" disabled={isLoading || !!validationError.email || !hasConsented}>
                      {activeStep === steps.length - 1 ? (isLoading ? 'Entrando...' : 'Entrar como Visitante') : 'Próximo'}
                  </Button>
                </Box>
                
                <Grid container justifyContent="center" sx={{mt: 3}}>
                    <Grid item>
                        <MuiLink component={Link} to="/login" variant="body2">
                        {"Já tem uma conta? Faça Login"}
                        </MuiLink>
                    </Grid>
                </Grid>
                <Grid container justifyContent="center" sx={{mt: 2}}>
                    <Grid item>
                        <Button component={Link} to="/" variant="outlined" color="error">
                            Voltar para a Home
                        </Button>
                    </Grid>
                </Grid>
                </Box>
            </CardContent>
        </Card>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 5 }}>
            {'Copyright © '}
            <MuiLink color="inherit" href="#">
            Dataset Speech
            </MuiLink>{' '}
            {new Date().getFullYear()}
            {'.'}
        </Typography>
    </Container>
  );
};

export default GuestRegisterPage;
