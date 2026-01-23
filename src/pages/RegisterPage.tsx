import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Link as MuiLink, Alert, Grid, Paper, IconButton } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRegistrationData, HistoricoMoradia, Familiar } from '../services/api';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<UserRegistrationData>({
    email: '',
    password: '',
    nome_completo: '',
    data_nascimento: '',
    genero: '',
    cidade_nascimento: { cidade: '', estado: '' },
    cidade_atual: { cidade: '', estado: '' },
    historico_moradia: [{ periodo: '', endereco: { cidade: '', estado: '' } }],
    familiares: [{ nome: '', grau_parentesco: '', endereco: { cidade: '', estado: '' } }]
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

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
      newHistorico[index] = {
        ...newHistorico[index],
        endereco: { ...newHistorico[index].endereco, [subField]: value }
      };
    } else {
      newHistorico[index] = { ...newHistorico[index], [field]: value };
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

  const handleFamiliarChange = (index: number, field: string, value: string, subField?: string) => {
    const newFamiliares = [...formData.familiares];
    if (subField) {
      newFamiliares[index] = {
        ...newFamiliares[index],
        endereco: { ...newFamiliares[index].endereco, [subField]: value }
      };
    } else {
      newFamiliares[index] = { ...newFamiliares[index], [field]: value };
    }
    setFormData(prev => ({ ...prev, familiares: newFamiliares }));
  };

  const addFamiliar = () => {
    setFormData(prev => ({
      ...prev,
      familiares: [...prev.familiares, { nome: '', grau_parentesco: '', endereco: { cidade: '', estado: '' } }]
    }));
  };

  const removeFamiliar = (index: number) => {
    setFormData(prev => ({
      ...prev,
      familiares: prev.familiares.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await register(formData);
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Falha no cadastro. Verifique os dados.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">Cadastro</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, width: '100%' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Dados Pessoais</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField required fullWidth label="Nome Completo" name="nome_completo" value={formData.nome_completo} onChange={handleChange} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField required fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField required fullWidth label="Senha" name="password" type="password" value={formData.password} onChange={handleChange} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField required fullWidth label="Data de Nascimento" name="data_nascimento" type="date" InputLabelProps={{ shrink: true }} value={formData.data_nascimento} onChange={handleChange} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                 <TextField required fullWidth label="Gênero" name="genero" value={formData.genero} onChange={handleChange} />
              </Grid>
            </Grid>
          </Paper>

          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Localização</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle1">Cidade de Nascimento</Typography>
                <TextField required fullWidth label="Cidade" margin="dense" value={formData.cidade_nascimento.cidade} onChange={(e) => handleNestedChange('cidade_nascimento', 'cidade', e.target.value)} />
                <TextField required fullWidth label="Estado" margin="dense" value={formData.cidade_nascimento.estado} onChange={(e) => handleNestedChange('cidade_nascimento', 'estado', e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle1">Cidade Atual</Typography>
                <TextField required fullWidth label="Cidade" margin="dense" value={formData.cidade_atual.cidade} onChange={(e) => handleNestedChange('cidade_atual', 'cidade', e.target.value)} />
                <TextField required fullWidth label="Estado" margin="dense" value={formData.cidade_atual.estado} onChange={(e) => handleNestedChange('cidade_atual', 'estado', e.target.value)} />
              </Grid>
            </Grid>
          </Paper>

          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Histórico de Moradia</Typography>
                <Button startIcon={<AddCircleOutlineIcon />} onClick={addHistorico}>Adicionar</Button>
            </Box>
            {formData.historico_moradia.map((item, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #444', borderRadius: 1 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Período (ex: 0-12 anos)" value={item.periodo} onChange={(e) => handleHistoricoChange(index, 'periodo', e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField fullWidth label="Cidade" value={item.endereco.cidade} onChange={(e) => handleHistoricoChange(index, 'cidade', e.target.value, 'cidade')} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Estado" value={item.endereco.estado} onChange={(e) => handleHistoricoChange(index, 'estado', e.target.value, 'estado')} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                         <IconButton color="error" onClick={() => removeHistorico(index)} disabled={formData.historico_moradia.length === 1}>
                             <RemoveCircleOutlineIcon />
                         </IconButton>
                    </Grid>
                </Grid>
              </Box>
            ))}
          </Paper>

          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Familiares</Typography>
                <Button startIcon={<AddCircleOutlineIcon />} onClick={addFamiliar}>Adicionar</Button>
            </Box>
            {formData.familiares.map((item, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #444', borderRadius: 1 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Nome" value={item.nome} onChange={(e) => handleFamiliarChange(index, 'nome', e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Parentesco" value={item.grau_parentesco} onChange={(e) => handleFamiliarChange(index, 'grau_parentesco', e.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 3 }}>
                        <TextField fullWidth label="Cidade" value={item.endereco.cidade} onChange={(e) => handleFamiliarChange(index, 'cidade', e.target.value, 'cidade')} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 2 }}>
                        <TextField fullWidth label="Estado" value={item.endereco.estado} onChange={(e) => handleFamiliarChange(index, 'estado', e.target.value, 'estado')} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 1 }}>
                         <IconButton color="error" onClick={() => removeFamiliar(index)} disabled={formData.familiares.length === 1}>
                             <RemoveCircleOutlineIcon />
                         </IconButton>
                    </Grid>
                </Grid>
              </Box>
            ))}
          </Paper>

          <Button type="submit" fullWidth variant="contained" size="large" disabled={isLoading}>
            {isLoading ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
           <Box display="flex" justifyContent="center" mt={2}>
            <MuiLink component={Link} to="/login" variant="body2">
              {"Já tem uma conta? Faça Login"}
            </MuiLink>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default RegisterPage;
