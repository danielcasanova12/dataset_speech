import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Typography, Container, Box, CircularProgress, Grid } from '@mui/material';

const datasetNames: { [key: number]: string } = {
  1: "Dataset voz geral",
  2: "Dataset canto",
  3: "Dataset emoção",
};

const HomePage: React.FC = () => {
  const [datasets, setDatasets] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedProgress, setSavedProgress] = useState<{datasetId: string; currentPhraseIndex: number} | null>(null);
  const navigate = useNavigate();

  const testApi = async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
      const apiUser = process.env.REACT_APP_API_USER;
      const apiPassword = process.env.REACT_APP_API_PASSWORD;

      if (!apiBaseUrl || !apiUser || !apiPassword) {
        alert("API configuration is missing. Please check your .env file.");
        return;
      }

      const credentials = btoa(`${apiUser}:${apiPassword}`);
      const apiUrl = `${apiBaseUrl}/`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Accept": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        alert(`API test successful! Response: ${JSON.stringify(data)}`);
      } else {
        alert(`API test failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error("API test error:", error);
      alert("An error occurred during the API test. Check the console for details.");
    }
  };

  useEffect(() => {
    // Check for saved progress
    const savedProgressJSON = localStorage.getItem('recordingProgress');
    if (savedProgressJSON) {
      setSavedProgress(JSON.parse(savedProgressJSON));
    }

    const fetchDatasets = async () => {
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/phrases_leitura.csv`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        const lines = csvText.trim().split('\n');
        const header = lines[0].split(',').map(h => h.trim());
        const datasetidIndex = header.indexOf('datasetId');

        if (datasetidIndex === -1) {
            throw new Error("'datasetId' column not found in phrases_leitura.csv");
        }

        const datasetIds = lines.slice(1).map(line => {
          const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
          // Ensure value exists before parsing
          if (values && values[datasetidIndex]) {
            return parseInt(values[datasetidIndex], 10);
          }
          return null;
        }).filter((id): id is number => id !== null);

        const uniqueDatasets = Array.from(new Set(datasetIds)).sort((a, b) => a - b);
        setDatasets(uniqueDatasets);
      } catch (error) {
        console.error("Failed to load datasets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, []);

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
          Voice Singing Dataset
        </Typography>
        <Typography variant="h5" component="h2" sx={{ mb: 4 }}>
          Selecione o Dataset
        </Typography>
        {isLoading ? (
          <CircularProgress />
        ) : (
          <>
            {savedProgress && (
              <Box sx={{ mb: 4, p: 2, border: '1px dashed grey', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Você tem uma sessão em andamento.
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  onClick={() => navigate(`/recording/${savedProgress.datasetId}`)}
                >
                  Continuar de onde parou (Dataset {datasetNames[parseInt(savedProgress.datasetId, 10)] || savedProgress.datasetId})
                </Button>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Ou escolha um novo dataset abaixo para começar do zero (seu progresso anterior será perdido ao iniciar uma nova gravação).
                </Typography>
              </Box>
            )}
            <Grid container spacing={2} justifyContent="center">
              {datasets.map(datasetId => (
                <Grid key={datasetId}>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    to={`/recording/${datasetId}`}
                    size="large"
                  >
                    {datasetNames[datasetId] || `Dataset ${datasetId}`}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </>
        )}
        <Button variant="contained" color="secondary" onClick={testApi} sx={{ mt: 2 }}>
          Test API
        </Button>
      </Box>
    </Container>
  );
};

export default HomePage;

