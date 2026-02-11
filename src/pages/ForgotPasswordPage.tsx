import React, { useState } from 'react';
import { Container, Typography, Box, TextField, Button, Alert, Card, CardContent, Avatar, Link as MuiLink } from '@mui/material';
import { api } from '../services/api';
import MailOutlineIcon from '@mui/icons-material/MailOutline';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      await api.forgotPassword(email);
      setMessage('Se um e-mail com este endereço existir, um link de redefinição de senha foi enviado.');
    } catch (err: any) {
      setError('Falha ao enviar o e-mail de redefinição de senha.');
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
              <MailOutlineIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Esqueceu sua Senha?
            </Typography>
            <Typography variant="body2" sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
              Sem problemas! Digite seu e-mail abaixo para receber um link de redefinição.
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
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
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar Link'}
              </Button>
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

export default ForgotPasswordPage;
