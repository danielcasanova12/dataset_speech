import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Typography, Container, Box } from '@mui/material';

const HomePage: React.FC = () => {
  return (
    <Container>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        textAlign="center"
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Bem-vindo ao App de Gravação de Áudio
        </Typography>
        <Typography variant="h5" component="h2" color="textSecondary" paragraph>
          Sua jornada para um áudio perfeito começa aqui.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          component={Link}
          to="/record"
          size="large"
        >
          Iniciar Gravação
        </Button>
      </Box>
    </Container>
  );
};

export default HomePage;
