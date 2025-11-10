const { spawn } = require('child_process');
const http = require('http');

const PORT = 3001;
const MAX_RETRIES = 5;
let retries = 0;

function verificarServidor() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}`, (res) => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function iniciarServidor() {
  console.log('Iniciando servidor...');
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: true
  });

  server.on('error', (err) => {
    console.error('Erro ao iniciar servidor:', err);
    process.exit(1);
  });

  server.on('exit', (code) => {
    if (code !== 0) {
      console.log(`Servidor encerrado com código ${code}. Reiniciando...`);
      setTimeout(() => {
        retries++;
        if (retries < MAX_RETRIES) {
          iniciarServidor();
        } else {
          console.error('Muitas tentativas de reiniciar. Encerrando...');
          process.exit(1);
        }
      }, 2000);
    }
  });

  // Verificar se servidor iniciou corretamente após 3 segundos
  setTimeout(async () => {
    const estaRodando = await verificarServidor();
    if (estaRodando) {
      console.log(`✓ Servidor rodando em http://localhost:${PORT}`);
      retries = 0; // Reset retries on success
    } else {
      console.log('Servidor não respondeu. Verificando novamente...');
    }
  }, 3000);
}

// Verificar se já está rodando
verificarServidor().then((estaRodando) => {
  if (estaRodando) {
    console.log(`Servidor já está rodando em http://localhost:${PORT}`);
    console.log('Pressione Ctrl+C para encerrar.');
  } else {
    iniciarServidor();
  }
});

// Manter processo vivo
process.on('SIGINT', () => {
  console.log('\nEncerrando servidor...');
  process.exit(0);
});






