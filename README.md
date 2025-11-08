# Sistema de Login com SQL

Sistema completo de autenticação com backend Node.js, banco de dados SQLite e frontend moderno.

## Características

- ✅ Registro de usuários
- ✅ Login com autenticação
- ✅ Proteção de senhas com bcrypt
- ✅ Tokens JWT para sessão
- ✅ Interface moderna e responsiva
- ✅ Banco de dados SQL (SQLite)

## Instalação

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente (opcional):
Crie um arquivo `.env` na raiz do projeto:
```
PORT=3001
JWT_SECRET=seu_secret_key_aqui_mude_em_producao
DB_PATH=./database.db
```

## Execução

### Modo Automático (Recomendado)
Para iniciar o servidor automaticamente com reinicialização:
- **Windows**: Clique duas vezes em `INICIAR-AUTOMATICO.bat`
- **Ou via terminal**: `npm run auto`

O servidor iniciará automaticamente e se reiniciará se cair.

### Modo Manual
Para iniciar o servidor normalmente:
```bash
npm start
```

### Modo Desenvolvimento (com auto-reload)
```bash
npm run dev
```

O servidor estará disponível em: `http://localhost:3001`

## Estrutura do Projeto

```
.
├── server.js          # Servidor Express e rotas da API
├── package.json       # Dependências do projeto
├── database.db        # Banco de dados SQLite (criado automaticamente)
├── public/
│   ├── index.html     # Interface do usuário
│   ├── style.css      # Estilos
│   └── script.js      # Lógica do frontend
└── README.md          # Este arquivo
```

## API Endpoints

### POST /api/registro
Registra um novo usuário.

**Body:**
```json
{
  "nome": "João Silva",
  "email": "joao@example.com",
  "senha": "senha123"
}
```

### POST /api/login
Realiza login.

**Body:**
```json
{
  "email": "joao@example.com",
  "senha": "senha123"
}
```

### GET /api/perfil
Retorna o perfil do usuário autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

## Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **SQLite3** - Banco de dados SQL
- **bcryptjs** - Hash de senhas
- **jsonwebtoken** - Autenticação JWT
- **CORS** - Cross-Origin Resource Sharing

## Segurança

- Senhas são hasheadas com bcrypt antes de serem armazenadas
- Tokens JWT com expiração de 24 horas
- Validação de dados no backend
- Proteção de rotas com middleware de autenticação

## Notas

- O banco de dados SQLite será criado automaticamente na primeira execução
- Para produção, considere usar MySQL ou PostgreSQL
- Altere o JWT_SECRET para um valor seguro em produção

