  > 1221 |       <Modal open={finalizationStep === 'notes'} onClose={() => setFinalizationStep('idle')}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1222 |         <Box sx={modalStyle}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1223 |           <Typography variant="h6">Notas da Sessão</Typography>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1224 |           <TextField
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1225 |             label="Notas (opcional)"
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1226 |             multiline
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1227 |             rows={4}
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1228 |             value={sessionNotes}
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1229 |             onChange={(e) => setSessionNotes(e.target.value)}
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1230 |             fullWidth
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1231 |             sx={{ mt: 2 }}
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1232 |           />
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1233 |           <Button onClick={handleFinish} variant="contained" sx={{ mt: 2 }}>Finalizar</Button>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1234 |         </Box>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1235 |       </Modal>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1236 |
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 1237 |       <Modal open={openFinishModal}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1238 |         <Box sx={modalStyle}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1239 |           <Typography variant="h6">Sessão Finalizada!</Typography>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1240 |           <Button component={Link} to="/">Voltar para Home</Button>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1241 |         </Box>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1242 |       </Modal>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1243 |
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1244 |       <Modal open={finalizationStep === 'preRoomTone'}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1245 |         <Box sx={modalStyle}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1246 |           <Typography variant="h6">Gravação de Som Ambiente</Typography>     
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1247 |           <Typography sx={{ mt: 2 }}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1248 |             A gravação das frases foi concluída. Agora, vamos gravar 5 segundos de silêncio para capturar o som do seu ambiente.
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1249 |           </Typography>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1250 |           <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>    
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1251 |             <Button onClick={() => setFinalizationStep('roomTone')} variant="contained">
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1252 |               Iniciar Gravação de Som Ambiente
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 1253 |             </Button>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1254 |           </Box>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1255 |         </Box>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1256 |       </Modal>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1257 |
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1258 |       <Modal open={showBlockTutorialModal}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1259 |         <Box sx={modalStyle}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1260 |           <Typography variant="h6">{blockTutorialContent.title}</Typography> 
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1261 |           <Typography sx={{ mt: 2 }}>{blockTutorialContent.description}</Typography>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1262 |           <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>  
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1263 |             <Button onClick={handleTutorialModalClose} variant="contained">  
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1264 |               Entendi
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1265 |             </Button>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1266 |           </Box>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1267 |         </Box>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1268 |       </Modal>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 1269 |
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1270 |       <Modal open={showTimeoutModal}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1271 |         <Box sx={modalStyle}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1272 |           <Typography variant="h6">Tempo Limite Excedido</Typography>        
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1273 |           <Typography sx={{ mt: 2 }}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1274 |             Você demorou mais de 1 minuto nesta frase. O áudio será descartado por ser muito longo.
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1275 |             Por favor, tente gravar novamente.
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1276 |           </Typography>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1277 |           <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>    
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1278 |             <Button onClick={handleTimeoutModalClose} variant="contained" color="primary">
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1279 |               Entendi
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1280 |             </Button>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1281 |           </Box>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1282 |         </Box>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1283 |       </Modal>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1284 |
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1285 |       <Modal open={finalizationStep === 'roomTone'}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1286 |         <Box sx={modalStyle}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1287 |           <Typography variant="h6">Gravando som ambiente</Typography>        
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1288 |           <Typography sx={{ mt: 2 }}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1289 |             Por favor, permaneça em silêncio por {finalRoomToneCountdown} segundos.
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  > 1290 |           </Typography>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1291 |         </Box>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1292 |       </Modal>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1293 |       <Modal open={!!uploadError}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1294 |         <Box sx={modalStyle}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1295 |           <Typography variant="h6">Erro no Upload</Typography>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1296 |           <Typography sx={{ mt: 2 }}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1297 |             Ocorreu um erro ao enviar o áudio. Deseja tentar novamente?      
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1298 |           </Typography>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1299 |           <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' 
}}>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1300 |             <Button onClick={handleRetryUpload} variant="contained">Tentar Novamente</Button>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1301 |             <Button onClick={handleDiscardUpload} variant="outlined">Descartar</Button>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1302 |           </Box>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1303 |         </Box>
         | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        
  > 1304 |       </Modal>
         | ^^^^^^^^^^^^^^^
    1305 |     </Container>
    1306 |   );
    1307 | };

ERROR in src/pages/RecordingPage.tsx:1216:20
TS2304: Cannot find name 'countdown'.
    1214 |         </>
    1215 |       )}
  > 1216 |       <Modal open={countdown !== null}>
         |                    ^^^^^^^^^
    1217 |         <Box sx={{ ...modalStyle, width: 200, textAlign: 'center' }}>        
    1218 |           <Typography variant="h1">{countdown}</Typography>
    1219 |         </Box>

ERROR in src/pages/RecordingPage.tsx:1218:37
TS2304: Cannot find name 'countdown'.
    1216 |       <Modal open={countdown !== null}>
    1217 |         <Box sx={{ ...modalStyle, width: 200, textAlign: 'center' }}>        
  > 1218 |           <Typography variant="h1">{countdown}</Typography>
         |                                     ^^^^^^^^^
    1219 |         </Box>
    1220 |       </Modal>
    1221 |       <Modal open={finalizationStep === 'notes'} onClose={() => setFinalizationStep('idle')}>

ERROR in src/pages/RecordingPage.tsx:1221:20
TS2304: Cannot find name 'finalizationStep'.
    1219 |         </Box>
    1220 |       </Modal>
  > 1221 |       <Modal open={finalizationStep === 'notes'} onClose={() => setFinalizationStep('idle')}>
         |                    ^^^^^^^^^^^^^^^^
    1222 |         <Box sx={modalStyle}>
    1223 |           <Typography variant="h6">Notas da Sessão</Typography>
    1224 |           <TextField

ERROR in src/pages/RecordingPage.tsx:1221:65
TS2304: Cannot find name 'setFinalizationStep'.
    1219 |         </Box>
    1220 |       </Modal>
  > 1221 |       <Modal open={finalizationStep === 'notes'} onClose={() => setFinalizationStep('idle')}>
         |                                                                 ^^^^^^^^^^^^^^^^^^^
    1222 |         <Box sx={modalStyle}>
    1223 |           <Typography variant="h6">Notas da Sessão</Typography>
    1224 |           <TextField

ERROR in src/pages/RecordingPage.tsx:1228:20
TS2304: Cannot find name 'sessionNotes'.
    1226 |             multiline
    1227 |             rows={4}
  > 1228 |             value={sessionNotes}
         |                    ^^^^^^^^^^^^
    1229 |             onChange={(e) => setSessionNotes(e.target.value)}
    1230 |             fullWidth
    1231 |             sx={{ mt: 2 }}

ERROR in src/pages/RecordingPage.tsx:1229:30
TS2304: Cannot find name 'setSessionNotes'.
    1227 |             rows={4}
    1228 |             value={sessionNotes}
  > 1229 |             onChange={(e) => setSessionNotes(e.target.value)}
         |                              ^^^^^^^^^^^^^^^
    1230 |             fullWidth
    1231 |             sx={{ mt: 2 }}
    1232 |           />

ERROR in src/pages/RecordingPage.tsx:1233:28
TS2304: Cannot find name 'handleFinish'.
    1231 |             sx={{ mt: 2 }}
    1232 |           />
  > 1233 |           <Button onClick={handleFinish} variant="contained" sx={{ mt: 2 }}>Finalizar</Button>
         |                            ^^^^^^^^^^^^
    1234 |         </Box>
    1235 |       </Modal>
    1236 |

ERROR in src/pages/RecordingPage.tsx:1237:20
TS2304: Cannot find name 'openFinishModal'.
    1235 |       </Modal>
    1236 |
  > 1237 |       <Modal open={openFinishModal}>
         |                    ^^^^^^^^^^^^^^^
    1238 |         <Box sx={modalStyle}>
    1239 |           <Typography variant="h6">Sessão Finalizada!</Typography>
    1240 |           <Button component={Link} to="/">Voltar para Home</Button>

ERROR in src/pages/RecordingPage.tsx:1244:20
TS2304: Cannot find name 'finalizationStep'.
    1242 |       </Modal>
    1243 |
  > 1244 |       <Modal open={finalizationStep === 'preRoomTone'}>
         |                    ^^^^^^^^^^^^^^^^
    1245 |         <Box sx={modalStyle}>
    1246 |           <Typography variant="h6">Gravação de Som Ambiente</Typography>     
    1247 |           <Typography sx={{ mt: 2 }}>

ERROR in src/pages/RecordingPage.tsx:1251:36
TS2304: Cannot find name 'setFinalizationStep'.
    1249 |           </Typography>
    1250 |           <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>    
  > 1251 |             <Button onClick={() => setFinalizationStep('roomTone')} variant="contained">
         |                                    ^^^^^^^^^^^^^^^^^^^
    1252 |               Iniciar Gravação de Som Ambiente
    1253 |             </Button>
    1254 |           </Box>

ERROR in src/pages/RecordingPage.tsx:1258:20
TS2304: Cannot find name 'showBlockTutorialModal'.
    1256 |       </Modal>
    1257 |
  > 1258 |       <Modal open={showBlockTutorialModal}>
         |                    ^^^^^^^^^^^^^^^^^^^^^^
    1259 |         <Box sx={modalStyle}>
    1260 |           <Typography variant="h6">{blockTutorialContent.title}</Typography> 
    1261 |           <Typography sx={{ mt: 2 }}>{blockTutorialContent.description}</Typography>

ERROR in src/pages/RecordingPage.tsx:1260:37
TS2304: Cannot find name 'blockTutorialContent'.
    1258 |       <Modal open={showBlockTutorialModal}>
    1259 |         <Box sx={modalStyle}>
  > 1260 |           <Typography variant="h6">{blockTutorialContent.title}</Typography> 
         |                                     ^^^^^^^^^^^^^^^^^^^^
    1261 |           <Typography sx={{ mt: 2 }}>{blockTutorialContent.description}</Typography>
    1262 |           <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>  
    1263 |             <Button onClick={handleTutorialModalClose} variant="contained">  

ERROR in src/pages/RecordingPage.tsx:1261:39
TS2304: Cannot find name 'blockTutorialContent'.
    1259 |         <Box sx={modalStyle}>
    1260 |           <Typography variant="h6">{blockTutorialContent.title}</Typography> 
  > 1261 |           <Typography sx={{ mt: 2 }}>{blockTutorialContent.description}</Typography>
         |                                       ^^^^^^^^^^^^^^^^^^^^
    1262 |           <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>  
    1263 |             <Button onClick={handleTutorialModalClose} variant="contained">  
    1264 |               Entendi

ERROR in src/pages/RecordingPage.tsx:1263:30
TS2304: Cannot find name 'handleTutorialModalClose'.
    1261 |           <Typography sx={{ mt: 2 }}>{blockTutorialContent.description}</Typography>
    1262 |           <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>  
  > 1263 |             <Button onClick={handleTutorialModalClose} variant="contained">  
         |                              ^^^^^^^^^^^^^^^^^^^^^^^^
    1264 |               Entendi
    1265 |             </Button>
    1266 |           </Box>

ERROR in src/pages/RecordingPage.tsx:1270:20
TS2304: Cannot find name 'showTimeoutModal'.
    1268 |       </Modal>
    1269 |
  > 1270 |       <Modal open={showTimeoutModal}>
         |                    ^^^^^^^^^^^^^^^^
    1271 |         <Box sx={modalStyle}>
    1272 |           <Typography variant="h6">Tempo Limite Excedido</Typography>
    1273 |           <Typography sx={{ mt: 2 }}>

ERROR in src/pages/RecordingPage.tsx:1278:30
TS2304: Cannot find name 'handleTimeoutModalClose'.
    1276 |           </Typography>
    1277 |           <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>    
  > 1278 |             <Button onClick={handleTimeoutModalClose} variant="contained" color="primary">
         |                              ^^^^^^^^^^^^^^^^^^^^^^^
    1279 |               Entendi
    1280 |             </Button>
    1281 |           </Box>

ERROR in src/pages/RecordingPage.tsx:1285:20
TS2304: Cannot find name 'finalizationStep'.
    1283 |       </Modal>
    1284 |
  > 1285 |       <Modal open={finalizationStep === 'roomTone'}>
         |                    ^^^^^^^^^^^^^^^^
    1286 |         <Box sx={modalStyle}>
    1287 |           <Typography variant="h6">Gravando som ambiente</Typography>        
    1288 |           <Typography sx={{ mt: 2 }}>

ERROR in src/pages/RecordingPage.tsx:1289:51
TS2304: Cannot find name 'finalRoomToneCountdown'.
    1287 |           <Typography variant="h6">Gravando som ambiente</Typography>        
    1288 |           <Typography sx={{ mt: 2 }}>
  > 1289 |             Por favor, permaneça em silêncio por {finalRoomToneCountdown} segundos.
         |                                                   ^^^^^^^^^^^^^^^^^^^^^^     
    1290 |           </Typography>
    1291 |         </Box>
    1292 |       </Modal>

ERROR in src/pages/RecordingPage.tsx:1293:22
TS2304: Cannot find name 'uploadError'.
    1291 |         </Box>
    1292 |       </Modal>
  > 1293 |       <Modal open={!!uploadError}>
         |                      ^^^^^^^^^^^
    1294 |         <Box sx={modalStyle}>
    1295 |           <Typography variant="h6">Erro no Upload</Typography>
    1296 |           <Typography sx={{ mt: 2 }}>

ERROR in src/pages/RecordingPage.tsx:1300:30
TS2304: Cannot find name 'handleRetryUpload'.
    1298 |           </Typography>
    1299 |           <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' 
}}>
  > 1300 |             <Button onClick={handleRetryUpload} variant="contained">Tentar Novamente</Button>
         |                              ^^^^^^^^^^^^^^^^^
    1301 |             <Button onClick={handleDiscardUpload} variant="outlined">Descartar</Button>
    1302 |           </Box>
    1303 |         </Box>

ERROR in src/pages/RecordingPage.tsx:1301:30
TS2304: Cannot find name 'handleDiscardUpload'.
    1299 |           <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' 
}}>
    1300 |             <Button onClick={handleRetryUpload} variant="contained">Tentar Novamente</Button>
  > 1301 |             <Button onClick={handleDiscardUpload} variant="outlined">Descartar</Button>
         |                              ^^^^^^^^^^^^^^^^^^^
    1302 |           </Box>
    1303 |         </Box>
    1304 |       </Modal>

ERROR in src/pages/RecordingPage.tsx:1305:5
TS1128: Declaration or statement expected.
    1303 |         </Box>
    1304 |       </Modal>
  > 1305 |     </Container>
         |     ^^
    1306 |   );
    1307 | };
    1308 |

ERROR in src/pages/RecordingPage.tsx:1306:3
TS1109: Expression expected.
    1304 |       </Modal>
    1305 |     </Container>
  > 1306 |   );
         |   ^
    1307 | };
    1308 |
    1309 | export default RecordingPage;

ERROR in src/pages/RecordingPage.tsx:1307:1
TS1128: Declaration or statement expected.
    1305 |     </Container>
    1306 |   );
  > 1307 | };
         | ^
    1308 |
    1309 | export default RecordingPage;
    1310 | // Force re-evaluation