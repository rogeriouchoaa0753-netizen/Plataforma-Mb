# ⚡ Início Rápido - Deploy do Backend

## 🎯 Objetivo
Fazer o sistema funcionar em: `https://rogeriouchoaa0753-netizen.github.io/Software-ADMB/`

## ⏱️ Tempo estimado: 15-20 minutos

---

## 📝 Passo 1: Commit das Alterações

```bash
git add .
git commit -m "Configurar para deploy no Render"
git push origin main
```

---

## 🌐 Passo 2: Deploy no Render.com

### 2.1 Criar conta
1. Acesse: https://render.com
2. Clique em "Get Started for Free"
3. Faça login com sua conta GitHub

### 2.2 Criar Web Service
1. Clique em **"New +"** → **"Web Service"**
2. Conecte o repositório: `rogeriouchoaa0753-netizen/Software-ADMB`
3. Clique em **"Connect"**

### 2.3 Configurar
- **Name**: `software-admb-backend`
- **Environment**: `Node`
- **Region**: Escolha a mais próxima (ex: `Oregon`)
- **Branch**: `main`
- **Root Directory**: (deixe em branco)
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free`

### 2.4 Variáveis de Ambiente
Adicione estas variáveis:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | *(gere uma chave - veja abaixo)* |

**Gerar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.5 Deploy
1. Clique em **"Create Web Service"**
2. Aguarde 5-10 minutos
3. **Copie a URL** (ex: `https://software-admb-backend-xxxx.onrender.com`)

---

## 🔗 Passo 3: Atualizar URL do Backend

### 3.1 Editar script.js
Abra `public/script.js` e encontre a linha 9:

```javascript
const BACKEND_URL_PRODUCTION = 'https://software-admb-backend.onrender.com';
```

Substitua pela URL real do seu backend (a que você copiou do Render).

### 3.2 Commit e Push
```bash
git add public/script.js
git commit -m "Atualizar URL do backend para produção"
git push origin main
```

---

## ✅ Passo 4: Testar

1. Aguarde 1-2 minutos (GitHub Pages atualiza)
2. Acesse: `https://rogeriouchoaa0753-netizen.github.io/Software-ADMB/`
3. Abra o Console (F12)
4. Verifique se aparece: `🔗 API URL configurada: https://sua-url.onrender.com/api`
5. Teste o login

---

## 🎉 Pronto!

Seu sistema está funcionando online! 🚀

---

## 🐛 Problemas?

### Backend não responde
- Verifique os logs no Render (aba "Logs")
- Verifique se o serviço está "Live"

### Erro de CORS
- Verifique se a URL do GitHub Pages está no CORS do server.js

### Backend em sleep
- O plano gratuito entra em sleep após 15 min
- A primeira requisição pode demorar ~30 segundos

---

## 📚 Mais informações

Consulte `DEPLOY.md` para guia completo e solução de problemas.

