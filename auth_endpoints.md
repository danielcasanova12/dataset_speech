# Documentação dos Endpoints de Autenticação

Este documento detalha os endpoints relacionados à autenticação e gerenciamento de usuários.

## Endpoints

### 1. Registro de Usuário

- **Endpoint:** `POST /register`
- **Descrição:** Cria um novo usuário no sistema. Este endpoint lida com a criação de um usuário e todos os seus objetos aninhados (endereços, histórico de moradia, familiares) em uma única transação.
- **Corpo da Requisição:** `UserCreate` schema (definido em `schemas.py`)
  ```json
  {
    "email": "user@example.com",
    "password": "your_password",
    "nome_completo": "Nome Completo do Usuário",
    "data_nascimento": "YYYY-MM-DD",
    "genero": "Masculino/Feminino/Outro",
    "language": "pt-BR",
    "cidade_nascimento": {
      "cidade": "Cidade Natal",
      "estado": "UF"
    },
    "cidade_atual": {
      "cidade": "Cidade Atual",
      "estado": "UF"
    },
    "historico_moradia": [
      {
        "periodo": "0-12 anos",
        "endereco": {
          "cidade": "Cidade",
          "estado": "UF"
        }
      }
    ],
    "familiares": [
      {
        "nome": "Nome do Familiar",
        "grau_parentesco": "Pai/Mãe/Irmão(ã)",
        "endereco": {
          "cidade": "Cidade",
          "estado": "UF"
        }
      }
    ]
  }
  ```
- **Respostas:**
  - `201 Created`: Usuário criado com sucesso. Retorna o objeto do usuário.
  - `400 Bad Request`: Se o email já existir.
  - `500 Internal Server Error`: Em caso de erro no servidor.

### 2. Login

- **Endpoint:** `POST /jwt/login`
- **Descrição:** Autentica um usuário e retorna um token JWT.
- **Corpo da Requisição:**
  ```json
  {
    "username": "user@example.com",
    "password": "your_password"
  }
  ```
- **Respostas:**
  - `200 OK`: Login bem-sucedido. Retorna o token de acesso.
  - `400 Bad Request`: Credenciais inválidas.

### 3. Logout

- **Endpoint:** `POST /jwt/logout`
- **Descrição:** Desloga o usuário. Requer um token JWT válido no cabeçalho de autorização.
- **Respostas:**
  - `200 OK`: Logout bem-sucedido.

### 4. Solicitação de Redefinição de Senha

- **Endpoint:** `POST /forgot-password`
- **Descrição:** Inicia o processo de redefinição de senha. Envia um email para o usuário com um token de redefinição.
- **Corpo da Requisição:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Respostas:**
  - `202 Accepted`: Solicitação aceita.

### 5. Redefinição de Senha

- **Endpoint:** `POST /reset-password`
- **Descrição:** Redefine a senha do usuário usando o token recebido por email.
- **Corpo da Requisição:**
  ```json
  {
    "token": "reset_token_from_email",
    "password": "new_password"
  }
  ```
- **Respostas:**
  - `200 OK`: Senha redefinida com sucesso.

### 6. Verificação de Email

- **Endpoint:** `GET /verify/{token}`
- **Descrição:** Verifica o email do usuário usando o token recebido no email de verificação.
- **Respostas:**
  - `200 OK`: Email verificado com sucesso.

### 7. Reenviar Verificação de Email

- **Endpoint:** `POST /resend-verification`
- **Descrição:** Reenvia o email de verificação para o usuário.
- **Corpo da Requisição:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Respostas:**
  - `202 Accepted`: Solicitação aceita.
