Compiled with problems:
×
ERROR in src/pages/RegisterPage.tsx:86:13
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    84 |         <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
    85 |           <Grid container spacing={2}>
  > 86 |             <Grid item xs={12}>
       |             ^^^^^^^^^^^^^^^^^^^
    87 |               <TextField
    88 |                 required
    89 |                 fullWidth
ERROR in src/pages/RegisterPage.tsx:97:13
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
     95 |               />
     96 |             </Grid>
  >  97 |             <Grid item xs={12}>
        |             ^^^^^^^^^^^^^^^^^^^
     98 |               <TextField
     99 |                 required
    100 |                 fullWidth
ERROR in src/pages/RegisterPage.tsx:109:13
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    107 |               />
    108 |             </Grid>
  > 109 |             <Grid item xs={12}>
        |             ^^^^^^^^^^^^^^^^^^^
    110 |               <TextField
    111 |                 required
    112 |                 fullWidth
ERROR in src/pages/RegisterPage.tsx:121:13
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    119 |               />
    120 |             </Grid>
  > 121 |             <Grid item xs={12} sm={6}>
        |             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    122 |               <TextField
    123 |                 required
    124 |                 fullWidth
ERROR in src/pages/RegisterPage.tsx:134:13
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    132 |               />
    133 |             </Grid>
  > 134 |             <Grid item xs={12} sm={6}>
        |             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    135 |               <TextField
    136 |                 select
    137 |                 required
ERROR in src/pages/RegisterPage.tsx:150:13
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    148 |               </TextField>
    149 |             </Grid>
  > 150 |             <Grid item xs={12}><Typography variant="subtitle1">Birth City</Typography></Grid>
        |             ^^^^^^^^^^^^^^^^^^^
    151 |             <Grid item xs={12} sm={8}>
    152 |               <TextField required fullWidth name="cidade_nascimento_cidade" label="City" value={formData.cidade_nascimento_cidade} onChange={handleChange} />
    153 |             </Grid>
ERROR in src/pages/RegisterPage.tsx:151:13
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    149 |             </Grid>
    150 |             <Grid item xs={12}><Typography variant="subtitle1">Birth City</Typography></Grid>
  > 151 |             <Grid item xs={12} sm={8}>
        |             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    152 |               <TextField required fullWidth name="cidade_nascimento_cidade" label="City" value={formData.cidade_nascimento_cidade} onChange={handleChange} />
    153 |             </Grid>
    154 |             <Grid item xs={12} sm={4}>
ERROR in src/pages/RegisterPage.tsx:154:13
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    152 |               <TextField required fullWidth name="cidade_nascimento_cidade" label="City" value={formData.cidade_nascimento_cidade} onChange={handleChange} />
    153 |             </Grid>
  > 154 |             <Grid item xs={12} sm={4}>
        |             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    155 |               <TextField required fullWidth name="cidade_nascimento_estado" label="State" value={formData.cidade_nascimento_estado} onChange={handleChange} />
    156 |             </Grid>
    157 |             <Grid item xs={12}><Typography variant="subtitle1">Current City</Typography></Grid>
ERROR in src/pages/RegisterPage.tsx:157:13
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    155 |               <TextField required fullWidth name="cidade_nascimento_estado" label="State" value={formData.cidade_nascimento_estado} onChange={handleChange} />
    156 |             </Grid>
  > 157 |             <Grid item xs={12}><Typography variant="subtitle1">Current City</Typography></Grid>
        |             ^^^^^^^^^^^^^^^^^^^
    158 |             <Grid item xs={12} sm={8}>
    159 |               <TextField required fullWidth name="cidade_atual_cidade" label="City" value={formData.cidade_atual_cidade} onChange={handleChange} />
    160 |             </Grid>
ERROR in src/pages/RegisterPage.tsx:158:13
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    156 |             </Grid>
    157 |             <Grid item xs={12}><Typography variant="subtitle1">Current City</Typography></Grid>
  > 158 |             <Grid item xs={12} sm={8}>
        |             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    159 |               <TextField required fullWidth name="cidade_atual_cidade" label="City" value={formData.cidade_atual_cidade} onChange={handleChange} />
    160 |             </Grid>
    161 |             <Grid item xs={12} sm={4}>
ERROR in src/pages/RegisterPage.tsx:161:13
TS2769: No overload matches this call.
  Overload 1 of 2, '(props: { component: ElementType<any, keyof IntrinsicElements>; } & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<...> & Omit<...>): Element | null', gave the following error.
    Property 'component' is missing in type '{ children: Element; item: true; xs: number; sm: number; }' but required in type '{ component: ElementType<any, keyof IntrinsicElements>; }'.
  Overload 2 of 2, '(props: DefaultComponentProps<GridTypeMap<{}, "div">>): Element | null', gave the following error.
    Type '{ children: Element; item: true; xs: number; sm: number; }' is not assignable to type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
      Property 'item' does not exist on type 'IntrinsicAttributes & GridBaseProps & { sx?: SxProps<Theme> | undefined; } & SystemProps<Theme> & Omit<...>'.
    159 |               <TextField required fullWidth name="cidade_atual_cidade" label="City" value={formData.cidade_atual_cidade} onChange={handleChange} />
    160 |             </Grid>
  > 161 |             <Grid item xs={12} sm={4}>
        |             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    162 |               <TextField required fullWidth name="cidade_atual_estado" label="State" value={formData.cidade_atual_estado} onChange={handleChange} />
    163 |             </Grid>
    164 |           </Grid>