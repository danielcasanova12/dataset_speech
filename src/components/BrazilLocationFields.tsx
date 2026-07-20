import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import {
  BrazilianCity,
  BrazilianState,
  listBrazilianStates,
  listCitiesByState,
} from '../services/ibge';

export interface BrazilianAddress {
  estado?: string;
  cidade?: string;
}

interface BrazilLocationFieldsProps {
  value: BrazilianAddress;
  onChange: (value: BrazilianAddress) => void;
  required?: boolean;
  disabled?: boolean;
}

const BrazilLocationFields: React.FC<BrazilLocationFieldsProps> = ({
  value,
  onChange,
  required = false,
  disabled = false,
}) => {
  const id = useId();
  const stateLabelId = `${id}-state-label`;
  const cityLabelId = `${id}-city-label`;
  const cityRequestId = useRef(0);
  const [states, setStates] = useState<BrazilianState[]>([]);
  const [cities, setCities] = useState<BrazilianCity[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [statesError, setStatesError] = useState<string | null>(null);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  const loadStates = useCallback(async (forceReload = false) => {
    setStatesLoading(true);
    setStatesError(null);
    try {
      const result = await listBrazilianStates(forceReload);
      setStates(result);
    } catch {
      setStatesError('Não foi possível carregar os estados. Verifique sua conexão e tente novamente.');
    } finally {
      setStatesLoading(false);
    }
  }, []);

  const loadCities = useCallback(async (stateCode: string, forceReload = false) => {
    const requestId = ++cityRequestId.current;
    if (!stateCode) {
      setCities([]);
      setCitiesError(null);
      return;
    }

    setCitiesLoading(true);
    setCitiesError(null);
    try {
      const result = await listCitiesByState(stateCode, forceReload);
      if (requestId !== cityRequestId.current) return;
      setCities(result);
    } catch {
      if (requestId !== cityRequestId.current) return;
      setCities([]);
      setCitiesError('Não foi possível carregar as cidades. Tente novamente.');
    } finally {
      if (requestId === cityRequestId.current) {
        setCitiesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadStates();
  }, [loadStates]);

  useEffect(() => {
    void loadCities(value.estado || '');
  }, [loadCities, value.estado]);

  const stateDisabled = disabled || statesLoading;
  const cityDisabled = disabled || !value.estado || citiesLoading || !!citiesError;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <Box>
        <FormControl fullWidth required={required} error={!!statesError} disabled={stateDisabled}>
          <InputLabel id={stateLabelId}>Estado</InputLabel>
          <Select
            labelId={stateLabelId}
            label="Estado"
            required={required}
            value={value.estado || ''}
            onChange={(event) => onChange({ estado: event.target.value, cidade: '' })}
            endAdornment={statesLoading ? <CircularProgress size={18} sx={{ mr: 4 }} /> : undefined}
          >
            <MenuItem value="" disabled>Selecione um estado</MenuItem>
            {states.map(state => (
              <MenuItem key={state.id} value={state.sigla}>{state.nome} ({state.sigla})</MenuItem>
            ))}
          </Select>
          {statesError && <FormHelperText>{statesError}</FormHelperText>}
        </FormControl>
        {statesError && (
          <Button size="small" onClick={() => void loadStates(true)} sx={{ mt: 0.5 }}>
            Tentar novamente
          </Button>
        )}
      </Box>

      <Box>
        <FormControl fullWidth required={required} error={!!citiesError} disabled={cityDisabled}>
          <InputLabel id={cityLabelId}>Cidade</InputLabel>
          <Select
            labelId={cityLabelId}
            label="Cidade"
            required={required}
            value={value.cidade || ''}
            onChange={(event) => onChange({ ...value, cidade: event.target.value })}
            endAdornment={citiesLoading ? <CircularProgress size={18} sx={{ mr: 4 }} /> : undefined}
          >
            <MenuItem value="" disabled>
              {value.estado ? 'Selecione uma cidade' : 'Selecione primeiro o estado'}
            </MenuItem>
            {cities.map(city => (
              <MenuItem key={city.id} value={city.nome}>{city.nome}</MenuItem>
            ))}
          </Select>
          {citiesError && <FormHelperText>{citiesError}</FormHelperText>}
        </FormControl>
        {citiesError && value.estado && (
          <Button size="small" onClick={() => void loadCities(value.estado!, true)} sx={{ mt: 0.5 }}>
            Tentar novamente
          </Button>
        )}
      </Box>

      {(statesLoading || citiesLoading) && (
        <Alert severity="info" sx={{ gridColumn: '1 / -1' }}>
          {statesLoading ? 'Carregando estados...' : 'Carregando cidades...'}
        </Alert>
      )}
    </Box>
  );
};

export default BrazilLocationFields;
