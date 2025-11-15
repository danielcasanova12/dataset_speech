import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Typography, Container, Box, CircularProgress, Grid } from '@mui/material';

const HomePage: React.FC = () => {
  const [datasets, setDatasets] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/phrases.csv`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        const lines = csvText.trim().split('\n');
        const header = lines[0].split(',').map(h => h.trim());
        const datasetidIndex = header.indexOf('datasetid');

        if (datasetidIndex === -1) {
            throw new Error("'datasetid' column not found in phrases.csv");
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
                  Dataset {datasetId}
                </Button>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default HomePage;
