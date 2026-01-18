import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, Grid } from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 450 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 4,
  outline: 'none',
};

export interface UserInfo {
  gender: string;
  age: string;
  region: string;
}

interface UserInfoFormProps {
  open: boolean;
  onSubmit: (data: UserInfo) => void;
  onClose: () => void;
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({ open, onSubmit, onClose }) => {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    gender: '',
    age: '',
    region: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setUserInfo(prev => ({ ...prev, [name as string]: value as string }));
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setUserInfo(prev => ({ ...prev, [name as string]: value as string }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInfo.gender && userInfo.age && userInfo.region) {
      onSubmit(userInfo);
    } else {
      alert('Por favor, preencha todos os campos.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="user-info-title">
      <Box sx={modalStyle}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
          <AccountCircle sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography id="user-info-title" variant="h5" component="h2">
            Informações
          </Typography>
        </Box>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth required>
              <InputLabel id="gender-label">Gênero</InputLabel>
              <Select
                labelId="gender-label"
                id="gender"
                name="gender"
                value={userInfo.gender}
                label="Gênero"
                onChange={handleSelectChange}
              >
                <MenuItem value="masculino">Masculino</MenuItem>
                <MenuItem value="feminino">Feminino</MenuItem>
                <MenuItem value="outro">Outro</MenuItem>
                <MenuItem value="nao-informar">Prefiro não informar</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              required
              id="age"
              name="age"
              label="Idade"
              type="number"
              value={userInfo.age}
              onChange={handleChange}
              inputProps={{ min: "1", max: "120" }}
            />

            <TextField
              fullWidth
              required
              id="region"
              name="region"
              label="Região / Estado (Ex: São Paulo, SP)"
              value={userInfo.region}
              onChange={handleChange}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button onClick={onClose} variant="outlined" color="secondary" size="large">
                Voltar
              </Button>
              <Button type="submit" variant="contained" color="primary" size="large">
                Continuar
              </Button>
            </Box>
          </Box>
        </form>
      </Box>
    </Modal>
  );
};

export default UserInfoForm;