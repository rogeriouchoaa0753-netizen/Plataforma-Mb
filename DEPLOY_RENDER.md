# 🚀 Guia Visual - Deploy no Render.com

## ✅ Passo 1: CONCLUÍDO!
- ✅ Commit feito
- ✅ Código no GitHub
- ✅ Arquivos de configuração prontos

---

## 🌐 Passo 2: Criar Conta no Render

1. **Acesse**: https://render.com
2. **Clique** em "Get Started for Free"
3. **Faça login** com sua conta GitHub (mesma do repositório)

---

## 📦 Passo 3: Criar Web Service

### 3.1 Conectar Repositório

1. No dashboard do Render, clique em **"New +"** (canto superior direito)
2. Selecione **"Web Service"**
3. Na seção "Connect a repository":
   - Se ainda não conectou, clique em **"Connect account"** e autorize o Render
   - Selecione o repositório: **`rogeriouchoaa0753-netizen/Software-ADMB`**
   - Clique em **"Connect"**

### 3.2 Configurar o Serviço

Preencha os campos:

| Campo | Valor |
|-------|-------|
| **Name** | `software-admb-backend` |
| **Environment** | `Node` |
| **Region** | Escolha a mais próxima (ex: `Oregon (US West)`) |
| **Branch** | `main` |
| **Root Directory** | *(deixe em branco)* |
| **Runtime** | `Node` (automático) |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` (plano gratuito) |

### 3.3 Configurar Variáveis de Ambiente

Na seção **"Environment Variables"**, adicione:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | *(cole a chave gerada abaixo)* |

**🔑 Gerar JWT_SECRET:**
Execute no terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Ou use esta chave gerada:**
*(será gerada no próximo passo)*

### 3.4 Deploy

1. Revise todas as configurações
2. Clique em **"Create Web Service"**
3. Aguarde o build e deploy (5-10 minutos)
   - Você verá os logs em tempo real
   - Aguarde até aparecer "Your service is live"

### 3.5 Copiar URL

Após o deploy, você verá uma URL como:
```
https://software-admb-backend-xxxx.onrender.com
```

**⚠️ IMPORTANTE: Copie esta URL!** Você vai precisar dela no próximo passo.

---

## 🔗 Passo 4: Atualizar URL no Frontend

### 4.1 Editar script.js

1. Abra o arquivo `public/script.js`
2. Encontre a **linha 9**:
   ```javascript
   const BACKEND_URL_PRODUCTION = 'https://software-admb-backend.onrender.com';
   ```
3. **Substitua** pela URL real do seu backend (a que você copiou do Render)
   ```javascript
   const BACKEND_URL_PRODUCTION = 'https://sua-url-real.onrender.com';
   ```

### 4.2 Commit e Push

Execute no terminal:
```bash
git add public/script.js
git commit -m "Atualizar URL do backend para produção"
git push origin main
```

---

## ✅ Passo 5: Testar

1. **Aguarde 1-2 minutos** (GitHub Pages atualiza automaticamente)
2. **Acesse**: https://rogeriouchoaa0753-netizen.github.io/Software-ADMB/
3. **Abra o Console** do navegador (F12 → Console)
4. **Verifique** se aparece:
   ```
   🔗 API URL configurada: https://sua-url.onrender.com/api
   ```
5. **Teste o login** com suas credenciais

---

## 🎉 Pronto!

Seu sistema está funcionando online! 🚀

- **Frontend**: https://rogeriouchoaa0753-netizen.github.io/Software-ADMB/
- **Backend**: https://sua-url.onrender.com

---

## 🐛 Solução de Problemas

### ❌ Backend não responde

**Solução:**
1. Verifique os **logs** no Render (aba "Logs")
2. Verifique se o serviço está **"Live"** (status verde)
3. Verifique se a porta está configurada como `10000`

### ❌ Erro de CORS

**Solução:**
- O CORS já está configurado no `server.js`
- Verifique se a URL do GitHub Pages está na lista de origens permitidas

### ❌ Backend entra em "sleep"

**Problema:**
- O plano gratuito do Render coloca o serviço em sleep após 15 minutos de inatividade
- A primeira requisição após o sleep pode demorar ~30 segundos

**Solução:**
- É normal no plano gratuito
- Para evitar, considere atualizar para o plano pago
- Ou use um serviço de "ping" para manter o serviço ativo

### ❌ Build falha

**Solução:**
1. Verifique os logs do build no Render
2. Verifique se todas as dependências estão no `package.json`
3. Verifique se o `render.yaml` está correto

---

## 📚 Recursos

- **Render Dashboard**: https://dashboard.render.com
- **Render Docs**: https://render.com/docs
- **GitHub Pages**: https://pages.github.com
- **Este Repositório**: https://github.com/rogeriouchoaa0753-netizen/Software-ADMB

---

## 💡 Dicas

1. **Backup**: Faça backup regular do banco de dados
2. **Monitoramento**: Use os logs do Render para monitorar erros
3. **Segurança**: Mantenha o `JWT_SECRET` seguro
4. **Performance**: O plano gratuito pode ter limitações de performance

---

**Boa sorte! 🎊**

