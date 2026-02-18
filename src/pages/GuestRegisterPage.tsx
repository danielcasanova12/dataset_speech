import React, { useState, useEffect } from 'react';
import { Container, Typography, TextField, Button, Box, Link as MuiLink, Alert, Grid, IconButton, Card, CardContent, Avatar, Select, MenuItem, FormControl, InputLabel, Paper, Modal } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRegistrationData } from '../services/api';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import ConsentScreen from '../components/ConsentScreen';

interface IBGEUFResponse {
  id: number;
  sigla: string;
  nome: string;
}

interface IBGECidadeResponse {
  id: number;
  nome: string;
}

const GuestRegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<UserRegistrationData>({
    email: '',
    password: 'DEFAULT_GUEST_PASSWORD', // Hardcoded password for guest users
    nome_completo: '',
    data_nascimento: '',
    genero: '',
    language: '',
    cidade_nascimento: { cidade: '', estado: '' },
    cidade_atual: { cidade: '', estado: '' },
    historico_moradia: [{ periodo: '', endereco: { cidade: '', estado: '' } }],
    familiares: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [estados, setEstados] = useState<IBGEUFResponse[]>([]);
  const [cidadesNascimento, setCidadesNascimento] = useState<IBGECidadeResponse[]>([]);
  const [cidadesAtual, setCidadesAtual] = useState<IBGECidadeResponse[]>([]);
  const [cidadesHistorico, setCidadesHistorico] = useState<{ [key: number]: IBGECidadeResponse[] }>({});
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [validationError, setValidationError] = useState({ email: '' });
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados')
      .then(response => response.json())
      .then(data => setEstados(data.sort((a: IBGEUFResponse, b: IBGEUFResponse) => a.nome.localeCompare(b.nome))));

    
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

  const fetchCidades = (estado: string, setCidades: React.Dispatch<React.SetStateAction<IBGECidadeResponse[]>>) => {
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`)
      .then(response => response.json())
      .then(data => setCidades(data));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (parent: 'cidade_nascimento' | 'cidade_atual', field: 'cidade' | 'estado', value: string) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const handleHistoricoChange = (index: number, field: string, value: string, subField?: string) => {
    const newHistorico = [...formData.historico_moradia];
    if (subField) {
        newHistorico[index].endereco = { ...newHistorico[index].endereco, [subField]: value };
    } else {
        (newHistorico[index] as any)[field] = value;
    }
    setFormData(prev => ({ ...prev, historico_moradia: newHistorico }));
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setValidationError({ email: 'Formato de e-mail inválido.' });
      return;
    } else {
      setValidationError({ email: '' });
    }

    setIsLoading(true);
    
    const registrationData: UserRegistrationData = {
      ...formData,
      historico_moradia: formData.historico_moradia.length === 1 && !formData.historico_moradia[0].periodo 
        ? [] 
        : formData.historico_moradia,
    };

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
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Dados Pessoais</Typography>
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
                    <TextField required fullWidth label="Data de Nascimento" name="data_nascimento" type="date" InputLabelProps={{ shrink: true }} value={formData.data_nascimento} onChange={handleChange} />
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
                </Grid>

                <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Localização</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, border: '1px solid #ddd' }}>
                        <Typography variant="subtitle1" gutterBottom>Cidade de Nascimento</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Estado</InputLabel>
                                    <Select
                                        value={formData.cidade_nascimento.estado}
                                        onChange={(e) => {
                                            handleNestedChange('cidade_nascimento', 'estado', e.target.value);
                                            fetchCidades(e.target.value, setCidadesNascimento);
                                        }}
                                    >
                                        {estados.map(estado => (
                                            <MenuItem key={estado.id} value={estado.sigla}>{estado.nome}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth disabled={!formData.cidade_nascimento.estado}>
                                    <InputLabel>Cidade</InputLabel>
                                    <Select
                                        value={formData.cidade_nascimento.cidade}
                                        onChange={(e) => handleNestedChange('cidade_nascimento', 'cidade', e.target.value)}
                                    >
                                        {cidadesNascimento.map(cidade => (
                                            <MenuItem key={cidade.id} value={cidade.nome}>{cidade.nome}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, border: '1px solid #ddd' }}>
                        <Typography variant="subtitle1" gutterBottom>Cidade Atual</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Estado</InputLabel>
                                    <Select
                                        value={formData.cidade_atual.estado}
                                        onChange={(e) => {
                                            handleNestedChange('cidade_atual', 'estado', e.target.value);
                                            fetchCidades(e.target.value, setCidadesAtual);
                                        }}
                                    >
                                        {estados.map(estado => (
                                            <MenuItem key={estado.id} value={estado.sigla}>{estado.nome}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth disabled={!formData.cidade_atual.estado}>
                                    <InputLabel>Cidade</InputLabel>
                                    <Select
                                        value={formData.cidade_atual.cidade}
                                        onChange={(e) => handleNestedChange('cidade_atual', 'cidade', e.target.value)}
                                    >
                                        {cidadesAtual.map(cidade => (
                                            <MenuItem key={cidade.id} value={cidade.nome}>{cidade.nome}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Paper>
                  </Grid>
                </Grid>

                <Box display="flex" justifyContent="space-between" alignItems="center" mt={4} mb={2}>
                    <Typography variant="h6">Histórico de Moradia</Typography>
                    <Button startIcon={<AddCircleOutlineIcon />} onClick={addHistorico}>Adicionar</Button>
                </Box>
                {formData.historico_moradia.map((item, index) => {
                  const periodos = ["0-5 anos", "6-10 anos", "11-15 anos", "16-20 anos", "21-25 anos", "26-30 anos", "31-35 anos", "36-40 anos", "41-45 anos", "46-50 anos", "51-55 anos", "56-60 anos", "61-65 anos", "66-70 anos", "71-75 anos", "76-80 anos", "81-85 anos", "86-90 anos", "91-95 anos", "96-100 anos", "Mais de 100 anos"];
                  return (
                    <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #444', borderRadius: 1 }}>
                      <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={4}>
                              <FormControl fullWidth>
                                  <InputLabel>Período</InputLabel>
                                  <Select
                                      value={item.periodo}
                                      onChange={(e) => handleHistoricoChange(index, 'periodo', e.target.value)}
                                  >
                                      {periodos.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                                  </Select>
                              </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                              <FormControl fullWidth>
                                  <InputLabel>Estado</InputLabel>
                                  <Select
                                      value={item.endereco.estado}
                                      onChange={(e) => {
                                          handleHistoricoChange(index, 'endereco', e.target.value, 'estado');
                                          fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${e.target.value}/municipios`)
                                              .then(response => response.json())
                                              .then(data => setCidadesHistorico(prev => ({ ...prev, [index]: data })));
                                      }}
                                  >
                                      {estados.map(estado => <MenuItem key={estado.id} value={estado.sigla}>{estado.nome}</MenuItem>)}
                                  </Select>
                              </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                              <FormControl fullWidth disabled={!item.endereco.estado}>
                                  <InputLabel>Cidade</InputLabel>
                                  <Select
                                      value={item.endereco.cidade}
                                      onChange={(e) => handleHistoricoChange(index, 'endereco', e.target.value, 'cidade')}
                                  >
                                      {(cidadesHistorico[index] || []).map(cidade => (
                                          <MenuItem key={cidade.id} value={cidade.nome}>{cidade.nome}</MenuItem>
                                      ))}
                                  </Select>
                              </FormControl>
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


                <Button type="submit" fullWidth variant="contained" size="large" disabled={isLoading || !!validationError.email || !hasConsented} sx={{ mt: 4 }}>
                    {isLoading ? 'Entrando...' : 'Entrar como Visitante'}
                </Button>
                <Grid container justifyContent="flex-end" sx={{mt: 2}}>
                    <Grid item>
                        <MuiLink component={Link} to="/login" variant="body2">
                        {"Já tem uma conta? Faça Login"}
                        </MuiLink>
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