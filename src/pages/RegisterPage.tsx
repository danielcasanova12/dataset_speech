import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  MenuItem,
} from '@mui/material';

// This is a simplified registration page.
// The complex fields 'historico_moradia' and 'familiares' are omitted for now.
// You can add them as needed.

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nome_completo: '',
    data_nascimento: '', // Format: YYYY-MM-DD
    genero: '',
    cidade_nascimento_cidade: '',
    cidade_nascimento_estado: '',
    cidade_atual_cidade: '',
    cidade_atual_estado: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      email: formData.email,
      password: formData.password,
      nome_completo: formData.nome_completo,
      data_nascimento: formData.data_nascimento,
      genero: formData.genero,
      cidade_nascimento: {
        cidade: formData.cidade_nascimento_cidade,
        estado: formData.cidade_nascimento_estado,
      },
      cidade_atual: {
        cidade: formData.cidade_atual_cidade,
        estado: formData.cidade_atual_estado,
      },
      // historico_moradia and familiares are complex and omitted for this example
      historico_moradia: [], 
      familiares: [],
    };

    try {
      await registerUser(payload);
      // On success, redirect to login page to let the user log in
      navigate('/login');
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'An unknown error occurred.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Register
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="nome_completo"
                label="Full Name"
                name="nome_completo"
                value={formData.nome_completo}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                name="data_nascimento"
                label="Date of Birth"
                type="date"
                id="data_nascimento"
                InputLabelProps={{ shrink: true }}
                value={formData.data_nascimento}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                required
                fullWidth
                name="genero"
                label="Gender"
                id="genero"
                value={formData.genero}
                onChange={handleChange}
              >
                <MenuItem value="Masculino">Masculino</MenuItem>
                <MenuItem value="Feminino">Feminino</MenuItem>
                <MenuItem value="Outro">Outro</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}><Typography variant="subtitle1">Birth City</Typography></Grid>
            <Grid item xs={12} sm={8}>
              <TextField required fullWidth name="cidade_nascimento_cidade" label="City" value={formData.cidade_nascimento_cidade} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField required fullWidth name="cidade_nascimento_estado" label="State" value={formData.cidade_nascimento_estado} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}><Typography variant="subtitle1">Current City</Typography></Grid>
            <Grid item xs={12} sm={8}>
              <TextField required fullWidth name="cidade_atual_cidade" label="City" value={formData.cidade_atual_cidade} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField required fullWidth name="cidade_atual_estado" label="State" value={formData.cidade_atual_estado} onChange={handleChange} />
            </Grid>
          </Grid>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Register'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default RegisterPage;