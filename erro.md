Set-PSReadLineOption : O termo 'Set-PSReadLineOption' não é reconhecido como nome de cmdlet, função, arquivo de script ou programa operável. Verifique a grafia do nome ou, se um caminho tiver sido incluído, veja se o   
caminho está correto e tente novamente.
Compiled successfully!

You can now view dataset_speech in the browser.

  Local:            http://localhost:3000      
  On Your Network:  http://172.31.96.1:3000    

Note that the development build is not optimized.
To create a production build, use npm run build. 

webpack compiled successfully
Files successfully emitted, waiting for typecheck results...
Issues checking in progress...
ERROR in src/pages/GuestRegisterPage.tsx:172:19
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    170 |                 <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Dados Pessoais</Typography>
    171 |                 <Grid container spacing={2}>
  > 172 |                   <Grid item xs={12}>
        |                   ^^^^^^^^^^^^^^^^^^^
    173 |                     <TextField required fullWidth label="Nome Completo" name="nome_completo" value={formData.nome_completo} onChange={handleChange} />
    174 |                   </Grid>
    175 |                   <Grid item xs={12}>

ERROR in src/pages/GuestRegisterPage.tsx:175:19
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    173 |                     <TextField required fullWidth label="Nome Completo" name="nome_completo" value={formData.nome_completo} onChange={handleChange} />
    174 |                   </Grid>
  > 175 |                   <Grid item xs={12}>
        |                   ^^^^^^^^^^^^^^^^^^^
    176 |                     <TextField
    177 |                         required
    178 |                         fullWidth

ERROR in src/pages/GuestRegisterPage.tsx:188:19
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    186 |                     />
    187 |                   </Grid>
  > 188 |                   <Grid item xs={12} sm={6}>
        |                   ^^^^^^^^^^^^^^^^^^^^^^^^^^
    189 |                     <TextField required fullWidth label="Data de Nascimento" name="data_nascimento" type="date" InputLabelProps={{ shrink: true }} value={formData.data_nascimento} onChange={handleChange} />   
    190 |                   </Grid>
    191 |                   <Grid item xs={12} sm={6}>

ERROR in src/pages/GuestRegisterPage.tsx:191:19
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    189 |                     <TextField required fullWidth label="Data de Nascimento" name="data_nascimento" type="date" InputLabelProps={{ shrink: true }} value={formData.data_nascimento} onChange={handleChange} />
    190 |                   </Grid>
  > 191 |                   <Grid item xs={12} sm={6}>
        |                   ^^^^^^^^^^^^^^^^^^^^^^^^^^
    192 |                     <FormControl fullWidth required>
    193 |                       <InputLabel>Gênero</InputLabel>
    194 |                       <Select name="genero" value={formData.genero} onChange={(e) => handleChange(e as any)}>

ERROR in src/pages/GuestRegisterPage.tsx:205:19
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    203 |                 <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Localização</Typography>
    204 |                 <Grid container spacing={2}>
  > 205 |                   <Grid item xs={12}>
        |                   ^^^^^^^^^^^^^^^^^^^
    206 |                     <Paper sx={{ p: 2, border: '1px solid #ddd' }}>
    207 |                         <Typography variant="subtitle1" gutterBottom>Cidade de Nascimento</Typography>
    208 |                         <Grid container spacing={2}>

ERROR in src/pages/GuestRegisterPage.tsx:209:29
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    207 |                         <Typography variant="subtitle1" gutterBottom>Cidade de Nascimento</Typography>
    208 |                         <Grid container spacing={2}>
  > 209 |                             <Grid item xs={12} sm={6}>
        |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    210 |                                 <FormControl fullWidth>
    211 |                                     <InputLabel>Estado</InputLabel>
    212 |                                     <Select

ERROR in src/pages/GuestRegisterPage.tsx:225:29
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    223 |                                 </FormControl>
    224 |                             </Grid>
  > 225 |                             <Grid item xs={12} sm={6}>
        |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    226 |                                 <FormControl fullWidth disabled={!formData.cidade_nascimento.estado}>
    227 |                                     <InputLabel>Cidade</InputLabel>
    228 |                                     <Select

ERROR in src/pages/GuestRegisterPage.tsx:241:19
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    239 |                     </Paper>
    240 |                   </Grid>
  > 241 |                   <Grid item xs={12}>
        |                   ^^^^^^^^^^^^^^^^^^^
    242 |                     <Paper sx={{ p: 2, border: '1px solid #ddd' }}>
    243 |                         <Typography variant="subtitle1" gutterBottom>Cidade Atual</Typography>
    244 |                         <Grid container spacing={2}>

ERROR in src/pages/GuestRegisterPage.tsx:245:29
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    243 |                         <Typography variant="subtitle1" gutterBottom>Cidade Atual</Typography>
    244 |                         <Grid container spacing={2}>
  > 245 |                             <Grid item xs={12} sm={6}>
        |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    246 |                                 <FormControl fullWidth>
    247 |                                     <InputLabel>Estado</InputLabel>
    248 |                                     <Select

ERROR in src/pages/GuestRegisterPage.tsx:261:29
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    259 |                                 </FormControl>
    260 |                             </Grid>
  > 261 |                             <Grid item xs={12} sm={6}>
        |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    262 |                                 <FormControl fullWidth disabled={!formData.cidade_atual.estado}>
    263 |                                     <InputLabel>Cidade</InputLabel>
    264 |                                     <Select

ERROR in src/pages/GuestRegisterPage.tsx:288:27
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    286 |                     <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #444', borderRadius: 1 }}>
    287 |                       <Grid container spacing={2} alignItems="center">
  > 288 |                           <Grid item xs={12} sm={4}>
        |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^
    289 |                               <FormControl fullWidth>
    290 |                                   <InputLabel>Período</InputLabel>
    291 |                                   <Select

ERROR in src/pages/GuestRegisterPage.tsx:299:27
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    297 |                               </FormControl>
    298 |                           </Grid>
  > 299 |                           <Grid item xs={12} sm={3}>
        |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^
    300 |                               <FormControl fullWidth>
    301 |                                   <InputLabel>Estado</InputLabel>
    302 |                                   <Select

ERROR in src/pages/GuestRegisterPage.tsx:315:27
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    313 |                               </FormControl>
    314 |                           </Grid>
  > 315 |                           <Grid item xs={12} sm={3}>
        |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^
    316 |                               <FormControl fullWidth disabled={!item.endereco.estado}>
    317 |                                   <InputLabel>Cidade</InputLabel>
    318 |                                   <Select

ERROR in src/pages/GuestRegisterPage.tsx:328:27
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    326 |                               </FormControl>
    327 |                           </Grid>
  > 328 |                           <Grid item xs={12} sm={2}>
        |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^
    329 |                               <IconButton color="error" onClick={() => removeHistorico(index)}>
    330 |                                   <RemoveCircleOutlineIcon />
    331 |                               </IconButton>

ERROR in src/pages/GuestRegisterPage.tsx:343:21
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    341 |                 </Button>
    342 |                 <Grid container justifyContent="flex-end" sx={{mt: 2}}>
  > 343 |                     <Grid item>
        |                     ^^^^^^^^^^^
    344 |                         <MuiLink component={Link} to="/login" variant="body2">
    345 |                         {"Já tem uma conta? Faça Login"}
    346 |                         </MuiLink>

ERROR in src/pages/HomePage.tsx:104:21
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; key: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; key: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    102 |                 <Grid container spacing={2} justifyContent="center" sx={{ mb: 4 }}>
    103 |                     {datasets.map(datasetId => (
  > 104 |                     <Grid item key={datasetId}>
        |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    105 |                         <Button
    106 |                         variant="contained"
    107 |                         color="primary"

ERROR in src/pages/HomePage.tsx:128:21
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    126 |                 </Typography>
    127 |                 <Grid container spacing={2} justifyContent="center">
  > 128 |                     <Grid item>
        |                     ^^^^^^^^^^^
    129 |                          <Button variant="contained" color="primary" component={Link} to="/login" size="large">
    130 |                             Login
    131 |                         </Button>

ERROR in src/pages/HomePage.tsx:133:22
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    131 |                         </Button>
    132 |                     </Grid>
  > 133 |                      <Grid item>
        |                      ^^^^^^^^^^^
    134 |                          <Button variant="contained" color="primary" component={Link} to="/register" size="large">
    135 |                             Cadastrar
    136 |                         </Button>

ERROR in src/pages/HomePage.tsx:138:21
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    136 |                         </Button>
    137 |                     </Grid>
  > 138 |                     <Grid item>
        |                     ^^^^^^^^^^^
    139 |                          <Button variant="contained" color="secondary" component={Link} to="/guest-register" size="large">
    140 |                             Entrar como Visitante
    141 |                         </Button>

ERROR in src/pages/LoginPage.tsx:86:17
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    84 |               </Button>
    85 |               <Grid container justifyContent="space-between">
  > 86 |                 <Grid item>
       |                 ^^^^^^^^^^^
    87 |                   <MuiLink component={Link} to="/forgot-password" variant="body2" color="text.secondary">
    88 |                     Esqueceu sua senha?
    89 |                   </MuiLink>

ERROR in src/pages/LoginPage.tsx:91:17
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    89 |                   </MuiLink>
    90 |                 </Grid>
  > 91 |                 <Grid item>
       |                 ^^^^^^^^^^^
    92 |                   <MuiLink component={Link} to="/register" variant="body2" color="text.secondary">
    93 |                     {"Não tem uma conta? Cadastre-se"}
    94 |                   </MuiLink>

ERROR in src/pages/LoginPage.tsx:96:18
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    94 |                   </MuiLink>
    95 |                 </Grid>
  > 96 |                  <Grid item>
       |                  ^^^^^^^^^^^
    97 |                   <MuiLink component={Link} to="/guest-register" variant="body2" color="text.secondary">
    98 |                     {"Entrar como visitante"}
    99 |                   </MuiLink>

ERROR in src/pages/RegisterPage.tsx:194:19
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    192 |                 <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Dados Pessoais</Typography>
    193 |                 <Grid container spacing={2}>
  > 194 |                   <Grid item xs={12}>
        |                   ^^^^^^^^^^^^^^^^^^^
    195 |                     <TextField required fullWidth label="Nome Completo" name="nome_completo" value={formData.nome_completo} onChange={handleChange} />
    196 |                   </Grid>
    197 |                   <Grid item xs={12} sm={6}>

ERROR in src/pages/RegisterPage.tsx:197:19
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    195 |                     <TextField required fullWidth label="Nome Completo" name="nome_completo" value={formData.nome_completo} onChange={handleChange} />
    196 |                   </Grid>
  > 197 |                   <Grid item xs={12} sm={6}>
        |                   ^^^^^^^^^^^^^^^^^^^^^^^^^^
    198 |                     <TextField required fullWidth label="Data de Nascimento" name="data_nascimento" type="date" InputLabelProps={{ shrink: true }} value={formData.data_nascimento} onChange={handleChange} />   
    199 |                   </Grid>
    200 |                   <Grid item xs={12} sm={6}>

ERROR in src/pages/RegisterPage.tsx:200:19
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    198 |                     <TextField required fullWidth label="Data de Nascimento" name="data_nascimento" type="date" InputLabelProps={{ shrink: true }} value={formData.data_nascimento} onChange={handleChange} />   
    199 |                   </Grid>
  > 200 |                   <Grid item xs={12} sm={6}>
        |                   ^^^^^^^^^^^^^^^^^^^^^^^^^^
    201 |                     <FormControl fullWidth required>
    202 |                       <InputLabel>Gênero</InputLabel>
    203 |                       <Select name="genero" value={formData.genero} onChange={(e) => handleChange(e as any)}>

ERROR in src/pages/RegisterPage.tsx:214:21
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    212 |                 <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Credenciais</Typography>
    213 |                 <Grid container spacing={2}>
  > 214 |                     <Grid item xs={12}>
        |                     ^^^^^^^^^^^^^^^^^^^
    215 |                         <TextField
    216 |                             required
    217 |                             fullWidth

ERROR in src/pages/RegisterPage.tsx:227:21
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    225 |                         />
    226 |                     </Grid>
  > 227 |                     <Grid item xs={12} sm={6}>
        |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^
    228 |                         <TextField
    229 |                             required
    230 |                             fullWidth

ERROR in src/pages/RegisterPage.tsx:240:21
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    238 |                         />
    239 |                     </Grid>
  > 240 |                     <Grid item xs={12} sm={6}>
        |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^
    241 |                         <TextField
    242 |                             required
    243 |                             fullWidth

ERROR in src/pages/RegisterPage.tsx:257:19
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    255 |                 <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Localização</Typography>
    256 |                 <Grid container spacing={2}>
  > 257 |                   <Grid item xs={12}>
        |                   ^^^^^^^^^^^^^^^^^^^
    258 |                     <Paper sx={{ p: 2, border: '1px solid #ddd' }}>
    259 |                         <Typography variant="subtitle1" gutterBottom>Cidade de Nascimento</Typography>
    260 |                         <Grid container spacing={2}>

ERROR in src/pages/RegisterPage.tsx:261:29
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    259 |                         <Typography variant="subtitle1" gutterBottom>Cidade de Nascimento</Typography>
    260 |                         <Grid container spacing={2}>
  > 261 |                             <Grid item xs={12} sm={6}>
        |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    262 |                                 <FormControl fullWidth>
    263 |                                     <InputLabel>Estado</InputLabel>
    264 |                                     <Select

ERROR in src/pages/RegisterPage.tsx:277:35
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & { ...; }, "sx" | ... 1 more ... | keyof GridBaseProps>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; component: "div"; }' is not assignable to type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; component: string; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    275 |                                 </FormControl>
    276 |                             </Grid>
  > 277 |                             <Grid item xs={12} sm={6} component="div">
        |                                   ^^^^
    278 |                                 <FormControl fullWidth disabled={!formData.cidade_nascimento.estado}>
    279 |                                     <InputLabel>Cidade</InputLabel>
    280 |                                     <Select

ERROR in src/pages/RegisterPage.tsx:293:19
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    291 |                     </Paper>
    292 |                   </Grid>
  > 293 |                   <Grid item xs={12}>
        |                   ^^^^^^^^^^^^^^^^^^^
    294 |                     <Paper sx={{ p: 2, border: '1px solid #ddd' }}>
    295 |                         <Typography variant="subtitle1" gutterBottom>Cidade Atual</Typography>
    296 |                         <Grid container spacing={2}>

ERROR in src/pages/RegisterPage.tsx:297:29
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.   
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    295 |                         <Typography variant="subtitle1" gutterBottom>Cidade Atual</Typography>
    296 |                         <Grid container spacing={2}>
  > 297 |                             <Grid item xs={12} sm={6}>
        |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    298 |                                 <FormControl fullWidth>
    299 |                                     <InputLabel>Estado</InputLabel>
    300 |                                     <Select

ERROR in src/pages/RegisterPage.tsx:313:35
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & { ...; }, "sx" | ... 1 more ... | keyof GridBaseProps>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; component: "div"; }' is not assignable to type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; component: string; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    311 |                                 </FormControl>
    312 |                             </Grid>
  > 313 |                             <Grid item xs={12} sm={6} component="div">
        |                                   ^^^^
    314 |                                 <FormControl fullWidth disabled={!formData.cidade_atual.estado}>
    315 |                                     <InputLabel>Cidade</InputLabel>
    316 |                                     <Select

ERROR in src/pages/RegisterPage.tsx:340:33
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & { ...; }, "sx" | ... 1 more ... | keyof GridBaseProps>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; component: "div"; }' is not assignable to type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; component: string; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    338 |                     <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #444', borderRadius: 1 }}>
    339 |                       <Grid container spacing={2} alignItems="center">
  > 340 |                           <Grid item xs={12} sm={4} component="div">
        |                                 ^^^^
    341 |                               <FormControl fullWidth>
    342 |                                   <InputLabel>Período</InputLabel>
    343 |                                   <Select

ERROR in src/pages/RegisterPage.tsx:351:33
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & { ...; }, "sx" | ... 1 more ... | keyof GridBaseProps>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; component: "div"; }' is not assignable to type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; component: string; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    349 |                               </FormControl>
    350 |                           </Grid>
  > 351 |                           <Grid item xs={12} sm={3} component="div">
        |                                 ^^^^
    352 |                               <FormControl fullWidth>
    353 |                                   <InputLabel>Estado</InputLabel>
    354 |                                   <Select

ERROR in src/pages/RegisterPage.tsx:367:33
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & { ...; }, "sx" | ... 1 more ... | keyof GridBaseProps>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; component: "div"; }' is not assignable to type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; component: string; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    365 |                               </FormControl>
    366 |                           </Grid>
  > 367 |                           <Grid item xs={12} sm={3} component="div">
        |                                 ^^^^
    368 |                               <FormControl fullWidth disabled={!item.endereco.estado}>
    369 |                                   <InputLabel>Cidade</InputLabel>
    370 |                                   <Select

ERROR in src/pages/RegisterPage.tsx:380:33
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & { ...; }, "sx" | ... 1 more ... | keyof GridBaseProps>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; component: "div"; }' is not assignable to type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; component: string; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    378 |                               </FormControl>
    379 |                           </Grid>
  > 380 |                           <Grid item xs={12} sm={2} component="div">
        |                                 ^^^^
    381 |                               <IconButton color="error" onClick={() => removeHistorico(index)}>
    382 |                                   <RemoveCircleOutlineIcon />
    383 |                               </IconButton>

ERROR in src/pages/RegisterPage.tsx:395:27
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "ref"> & { ...; }, "sx" | ... 1 more ... | keyof GridBaseProps>): Element | null', gave the following error.
    Type '{ children: Element; item: true; component: "div"; }' is not assignable to type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & { component: "div"; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; component: string; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    393 |                 </Button>
    394 |                 <Grid container justifyContent="flex-end" sx={{mt: 2}}>
  > 395 |                     <Grid item component="div">
        |                           ^^^^
    396 |                         <MuiLink component={Link} to="/login" variant="body2">
    397 |                         {"Já tem uma conta? Faça Login"}
    398 |                         </MuiLink>