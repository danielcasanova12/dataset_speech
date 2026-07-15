import React, { useState } from 'react';
import { 
  Button, 
  Typography, 
  Box, 
  Paper, 
  Checkbox, 
  FormControlLabel, 
  Link as MuiLink,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fade
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PanToolIcon from '@mui/icons-material/PanTool';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';


interface ConsentScreenProps {
  onAccept: () => void;
  onDecline: () => void;
}

const ConsentScreen: React.FC<ConsentScreenProps> = ({ onAccept, onDecline }) => {
  const [isChecked, setIsChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAccept = async () => {
    try {
      setErrorMsg(null);
      const savedMicId = localStorage.getItem('selectedMicId');
      const audioConstraints = savedMicId ? { deviceId: { exact: savedMicId } } : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      // Liberar o microfone imediatamente, pois só queríamos a permissão
      stream.getTracks().forEach(track => track.stop());
      onAccept();
    } catch (err) {
      setErrorMsg('É necessário permitir o acesso ao microfone para participar da pesquisa.');
    }
  };

  return (
    <>
      <Fade in={true} timeout={500}>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1500,
          }}
        >
          <Paper elevation={12} sx={{ p: 4, maxWidth: '600px', borderRadius: 4, m: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
              Antes de começar
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
              Precisamos da sua autorização para gravar sua voz e usar os dados na pesquisa.
            </Typography>

            <List dense>
              <ListItem>
                <ListItemIcon><ScienceIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Uso das gravações" secondary="As gravações serão usadas apenas para pesquisa de voz." />
              </ListItem>
              <ListItem>
                <ListItemIcon><VerifiedUserIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Privacidade" secondary="Seus dados serão tratados com segurança e anonimizados quando possível." />
              </ListItem>
              <ListItem>
                <ListItemIcon><PanToolIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Participação voluntária" secondary="Você decide se quer participar." />
              </ListItem>
              <ListItem>
                <ListItemIcon><ExitToAppIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Você pode parar" secondary="É possível desistir a qualquer momento." />
              </ListItem>
              <ListItem>
                <ListItemIcon><DeleteForeverIcon color="primary" /></ListItemIcon>
                <ListItemText primary="Exclusão dos dados" secondary="Você pode pedir a remoção dos seus dados." />
              </ListItem>
            </List>

            <Box sx={{ my: 3, textAlign: 'center' }}>
              <MuiLink 
                href="https://docs.google.com/spreadsheets/d/1TX4xnJihzPAXSkkhUZUm3DkDtxG6rNguevdhu7EOPs8/edit?gid=0#gid=0" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Mais informações sobre o uso dos dados
              </MuiLink>
            </Box>

            <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.default', borderRadius: 2 }}>
              <FormControlLabel
                control={<Checkbox checked={isChecked} onChange={(e) => setIsChecked(e.target.checked)} />}
                label="Li e concordo em participar da pesquisa de voz."
              />
            </Box>

            {errorMsg && (
              <Box sx={{ mt: 2, textAlign: 'center', p: 2, backgroundColor: 'rgba(211, 47, 47, 0.1)', borderRadius: 2 }}>
                <Typography color="error" variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {errorMsg}
                </Typography>
                <Button variant="outlined" color="primary" onClick={handleAccept} sx={{ mt: 1, mb: 1 }}>
                  Permitir Microfone Novamente
                </Button>
                <Typography variant="caption" color="text.secondary" display="block">
                  Se não abrir, clique no cadeado da barra do navegador e permita o microfone.
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Button variant="outlined" color="secondary" onClick={onDecline} sx={{ flex: 1 }}>
                Sair
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleAccept} 
                disabled={!isChecked}
                sx={{ flex: 1 }}
              >
                Concordo e continuar
              </Button>
            </Box>
          </Paper>
        </Box>
      </Fade>
    </>
  );


};

export default ConsentScreen;
