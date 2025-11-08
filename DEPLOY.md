# 🚀 Guia de Deploy - Software ADMB

Este guia explica como fazer deploy do seu projeto para funcionar online, com o frontend no GitHub Pages e o backend no Render.com.

## 📋 Pré-requisitos

- Conta no GitHub (já tem ✅)
- Conta no Render.com (criar em https://render.com - grátis)
- Git instalado (já tem ✅)

## 🎯 Estrutura do Deploy

- **Frontend**: GitHub Pages (`https://rogeriouchoaa0753-netizen.github.io/Software-ADMB/`)
- **Backend**: Render.com (Node.js + Express + SQLite)

---

## 📦 Passo 1: Preparar o Backend para Produção

### 1.1 Verificar arquivos necessários

Certifique-se de que os seguintes arquivos estão no repositório:
- ✅ `server.js`
- ✅ `package.json`
- ✅ `render.yaml` (já criado)
- ✅ `.env.example` (já criado)

### 1.2 Arquivos que NÃO devem ir para o GitHub

O arquivo `.gitignore` já está configurado para ignorar:
- `node_modules/`
- `.env`
- `*.db`
- `database.db`

---

## 🌐 Passo 2: Deploy do Backend no Render.com

### 2.1 Criar conta no Render

1. Acesse: https://render.com
2. Clique em "Get Started for Free"
3. Faça login com sua conta GitHub

### 2.2 Criar novo Web Service

1. No dashboard do Render, clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório GitHub:
   - Selecione o repositório: `rogeriouchoaa0753-netizen/Software-ADMB`
   - Clique em **"Connect"**

### 2.3 Configurar o Web Service

Preencha os seguintes campos:

- **Name**: `software-admb-backend` (ou outro nome de sua escolha)
- **Environment**: `Node`
- **Region**: Escolha a região mais próxima (ex: `Oregon (US West)`)
- **Branch**: `main`
- **Root Directory**: Deixe em branco (raiz do projeto)
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 2.4 Configurar Variáveis de Ambiente

Na seção **"Environment Variables"**, adicione:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render usa esta porta) |
| `JWT_SECRET` | Gere uma chave secreta segura (veja abaixo) |

**Como gerar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copie o resultado e cole no campo `JWT_SECRET`.

### 2.5 Escolher Plano

- Selecione o plano **"Free"** (gratuito)
- ⚠️ **Nota**: O plano gratuito pode ter sleep após inatividade

### 2.6 Deploy

1. Clique em **"Create Web Service"**
2. Aguarde o build e deploy (pode levar 5-10 minutos)
3. Quando terminar, você verá uma URL como: `https://software-admb-backend.onrender.com`

### 2.7 Testar o Backend

Acesse no navegador:
```
https://sua-url-backend.onrender.com/api/health
```

Se retornar algo, o backend está funcionando! ✅

---

## 🔗 Passo 3: Configurar Frontend para Usar o Backend

### 3.1 Atualizar URL do Backend

1. Abra o arquivo `public/script.js`
2. Encontre a linha com `BACKEND_URL_PRODUCTION`
3. Substitua pela URL do seu backend no Render:

```javascript
const BACKEND_URL_PRODUCTION = 'https://sua-url-backend.onrender.com'; // ← COLE A URL AQUI
```

### 3.2 Fazer Commit e Push

```bash
git add public/script.js
git commit -m "Configurar URL do backend para produção"
git push origin main
```

### 3.3 Aguardar GitHub Pages Atualizar

- O GitHub Pages atualiza automaticamente após o push
- Pode levar alguns minutos (geralmente 1-2 minutos)

---

## ✅ Passo 4: Testar Tudo Funcionando

### 4.1 Testar Frontend

1. Acesse: `https://rogeriouchoaa0753-netizen.github.io/Software-ADMB/`
2. Abra o Console do navegador (F12)
3. Verifique se aparece: `🔗 API URL configurada: https://sua-url-backend.onrender.com/api`

### 4.2 Testar Login

1. Tente fazer login com suas credenciais
2. Se funcionar, está tudo certo! ✅

---

## 🐛 Solução de Problemas

### Problema: Backend não responde

**Solução:**
- Verifique se o serviço está "Live" no Render
- Verifique os logs no Render (aba "Logs")
- Verifique se a porta está configurada como `10000`

### Problema: Erro de CORS

**Solução:**
- Verifique se o `server.js` tem o CORS configurado corretamente
- Verifique se a URL do GitHub Pages está na lista de origens permitidas

### Problema: Banco de dados não funciona

**Solução:**
- O Render usa sistema de arquivos efêmero
- Os dados podem ser perdidos quando o serviço reinicia
- Considere migrar para um banco de dados persistente (PostgreSQL) no futuro

### Problema: Backend entra em "sleep"

**Solução:**
- O plano gratuito do Render coloca o serviço em sleep após 15 minutos de inatividade
- A primeira requisição após o sleep pode demorar ~30 segundos
- Para evitar isso, considere:
  - Usar um serviço de "ping" para manter o serviço ativo
  - Atualizar para o plano pago

---

## 🔄 Atualizações Futuras

### Como atualizar o backend:

1. Faça as alterações no código
2. Commit e push para o GitHub
3. O Render detecta automaticamente e faz redeploy

### Como atualizar o frontend:

1. Faça as alterações no código
2. Commit e push para o GitHub
3. O GitHub Pages atualiza automaticamente

---

## 📚 Recursos Úteis

- **Render Dashboard**: https://dashboard.render.com
- **Render Docs**: https://render.com/docs
- **GitHub Pages**: https://pages.github.com
- **Este Repositório**: https://github.com/rogeriouchoaa0753-netizen/Software-ADMB

---

## 🎉 Pronto!

Agora seu projeto está online e funcionando! 🚀

- **Frontend**: https://rogeriouchoaa0753-netizen.github.io/Software-ADMB/
- **Backend**: https://sua-url-backend.onrender.com

---

## 💡 Dicas

1. **Backup do Banco de Dados**: Faça backup regular do `database.db` (via download do Render)
2. **Monitoramento**: Use os logs do Render para monitorar erros
3. **Segurança**: Mantenha o `JWT_SECRET` seguro e nunca commite no Git
4. **Performance**: Considere adicionar cache para melhorar performance

---

**Boa sorte com seu projeto! 🎊**

