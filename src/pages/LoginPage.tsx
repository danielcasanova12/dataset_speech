import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Link as MuiLink, Alert, Card, CardContent, Avatar, Grid } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha no login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Card sx={{ 
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        backdropFilter: 'blur(4px)',
        borderRadius: '10px',
      }}>
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Login
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Endereço de Email"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Senha"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
              <Grid container justifyContent="space-between">
                <Grid item>
                  <MuiLink component={Link} to="/forgot-password" variant="body2" color="text.secondary">
                    Esqueceu sua senha?
                  </MuiLink>
                </Grid>
                <Grid item>
                  <MuiLink component={Link} to="/register" variant="body2" color="text.secondary">
                    {"Não tem uma conta? Cadastre-se"}
                  </MuiLink>
                </Grid>
                 <Grid item>
                  <MuiLink component={Link} to="/guest-register" variant="body2" color="text.secondary">
                    {"Entrar como visitante"}
                  </MuiLink>
                </Grid>
              </Grid>
            </Box>
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

export default LoginPage;