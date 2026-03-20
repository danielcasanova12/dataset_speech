WARNING in [eslint]
src\components\RoomToneScreen.tsx
  Line 74:6:  React Hook useEffect has a missing dependency: 'onRecordingComplete'. Either include it or remove the dependency array. If 'onRecordingComplete' changes too often, find the parent component that defines it and wrap that definition in useCallback  react-hooks/exhaustive-deps

src\components\VoiceSampleScreen.tsx
  Line 2:42:  'Card' is defined but never used         @typescript-eslint/no-unused-vars
  Line 2:48:  'CardContent' is defined but never used  @typescript-eslint/no-unused-vars

src\pages\RecordingPage.tsx
  Line 74:7:   'systemTutorialSteps' is assigned a value but never used                                                                   @typescript-eslint/no-unused-vars      
  Line 207:9:  'previousBlockIdRef' is assigned a value but never used                                                                    @typescript-eslint/no-unused-vars      
  Line 487:6:  React Hook useEffect has a missing dependency: 'setActiveSessionInfo'. Either include it or remove the dependency array    react-hooks/exhaustive-deps
  Line 736:6:  React Hook useCallback has a missing dependency: 'blocks'. Either include it or remove the dependency array                react-hooks/exhaustive-deps
  Line 965:6:  React Hook useCallback has a missing dependency: 'setActiveSessionInfo'. Either include it or remove the dependency array  react-hooks/exhaustive-deps

webpack compiled with 1 warning
Files successfully emitted, waiting for typecheck results...
Issues checking in progress...
ERROR in src/pages/ForgotPasswordPage.tsx:18:17
TS2339: Property 'forgotPassword' does not exist on type '{ login: (username: string, password: string) => Promise<LoginResponse>; register: (data: UserRegistrationData) => Promise<void>; createSession: (dataset_id: number, termos: boolean) => Promise<...>; getSession: (id: string) => Promise<...>; put: (path: string, data: any) => Promise<...>; uploadRecording: (sessionId...'.
    16 |     setMessage(null);
    17 |     try {
  > 18 |       await api.forgotPassword(email);
       |                 ^^^^^^^^^^^^^^
    19 |       setMessage('Se um e-mail com este endereço existir, um link de redefinição de senha foi enviado.');
    20 |     } catch (err: any) {
    21 |       setError('Falha ao enviar o e-mail de redefinição de senha.');

ERROR in src/pages/RecordingPage.tsx:155:11
TS2339: Property 'token' does not exist on type 'AuthContextType'.
    153 |   const location = useLocation();
    154 |   const { datasetId } = useParams<{ datasetId: string }>();
  > 155 |   const { token, setActiveSessionInfo } = useAuth();
        |           ^^^^^
    156 |
    157 |   const [phrases, setPhrases] = useState<Phrase[]>([]);
    158 |   const [blocks, setBlocks] = useState<Block[]>([]);

ERROR in src/pages/RecordingPage.tsx:459:81
TS2554: Expected 2 arguments, but got 3.
    457 |       let caughtError: any = null;
    458 |       try {
  > 459 |         const newSession = await api.createSession(datasetInfo.backendId, true, token);
        |                                                                                 ^^^^^
    460 |         setSession(newSession);
    461 |         setActiveSessionInfo(newSession.id, newSession.started_at);
    462 |         setCurrentPhraseIndex(0);

ERROR in src/pages/RecordingPage.tsx:705:60
TS2554: Expected 2 arguments, but got 3.
    703 |         // Salva no banco (sem await para não travar UI)
    704 |         const updatedSession = { ...session, numero_frase: nextPhraseIndex };
  > 705 |         api.put(`/sessions/${session.id}`, updatedSession, token).catch(e => console.error(e));
        |                                                            ^^^^^
    706 |         setSession(updatedSession);
    707 |
    708 |         const currentBlockId = phrases[currentPhraseIndex].blockId;

ERROR in src/pages/RecordingPage.tsx:759:9
TS2554: Expected 8-12 arguments, but got 13.
    757 |         !is_room_tone ? phrases[currentPhraseIndex].text : undefined,
    758 |         room_tone_type,
  > 759 |         !is_room_tone ? phrases[currentPhraseIndex].id.toString() : "1"
        |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    760 |       );
    761 |       if (!is_room_tone) {
    762 |         setTotalRecordedTime(prev => prev + duration);

ERROR in src/pages/RecordingPage.tsx:940:124
TS2554: Expected 2 arguments, but got 3.
    938 |         setIsLoading(true);
    939 |         const finished_at = new Date().toISOString();
  > 940 |         await api.put(`/sessions/${existingSessionInfo.id}`, { ...existingSessionInfo, status: "cancelled", finished_at }, token);
        |                                                                                                                            ^^^^^
    941 |
    942 |         setShowExistingSessionModal(false);
    943 |         setExistingSessionInfo(null);

ERROR in src/pages/RecordingPage.tsx:953:81
TS2554: Expected 2 arguments, but got 3.
    951 |         }
    952 |
  > 953 |         const newSession = await api.createSession(datasetInfo.backendId, true, token);
        |                                                                                 ^^^^^
    954 |         setSession(newSession);
    955 |         setActiveSessionInfo(newSession.id, newSession.started_at);
    956 |         setCurrentPhraseIndex(0);

ERROR in src/pages/RecordingPage.tsx:970:126
TS2554: Expected 2 arguments, but got 3.
    968 |     if (session && token) {
    969 |       try {
  > 970 |         await api.put(`/sessions/${session.id}`, { ...session, status: "cancelled", finished_at: new Date().toISOString() }, token);
        |                                                                                                                              ^^^^^
    971 |         setActiveSessionInfo(null, null);
    972 |         navigate('/');
    973 |       } catch (error) {

ERROR in src/pages/RecordingPage.tsx:989:12
TS2554: Expected 2 arguments, but got 3.
    987 |           notes: sessionNotes,
    988 |           finished_at: new Date().toISOString()
  > 989 |         }, token);
        |            ^^^^^
    990 |         setActiveSessionInfo(null, null);
    991 |         setFinalizationStep('idle');
    992 |         setOpenFinishModal(true);

ERROR in src/pages/ResetPasswordPage.tsx:42:17
TS2339: Property 'resetPassword' does not exist on type '{ login: (username: string, password: string) => Promise<LoginResponse>; register: (data: UserRegistrationData) => Promise<void>; createSession: (dataset_id: number, termos: boolean) => Promise<...>; getSession: (id: string) => Promise<...>; put: (path: string, data: any) => Promise<...>; uploadRecording: (sessionId...'.
    40 |     setMessage(null);
    41 |     try {
  > 42 |       await api.resetPassword(token, password);
       |                 ^^^^^^^^^^^^^
    43 |       setMessage('Sua senha foi redefinida com sucesso! Você já pode fazer o login.');
    44 |       setTimeout(() => navigate('/login'), 3000);
    45 |     } catch (err: any) {

      