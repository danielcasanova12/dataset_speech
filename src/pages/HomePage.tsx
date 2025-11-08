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
        Voice singing dataset
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
