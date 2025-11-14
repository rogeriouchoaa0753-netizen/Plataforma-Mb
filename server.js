const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'seu_secret_key_aqui_mude_em_producao';

// Middleware
// Obter IP local da máquina
function getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const LOCAL_IP = getLocalIP();

// Configurar CORS para aceitar requisições do GitHub Pages, localhost e rede local
app.use(cors({
    origin: [
        'https://rogeriouchoaa0753-netizen.github.io',
        'https://plataforma-mb.onrender.com',
        'http://localhost:3001',
        'http://localhost:3000',
        'http://127.0.0.1:3001',
        `http://${LOCAL_IP}:3001`,
        // Permitir qualquer origem em desenvolvimento (para facilitar acesso mobile)
        ...(process.env.NODE_ENV !== 'production' ? [/^http:\/\/192\.168\.\d+\.\d+:3001$/, /^http:\/\/10\.\d+\.\d+\.\d+:3001$/] : [])
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' })); // Aumentar limite para suportar textos grandes e arquivos

// Middleware para desabilitar cache em desenvolvimento (especialmente para mobile)
app.use((req, res, next) => {
    // Desabilitar cache para HTML, CSS e JS durante desenvolvimento
    if (req.path.match(/\.(html|css|js)$/)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    next();
});

app.use(express.static('public'));

db.initialize()
  .then(() => console.log('Banco de dados PostgreSQL inicializado com sucesso'))
  .catch((error) => {
    console.error('Erro ao inicializar banco de dados:', error);
    process.exit(1);
  });

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ erro: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Rota de registro
app.post('/api/registro', async (req, res) => {
  try {
    const { nome, sobrenome, nome_completo, email, senha, cpf, ocupacao_id, igreja_id, data_nascimento, estado_civil, data_sacamento } = req.body;

    // Validação
    if (!nome || !email || !senha || !cpf || !data_nascimento || !estado_civil) {
      return res.status(400).json({ erro: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    // Validar data de sacamento se casado
    if (estado_civil === 'casado' && !data_sacamento) {
      return res.status(400).json({ erro: 'Data de sacamento é obrigatória para casados' });
    }
    

    if (senha.length < 6) {
      return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se o CPF já existe
    db.get('SELECT id, nome, email FROM usuarios WHERE cpf = ?', [cpf], async (err, cpfRow) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao verificar CPF' });
      }

      if (cpfRow) {
        return res.status(400).json({ 
          erro: 'CPF já cadastrado',
          conta_existente: {
            id: cpfRow.id,
            nome: cpfRow.nome,
            email: cpfRow.email
          },
          mensagem: `Já existe uma conta cadastrada com este CPF. ID da conta: ${cpfRow.id}`
        });
      }

      // Verificar se o email já existe
      db.get('SELECT * FROM usuarios WHERE email = ?', [email], async (err, row) => {
        if (err) {
          return res.status(500).json({ erro: 'Erro ao verificar usuário' });
        }

        if (row) {
          return res.status(400).json({ erro: 'Email já cadastrado' });
        }

        // Hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Validar ocupação se fornecida
        if (ocupacao_id) {
          db.get('SELECT id FROM areas_servicos WHERE id = ?', [ocupacao_id], (err, ocupacao) => {
            if (err) {
              return res.status(500).json({ erro: 'Erro ao validar ocupação' });
            }
            if (!ocupacao) {
              return res.status(400).json({ erro: 'Ocupação inválida' });
            }
            
            // Validar igreja se fornecida
            if (igreja_id) {
              db.get('SELECT id FROM igrejas WHERE id = ?', [igreja_id], (err, igreja) => {
                if (err || !igreja) {
                  return res.status(400).json({ erro: 'Igreja inválida' });
                }
                criarUsuarioComIgreja();
              });
            } else {
              criarUsuarioComIgreja();
            }

            function criarUsuarioComIgreja() {
              // Inserir usuário com CPF e ocupação, incluindo novos campos
              const nomeCompleto = nome_completo || (sobrenome ? `${nome} ${sobrenome}` : nome);
              db.run(
                'INSERT INTO usuarios (nome, sobrenome, nome_completo, email, senha, cpf, ocupacao_id, data_nascimento, estado_civil, data_sacamento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [nome, sobrenome || null, nomeCompleto, email, senhaHash, cpf, ocupacao_id, data_nascimento, estado_civil, estado_civil === 'casado' ? data_sacamento : null],
                function(err) {
                  if (err) {
                    if (err.message && err.message.includes('UNIQUE constraint failed')) {
                      return res.status(400).json({ erro: 'CPF ou email já cadastrado' });
                    }
                    return res.status(500).json({ erro: 'Erro ao criar usuário' });
                  }

                  const novoUsuarioId = this.lastID;

                  // Vincular à igreja se fornecida
                  if (igreja_id) {
                    db.run('INSERT INTO igreja_membros (igreja_id, usuario_id) VALUES (?, ?)',
                      [igreja_id, novoUsuarioId], (err) => {
                        if (err) {
                          console.error('Erro ao vincular igreja:', err);
                          // Não falhar o registro se houver erro ao vincular igreja
                        } else {
                          // Atualizar quantidade de membros na igreja
                          db.run('UPDATE igrejas SET quantidade_vinculados = (SELECT COUNT(*) FROM igreja_membros WHERE igreja_id = ?) WHERE id = ?',
                            [igreja_id, igreja_id]);
                        }
                      }
                    );
                  }

                  // Gerar token JWT
                  const token = jwt.sign(
                    { id: novoUsuarioId, email: email },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                  );

                  res.status(201).json({
                    mensagem: 'Usuário criado com sucesso',
                    token: token,
                    usuario: {
                      id: novoUsuarioId,
                      nome: nome,
                      email: email,
                      cpf: cpf,
                      ocupacao_id: ocupacao_id
                    }
                  });
                }
              );
            }
          });
        } else {
          // Inserir usuário com CPF (sem ocupação), incluindo novos campos
          const nomeCompleto = nome_completo || (sobrenome ? `${nome} ${sobrenome}` : nome);
          db.run(
            'INSERT INTO usuarios (nome, sobrenome, nome_completo, email, senha, cpf, data_nascimento, estado_civil, data_sacamento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [nome, sobrenome || null, nomeCompleto, email, senhaHash, cpf, data_nascimento, estado_civil, estado_civil === 'casado' ? data_sacamento : null],
            function(err) {
              if (err) {
                // Verificar se erro é por CPF duplicado
                if (err.message && err.message.includes('UNIQUE constraint failed')) {
                  return res.status(400).json({ erro: 'CPF já cadastrado' });
                }
                return res.status(500).json({ erro: 'Erro ao criar usuário' });
              }

              // Gerar token JWT
              const token = jwt.sign(
                { id: this.lastID, email: email },
                JWT_SECRET,
                { expiresIn: '24h' }
              );

              res.status(201).json({
                mensagem: 'Usuário criado com sucesso',
                token: token,
                usuario: {
                  id: this.lastID,
                  nome: nome,
                  email: email,
                  cpf: cpf
                }
              });
            }
          );
        }
      });
    });
  } catch (error) {
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Rota de login
app.post('/api/login', (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validação
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário (normalizar email para comparação)
    const emailNormalizado = email.trim().toLowerCase();
    db.get('SELECT * FROM usuarios WHERE LOWER(email) = ?', [emailNormalizado], async (err, row) => {
      if (err) {
        console.error('Erro ao buscar usuário:', err);
        return res.status(500).json({ erro: 'Erro ao buscar usuário' });
      }

      if (!row) {
        return res.status(401).json({ erro: 'Email ou senha incorretos' });
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(senha, row.senha);

      if (!senhaValida) {
        return res.status(401).json({ erro: 'Email ou senha incorretos' });
      }

      // Gerar token JWT
      const token = jwt.sign(
        { id: row.id, email: row.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        mensagem: 'Login realizado com sucesso',
        token: token,
        usuario: {
          id: row.id,
          nome: row.nome,
          email: row.email
        }
      });
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Rota protegida - perfil do usuário
// SEMPRE busca dados atualizados diretamente do SQL, sem cache
app.get('/api/perfil', authenticateToken, (req, res) => {
  // SEMPRE buscar dados frescos do banco de dados SQL
  // Usar EXATAMENTE a mesma query da administração para garantir dados idênticos
  db.get(`SELECT u.id, u.nome, u.nome_completo, u.email, u.cpf, u.telefone, u.endereco, u.cep, 
          u.estado_civil, u.ocupacao_id, u.perfil_completo, u.criado_em, u.atualizado_em,
          a.nome as ocupacao_nome,
          i.nome as igreja_nome, i.id as igreja_id, im.funcao as igreja_funcao
          FROM usuarios u
          LEFT JOIN areas_servicos a ON u.ocupacao_id = a.id
          LEFT JOIN igreja_membros im ON u.id = im.usuario_id
          LEFT JOIN igrejas i ON im.igreja_id = i.id
          WHERE u.id = ?`, [req.user.id], (err, row) => {
    if (err) {
      console.error('Erro ao buscar perfil do SQL:', err);
      return res.status(500).json({ erro: 'Erro ao buscar perfil' });
    }

    if (!row) {
      return res.status(404).json({ erro: 'Usuário não encontrado no banco de dados' });
    }

    // Log para garantir que está buscando do SQL
    console.log(`[SQL] Dados do perfil ID ${row.id} buscados diretamente do banco:`, { 
      id: row.id, 
      igreja_id: row.igreja_id, 
      igreja_nome: row.igreja_nome,
      ocupacao_nome: row.ocupacao_nome,
      ocupacao_id: row.ocupacao_id
    });

    // Buscar relacionamentos diretamente do SQL
    db.all(`SELECT r.tipo, r.relacionado_id, u.nome, u.nome_completo, u.email, u.cpf, u.telefone
            FROM relacionamentos r
            JOIN usuarios u ON r.relacionado_id = u.id
            WHERE r.usuario_id = ?`, [req.user.id], (err, relacionamentos) => {
      if (err) {
        console.error('Erro ao buscar relacionamentos do SQL:', err);
        return res.status(500).json({ erro: 'Erro ao buscar relacionamentos' });
      }

      // Retornar dados usando EXATAMENTE a mesma estrutura da administração
      // Todos os dados vêm diretamente do SQL, sem cache
      // Garantir que ocupacao_nome e igreja_nome sejam strings (não null/undefined)
      const usuarioResponse = {
        ...row,
        igreja_id: row.igreja_id || null,
        igreja_nome: row.igreja_nome || null,
        igreja_funcao: row.igreja_funcao || null,
        ocupacao_nome: row.ocupacao_nome || null
      };
      
      console.log(`[SQL] Resposta JSON sendo enviada para o frontend:`, {
        id: usuarioResponse.id,
        ocupacao_id: usuarioResponse.ocupacao_id,
        ocupacao_nome: usuarioResponse.ocupacao_nome,
        igreja_id: usuarioResponse.igreja_id,
        igreja_nome: usuarioResponse.igreja_nome,
        tipo_ocupacao_nome: typeof usuarioResponse.ocupacao_nome,
        tipo_igreja_nome: typeof usuarioResponse.igreja_nome
      });
      
      res.json({ 
        usuario: usuarioResponse,
        relacionamentos: relacionamentos || []
      });
    });
  });
});

// Rota para atualizar perfil completo
app.put('/api/perfil/completo', authenticateToken, async (req, res) => {
  const { nome_completo, cpf, endereco, cep, telefone, estado_civil, ocupacao_id, igreja_id, filhos } = req.body;

  console.log('Recebendo atualização de perfil:', { 
    usuario_id: req.user.id, 
    nome_completo, 
    ocupacao_id, 
    igreja_id,
    tem_filhos: filhos && filhos.length > 0 ? filhos.length : 0
  });

  // Validação básica
  if (!nome_completo || !telefone || !endereco) {
    console.log('Validação falhou:', { nome_completo: !!nome_completo, telefone: !!telefone, endereco: !!endereco });
    return res.status(400).json({ erro: 'Nome completo, telefone e endereço são obrigatórios' });
  }

  // Buscar CPF atual do usuário
  db.get('SELECT cpf FROM usuarios WHERE id = ?', [req.user.id], async (err, usuarioAtual) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao buscar dados do usuário' });
    }

    // Se usuário já tem CPF, não permitir alterar
    if (usuarioAtual && usuarioAtual.cpf) {
      // Usar CPF existente, ignorar o que veio no body
      const cpfExistente = usuarioAtual.cpf;
      
      // Validar ocupação se fornecida
      if (ocupacao_id) {
        db.get('SELECT id FROM areas_servicos WHERE id = ?', [ocupacao_id], (err, ocupacao) => {
          if (err || !ocupacao) {
            return res.status(400).json({ erro: 'Ocupação inválida' });
          }
          atualizarPerfilComIgreja();
        });
      } else {
        atualizarPerfilComIgreja();
      }

      function atualizarPerfilComIgreja() {
        // Atualizar perfil sem alterar CPF
        db.run(`UPDATE usuarios SET 
                nome_completo = ?, endereco = ?, cep = ?, 
                telefone = ?, estado_civil = ?, ocupacao_id = ?, perfil_completo = true, 
                atualizado_em = CURRENT_TIMESTAMP
                WHERE id = ?`,
          [nome_completo, endereco || null, cep || null, telefone, estado_civil, ocupacao_id || null, req.user.id],
          async function(err) {
            if (err) {
              console.error('Erro ao atualizar perfil no banco:', err);
              return res.status(500).json({ erro: 'Erro ao atualizar perfil' });
            }
            
            console.log('Perfil atualizado no banco com sucesso. ID:', req.user.id);

            // Atualizar vínculo com igreja
            if (igreja_id) {
              console.log('Atualizando vínculo com igreja:', igreja_id);
              db.get('SELECT id FROM igrejas WHERE id = ?', [igreja_id], (err, igreja) => {
                if (err || !igreja) {
                  console.error('Igreja inválida:', igreja_id, err);
                  // Continuar mesmo se igreja for inválida, apenas não vincular
                  processarFilhos(req, res, filhos);
                  return;
                }

                // Verificar se já existe vínculo
                db.get('SELECT id FROM igreja_membros WHERE usuario_id = ?', [req.user.id], (err, existente) => {
                  if (err) {
                    console.error('Erro ao verificar vínculo:', err);
                    // Continuar mesmo com erro
                  }

                  if (existente) {
                    // Atualizar vínculo existente
                    db.run('UPDATE igreja_membros SET igreja_id = ? WHERE usuario_id = ?',
                      [igreja_id, req.user.id], (err) => {
                        if (err) {
                          console.error('Erro ao atualizar vínculo:', err);
                        } else {
                          console.log('Vínculo atualizado com sucesso');
                          // Atualizar quantidade de membros
                          db.run('UPDATE igrejas SET quantidade_vinculados = (SELECT COUNT(*) FROM igreja_membros WHERE igreja_id = igrejas.id)', (err) => {
                            if (err) console.error('Erro ao atualizar quantidade:', err);
                          });
                        }
                        // Sempre processar filhos e retornar resposta
                        processarFilhos(req, res, filhos);
                      }
                    );
                  } else {
                    // Criar novo vínculo
                    db.run('INSERT INTO igreja_membros (igreja_id, usuario_id) VALUES (?, ?)',
                      [igreja_id, req.user.id], (err) => {
                        if (err) {
                          console.error('Erro ao criar vínculo:', err);
                        } else {
                          console.log('Vínculo criado com sucesso');
                          // Atualizar quantidade de membros
                          db.run('UPDATE igrejas SET quantidade_vinculados = (SELECT COUNT(*) FROM igreja_membros WHERE igreja_id = igrejas.id)', (err) => {
                            if (err) console.error('Erro ao atualizar quantidade:', err);
                          });
                        }
                        // Sempre processar filhos e retornar resposta
                        processarFilhos(req, res, filhos);
                      }
                    );
                  }
                });
              });
            } else {
              // Remover vínculo se igreja_id for null ou vazio
              console.log('Removendo vínculo com igreja');
              db.run('DELETE FROM igreja_membros WHERE usuario_id = ?', [req.user.id], (err) => {
                if (err) {
                  console.error('Erro ao remover vínculo:', err);
                } else {
                  console.log('Vínculo removido com sucesso');
                  // Atualizar quantidade de membros
                  db.run('UPDATE igrejas SET quantidade_vinculados = (SELECT COUNT(*) FROM igreja_membros WHERE igreja_id = igrejas.id)', (err) => {
                    if (err) console.error('Erro ao atualizar quantidade:', err);
                  });
                }
                // Sempre processar filhos e retornar resposta
                processarFilhos(req, res, filhos);
              });
            }
          }
        );
      }
    } else {
      // Usuário não tem CPF ainda, validar e salvar
      if (!cpf) {
        return res.status(400).json({ erro: 'CPF é obrigatório' });
      }

      // Verificar se CPF já está em uso por outro usuário
      db.get('SELECT id FROM usuarios WHERE cpf = ? AND id != ?', [cpf, req.user.id], async (err, row) => {
        if (err) {
          return res.status(500).json({ erro: 'Erro ao verificar CPF' });
        }

        if (row) {
          return res.status(400).json({ erro: 'CPF já cadastrado por outro usuário' });
        }

        // Validar ocupação se fornecida
        if (ocupacao_id) {
          db.get('SELECT id FROM areas_servicos WHERE id = ?', [ocupacao_id], (err, ocupacao) => {
            if (err || !ocupacao) {
              return res.status(400).json({ erro: 'Ocupação inválida' });
            }
            atualizarPerfilComCPF();
          });
        } else {
          atualizarPerfilComCPF();
        }

        function atualizarPerfilComCPF() {
          // Atualizar perfil com CPF
          db.run(`UPDATE usuarios SET 
                  nome_completo = ?, cpf = ?, endereco = ?, cep = ?, 
                  telefone = ?, estado_civil = ?, ocupacao_id = ?, perfil_completo = true, 
                  atualizado_em = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            [nome_completo, cpf, endereco || null, cep || null, telefone, estado_civil, ocupacao_id || null, req.user.id],
          async function(err) {
            if (err) {
              console.error('Erro ao atualizar perfil no banco (com CPF):', err);
              return res.status(500).json({ erro: 'Erro ao atualizar perfil' });
            }
            
            console.log('Perfil atualizado no banco com sucesso (com CPF). ID:', req.user.id);

            // Atualizar vínculo com igreja
            if (igreja_id) {
              console.log('Atualizando vínculo com igreja (com CPF):', igreja_id);
              db.get('SELECT id FROM igrejas WHERE id = ?', [igreja_id], (err, igreja) => {
                if (err || !igreja) {
                  console.error('Igreja inválida:', igreja_id, err);
                  // Continuar mesmo se igreja for inválida, apenas não vincular
                  processarFilhos(req, res, filhos);
                  return;
                }

                // Verificar se já existe vínculo
                db.get('SELECT id FROM igreja_membros WHERE usuario_id = ?', [req.user.id], (err, existente) => {
                  if (err) {
                    console.error('Erro ao verificar vínculo:', err);
                    // Continuar mesmo com erro
                  }

                  if (existente) {
                    // Atualizar vínculo existente
                    db.run('UPDATE igreja_membros SET igreja_id = ? WHERE usuario_id = ?',
                      [igreja_id, req.user.id], (err) => {
                        if (err) {
                          console.error('Erro ao atualizar vínculo:', err);
                        } else {
                          console.log('Vínculo atualizado com sucesso (com CPF)');
                          // Atualizar quantidade de membros
                          db.run('UPDATE igrejas SET quantidade_vinculados = (SELECT COUNT(*) FROM igreja_membros WHERE igreja_id = igrejas.id)', (err) => {
                            if (err) console.error('Erro ao atualizar quantidade:', err);
                          });
                        }
                        // Sempre processar filhos e retornar resposta
                        processarFilhos(req, res, filhos);
                      }
                    );
                  } else {
                    // Criar novo vínculo
                    db.run('INSERT INTO igreja_membros (igreja_id, usuario_id) VALUES (?, ?)',
                      [igreja_id, req.user.id], (err) => {
                        if (err) {
                          console.error('Erro ao criar vínculo:', err);
                        } else {
                          console.log('Vínculo criado com sucesso (com CPF)');
                          // Atualizar quantidade de membros
                          db.run('UPDATE igrejas SET quantidade_vinculados = (SELECT COUNT(*) FROM igreja_membros WHERE igreja_id = igrejas.id)', (err) => {
                            if (err) console.error('Erro ao atualizar quantidade:', err);
                          });
                        }
                        // Sempre processar filhos e retornar resposta
                        processarFilhos(req, res, filhos);
                      }
                    );
                  }
                });
              });
            } else {
              // Remover vínculo se igreja_id for null ou vazio
              console.log('Removendo vínculo com igreja (com CPF)');
              db.run('DELETE FROM igreja_membros WHERE usuario_id = ?', [req.user.id], (err) => {
                if (err) {
                  console.error('Erro ao remover vínculo:', err);
                } else {
                  console.log('Vínculo removido com sucesso (com CPF)');
                  // Atualizar quantidade de membros
                  db.run('UPDATE igrejas SET quantidade_vinculados = (SELECT COUNT(*) FROM igreja_membros WHERE igreja_id = igrejas.id)', (err) => {
                    if (err) console.error('Erro ao atualizar quantidade:', err);
                  });
                }
                // Sempre processar filhos e retornar resposta
                processarFilhos(req, res, filhos);
              });
            }
          }
        );
      }
    });
    }
  });
});

// Função auxiliar para processar filhos (admin)
function processarFilhosAdmin(req, res, filhos, usuarioId) {
  console.log('Processando filhos (admin):', { quantidade: filhos && Array.isArray(filhos) ? filhos.length : 0, usuarioId });
  
  // Se não há filhos, remover todos os relacionamentos de filhos e retornar sucesso
  if (!filhos || !Array.isArray(filhos) || filhos.length === 0) {
    console.log('Nenhum filho para processar. Removendo relacionamentos de filhos antigos.');
    db.run('DELETE FROM relacionamentos WHERE usuario_id = ? AND tipo = ?', 
      [usuarioId, 'filho'], (err) => {
        if (err) {
          console.error('Erro ao remover filhos antigos:', err);
        }
        return res.json({ mensagem: 'Usuário atualizado com sucesso' });
      });
    return;
  }
  
  // Remover relacionamentos de filhos antigos
  db.run('DELETE FROM relacionamentos WHERE usuario_id = ? AND tipo = ?', 
    [usuarioId, 'filho'], (err) => {
      if (err) {
        console.error('Erro ao remover filhos antigos:', err);
      }
    });

  // Processar cada filho
  let processados = 0;
  const totalFilhos = filhos.length;

  filhos.forEach((filho) => {
    if (!filho || (!filho.nome && !filho.nome_completo && !filho.cpf && !filho.filho_id)) {
      processados++;
      if (processados === totalFilhos) {
        return res.json({ mensagem: 'Usuário atualizado com sucesso' });
      }
      return;
    }

    // Se tem filho_id, vincular ao cadastro existente
    if (filho.filho_id) {
      const filhoId = parseInt(filho.filho_id);
      console.log('[ADMIN FILHOS] Vincular filho existente por ID:', filhoId);
      if (filhoId && filhoId !== usuarioId) {
        db.run('INSERT OR IGNORE INTO relacionamentos (usuario_id, tipo, relacionado_id) VALUES (?, ?, ?)',
          [usuarioId, 'filho', filhoId], (err) => {
            if (err) {
              console.error('[ADMIN FILHOS] Erro ao vincular filho existente:', err);
            } else {
              console.log('[ADMIN FILHOS] Filho vinculado com sucesso por ID:', filhoId);
            }
            processados++;
            if (processados === totalFilhos) {
              console.log('[ADMIN FILHOS] Todos os filhos processados. Enviando resposta.');
              return res.json({ mensagem: 'Usuário atualizado com sucesso' });
            }
          });
        return;
      }
    }

    // Se tem CPF, verificar se já existe cadastro
    if (filho.cpf) {
      const cpfLimpo = filho.cpf.replace(/\D/g, '');
      console.log('[ADMIN FILHOS] Verificando CPF do filho:', cpfLimpo);
      db.get('SELECT id FROM usuarios WHERE cpf = ?', [cpfLimpo], (err, filhoExistente) => {
        if (err) {
          console.error('Erro ao verificar CPF do filho:', err);
          processados++;
          if (processados === totalFilhos) {
            return res.json({ mensagem: 'Usuário atualizado com sucesso' });
          }
          return;
        }

        if (filhoExistente && filhoExistente.id !== usuarioId) {
          // CPF já existe, apenas vincular
          console.log('[ADMIN FILHOS] CPF encontrado, vinculando filho existente ID:', filhoExistente.id);
          db.run('INSERT OR IGNORE INTO relacionamentos (usuario_id, tipo, relacionado_id) VALUES (?, ?, ?)',
            [usuarioId, 'filho', filhoExistente.id], (err) => {
              if (err) {
                console.error('[ADMIN FILHOS] Erro ao vincular filho existente:', err);
              } else {
                console.log('[ADMIN FILHOS] Filho vinculado com sucesso por CPF, ID:', filhoExistente.id);
              }
              processados++;
              if (processados === totalFilhos) {
                console.log('[ADMIN FILHOS] Todos os filhos processados. Enviando resposta.');
                return res.json({ mensagem: 'Usuário atualizado com sucesso' });
              }
            });
        } else {
          // Criar novo usuário para o filho
          const nomeFilho = filho.nome_completo || filho.nome || 'Filho';
          console.log('[ADMIN FILHOS] Criando novo usuário para filho:', nomeFilho);
          bcrypt.hash('filho123', 10, (err, senhaHash) => {
            if (err) {
              console.error('Erro ao gerar hash da senha:', err);
              processados++;
              if (processados === totalFilhos) {
                return res.json({ mensagem: 'Usuário atualizado com sucesso' });
              }
              return;
            }

            db.run(`INSERT INTO usuarios (nome, nome_completo, email, cpf, telefone, senha, perfil_completo) 
                    VALUES (?, ?, ?, ?, ?, ?, false)`,
              [nomeFilho, filho.nome_completo || filho.nome || null, filho.email || null, cpfLimpo || null, filho.telefone || null, senhaHash],
              function(err) {
                if (err) {
                  console.error('Erro ao criar filho:', err);
                  processados++;
                  if (processados === totalFilhos) {
                    return res.json({ mensagem: 'Usuário atualizado com sucesso' });
                  }
                  return;
                }

                const novoFilhoId = this.lastID;
                console.log('[ADMIN FILHOS] Novo filho criado com ID:', novoFilhoId);
                db.run('INSERT INTO relacionamentos (usuario_id, tipo, relacionado_id) VALUES (?, ?, ?)',
                  [usuarioId, 'filho', novoFilhoId], (err) => {
                    if (err) {
                      console.error('[ADMIN FILHOS] Erro ao vincular filho:', err);
                    } else {
                      console.log('[ADMIN FILHOS] Filho vinculado com sucesso, ID:', novoFilhoId);
                    }
                    processados++;
                    if (processados === totalFilhos) {
                      console.log('[ADMIN FILHOS] Todos os filhos processados. Enviando resposta.');
                      return res.json({ mensagem: 'Usuário atualizado com sucesso' });
                    }
                  });
              });
          });
        }
      });
    } else {
      // Sem CPF, criar novo usuário
      const nomeFilho = filho.nome_completo || filho.nome || 'Filho';
      console.log('[ADMIN FILHOS] Criando novo usuário para filho sem CPF:', nomeFilho);
      bcrypt.hash('filho123', 10, (err, senhaHash) => {
        if (err) {
          console.error('Erro ao gerar hash da senha:', err);
          processados++;
          if (processados === totalFilhos) {
            return res.json({ mensagem: 'Usuário atualizado com sucesso' });
          }
          return;
        }

        db.run(`INSERT INTO usuarios (nome, nome_completo, email, telefone, senha, perfil_completo) 
                VALUES (?, ?, ?, ?, ?, false)`,
          [nomeFilho, filho.nome_completo || filho.nome || null, filho.email || null, filho.telefone || null, senhaHash],
          function(err) {
            if (err) {
              console.error('Erro ao criar filho:', err);
              processados++;
              if (processados === totalFilhos) {
                return res.json({ mensagem: 'Usuário atualizado com sucesso' });
              }
              return;
            }

            const novoFilhoId = this.lastID;
            console.log('[ADMIN FILHOS] Novo filho criado sem CPF, ID:', novoFilhoId);
            db.run('INSERT INTO relacionamentos (usuario_id, tipo, relacionado_id) VALUES (?, ?, ?)',
              [usuarioId, 'filho', novoFilhoId], (err) => {
                if (err) {
                  console.error('[ADMIN FILHOS] Erro ao vincular filho:', err);
                } else {
                  console.log('[ADMIN FILHOS] Filho vinculado com sucesso, ID:', novoFilhoId);
                }
                processados++;
                if (processados === totalFilhos) {
                  console.log('[ADMIN FILHOS] Todos os filhos processados. Enviando resposta.');
                  return res.json({ mensagem: 'Usuário atualizado com sucesso' });
                }
              });
          });
      });
    }
  });
}

// Função auxiliar para processar filhos
function processarFilhos(req, res, filhos) {
  console.log('[Backend] Processando filhos:', { 
    quantidade: filhos && Array.isArray(filhos) ? filhos.length : 0,
    filhos: filhos 
  });
  
  // Se não há filhos, remover relacionamentos de filhos antigos e retornar sucesso
  if (!filhos || !Array.isArray(filhos) || filhos.length === 0) {
    console.log('[Backend] Nenhum filho para processar. Removendo relacionamentos de filhos antigos.');
    // Remover todos os relacionamentos de filhos para este usuário
    db.run('DELETE FROM relacionamentos WHERE usuario_id = ? AND tipo = ?', 
      [req.user.id, 'filho'], (err) => {
        if (err) {
          console.error('[Backend] Erro ao remover filhos antigos:', err);
        } else {
          console.log('[Backend] Relacionamentos de filhos antigos removidos com sucesso.');
        }
        return res.json({ mensagem: 'Perfil atualizado com sucesso' });
      });
    return;
  }
  
  if (filhos && Array.isArray(filhos) && filhos.length > 0) {
    // Remover relacionamentos de filhos antigos
    db.run('DELETE FROM relacionamentos WHERE usuario_id = ? AND tipo = ?', 
      [req.user.id, 'filho'], (err) => {
        if (err) {
          console.error('Erro ao remover filhos antigos:', err);
        }
      });

    // Processar cada filho
    let processados = 0;
    const totalFilhos = filhos.length;

    filhos.forEach((filho) => {
            // Se tem ID e flag de vincular existente, apenas vincular
            if (filho.vincular_existente && filho.id) {
              db.run('INSERT OR IGNORE INTO relacionamentos (usuario_id, tipo, relacionado_id) VALUES (?, ?, ?)',
                [req.user.id, 'filho', filho.id], (err) => {
                  if (err) {
                    console.error('Erro ao vincular filho existente:', err);
                  }
                  processados++;
                  if (processados === totalFilhos) {
                    return res.json({ mensagem: 'Perfil atualizado com sucesso' });
                  }
                });
              return;
            }

            if (!filho.nome_completo || !filho.cpf) {
              processados++;
              if (processados === totalFilhos) {
                return res.json({ mensagem: 'Perfil atualizado com sucesso' });
              }
              return;
            }

            // Verificar se o CPF do filho já está em uso por outro usuário (exceto se for o próprio filho)
            db.get('SELECT id FROM usuarios WHERE cpf = ? AND id != ?', [filho.cpf, req.user.id], (err, cpfEmUso) => {
              if (err) {
                console.error('Erro ao verificar CPF do filho:', err);
                processados++;
                if (processados === totalFilhos) {
                  return res.json({ mensagem: 'Perfil atualizado com sucesso' });
                }
                return;
              }

              if (cpfEmUso) {
                // CPF já está em uso, verificar se é o mesmo filho que queremos vincular
                db.get('SELECT id FROM relacionamentos WHERE usuario_id = ? AND relacionado_id = ? AND tipo = ?',
                  [req.user.id, cpfEmUso.id, 'filho'], (err, jaVinculado) => {
                    if (err) {
                      console.error('Erro ao verificar vínculo:', err);
                      processados++;
                      if (processados === totalFilhos) {
                        return res.json({ mensagem: 'Perfil atualizado com sucesso' });
                      }
                      return;
                    }

                    if (jaVinculado) {
                      // Já está vinculado, apenas continuar
                      processados++;
                      if (processados === totalFilhos) {
                        return res.json({ mensagem: 'Perfil atualizado com sucesso' });
                      }
                      return;
                    } else {
                      // CPF já está em uso por outro usuário, apenas vincular
                      db.run('INSERT OR IGNORE INTO relacionamentos (usuario_id, tipo, relacionado_id) VALUES (?, ?, ?)',
                        [req.user.id, 'filho', cpfEmUso.id], (err) => {
                          if (err) {
                            console.error('Erro ao vincular filho existente:', err);
                          }
                          processados++;
                          if (processados === totalFilhos) {
                            return res.json({ mensagem: 'Perfil atualizado com sucesso' });
                          }
                        });
                      return;
                    }
                  });
                return;
              }

              // CPF não está em uso, verificar se já existe usuário com esse CPF (para vincular)
              db.get('SELECT id FROM usuarios WHERE cpf = ?', [filho.cpf], (err, usuarioExistente) => {
                if (err) {
                  console.error('Erro ao verificar filho:', err);
                  processados++;
                  if (processados === totalFilhos) {
                    return res.json({ mensagem: 'Perfil atualizado com sucesso' });
                  }
                  return;
                }

                if (usuarioExistente) {
                  // Filho já existe, apenas vincular
                  db.run('INSERT OR IGNORE INTO relacionamentos (usuario_id, tipo, relacionado_id) VALUES (?, ?, ?)',
                    [req.user.id, 'filho', usuarioExistente.id], (err) => {
                      if (err) {
                        console.error('Erro ao vincular filho existente:', err);
                      }
                      processados++;
                      if (processados === totalFilhos) {
                        return res.json({ mensagem: 'Perfil atualizado com sucesso' });
                      }
                    });
                } else {
                  // Criar novo usuário para o filho
                  bcrypt.hash('filho123', 10, (err, senhaHash) => {
                    if (err) {
                      console.error('Erro ao gerar hash da senha:', err);
                      processados++;
                      if (processados === totalFilhos) {
                        return res.json({ mensagem: 'Perfil atualizado com sucesso' });
                      }
                      return;
                    }

                    // Verificar se CPF já existe antes de criar
                    db.get('SELECT id FROM usuarios WHERE cpf = ?', [filho.cpf], (err, cpfExistente) => {
                      if (err) {
                        console.error('Erro ao verificar CPF antes de criar filho:', err);
                        processados++;
                        if (processados === totalFilhos) {
                          return res.json({ mensagem: 'Perfil atualizado com sucesso' });
                        }
                        return;
                      }

                      if (cpfExistente) {
                        // CPF já existe, apenas vincular
                        db.run('INSERT OR IGNORE INTO relacionamentos (usuario_id, tipo, relacionado_id) VALUES (?, ?, ?)',
                          [req.user.id, 'filho', cpfExistente.id], (err) => {
                            if (err) {
                              console.error('Erro ao vincular filho existente:', err);
                            }
                            processados++;
                            if (processados === totalFilhos) {
                              return res.json({ mensagem: 'Perfil atualizado com sucesso' });
                            }
                          });
                        return;
                      }

                      // CPF não existe, criar novo usuário
                      db.run(`INSERT INTO usuarios (nome, nome_completo, email, cpf, telefone, senha, perfil_completo) 
                              VALUES (?, ?, ?, ?, ?, ?, false)`,
                        [filho.nome_completo.split(' ')[0], filho.nome_completo, filho.email || null, 
                         filho.cpf, filho.telefone || null, senhaHash],
                        function(err) {
                          if (err) {
                            // Verificar se erro é por CPF duplicado
                            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                              console.error('CPF duplicado ao criar filho:', filho.cpf);
                              processados++;
                              if (processados === totalFilhos) {
                                return res.status(400).json({ erro: `CPF ${filho.cpf} já está cadastrado` });
                              }
                              return;
                            }
                            console.error('Erro ao criar filho:', err);
                            processados++;
                            if (processados === totalFilhos) {
                              return res.json({ mensagem: 'Perfil atualizado com sucesso' });
                            }
                            return;
                          }

                          // Vincular filho ao usuário
                          db.run('INSERT INTO relacionamentos (usuario_id, tipo, relacionado_id) VALUES (?, ?, ?)',
                            [req.user.id, 'filho', this.lastID], (err) => {
                              if (err) {
                                console.error('Erro ao vincular filho:', err);
                              }
                              processados++;
                              if (processados === totalFilhos) {
                                return res.json({ mensagem: 'Perfil atualizado com sucesso' });
                              }
                            });
                        });
                    });
                  });
                }
              });
            });
    });
  } else {
    res.json({ mensagem: 'Perfil atualizado com sucesso' });
  }
}

// Rota para buscar usuários por CPF, email ou ID (para vincular relacionamentos)
app.get('/api/usuarios/buscar', authenticateToken, (req, res) => {
  const cpf = req.query.cpf;
  const email = req.query.email;
  const id = req.query.id;

  console.log('Busca recebida - CPF:', cpf, 'Email:', email, 'ID:', id); // Debug

  // Se buscar por ID, processar primeiro
  if (id !== undefined && id !== null && id !== '') {
    const idNumero = parseInt(id);
    console.log('Processando busca por ID:', idNumero); // Debug
    
    if (isNaN(idNumero) || idNumero <= 0) {
      return res.status(400).json({ erro: 'ID inválido' });
    }

    const queryId = 'SELECT id, nome, nome_completo, email, cpf, telefone FROM usuarios WHERE id = ?';
    db.get(queryId, [idNumero], (err, row) => {
      if (err) {
        console.error('Erro ao buscar por ID:', err);
        return res.status(500).json({ erro: 'Erro ao buscar usuário' });
      }

      if (!row) {
        return res.status(404).json({ erro: 'Usuário não encontrado com este ID' });
      }

      // Não permitir vincular a si mesmo
      if (row.id == req.user.id) {
        return res.status(400).json({ erro: 'Não é possível vincular a si mesmo' });
      }

      console.log('Usuário encontrado por ID:', row); // Debug
      return res.json({ usuario: row });
    });
    return;
  }

  // Validação para CPF ou email
  if (!cpf && !email) {
    return res.status(400).json({ erro: 'Informe CPF, email ou ID para buscar' });
  }

  // Buscar por CPF ou email
  let query = 'SELECT id, nome, nome_completo, email, cpf, telefone FROM usuarios WHERE id != ?';
  let params = [req.user.id];

  if (cpf) {
    query += ' AND cpf = ?';
    params.push(cpf);
  } else if (email) {
    query += ' AND email = ?';
    params.push(email);
  }

  db.get(query, params, (err, row) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao buscar usuário' });
    }

    if (!row) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json({ usuario: row });
  });
});

// Rota para vincular relacionamento (cônjuge ou filho)
app.post('/api/relacionamentos', authenticateToken, (req, res) => {
  const { tipo, relacionado_id } = req.body;

  if (!tipo || !relacionado_id) {
    return res.status(400).json({ erro: 'Tipo e ID do relacionado são obrigatórios' });
  }

  if (!['conjuge', 'filho'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo deve ser "conjuge" ou "filho"' });
  }

  if (relacionado_id == req.user.id) {
    return res.status(400).json({ erro: 'Não é possível vincular a si mesmo' });
  }

  // Verificar se o relacionado existe
  db.get('SELECT id FROM usuarios WHERE id = ?', [relacionado_id], (err, row) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao verificar usuário' });
    }

    if (!row) {
      return res.status(404).json({ erro: 'Usuário relacionado não encontrado' });
    }

    // Verificar se já existe relacionamento
    db.get('SELECT id FROM relacionamentos WHERE usuario_id = ? AND relacionado_id = ? AND tipo = ?',
      [req.user.id, relacionado_id, tipo], (err, existing) => {
        if (err) {
          return res.status(500).json({ erro: 'Erro ao verificar relacionamento' });
        }

        if (existing) {
          return res.status(400).json({ erro: 'Relacionamento já existe' });
        }

        // Criar relacionamento
        db.run('INSERT INTO relacionamentos (usuario_id, tipo, relacionado_id) VALUES (?, ?, ?)',
          [req.user.id, tipo, relacionado_id], function(err) {
            if (err) {
              return res.status(500).json({ erro: 'Erro ao criar relacionamento' });
            }

            res.status(201).json({ mensagem: 'Relacionamento vinculado com sucesso' });
          }
        );
      }
    );
  });
});

// Rota para remover relacionamento
app.delete('/api/relacionamentos/:id', authenticateToken, (req, res) => {
  const relacionamentoId = req.params.id;

  db.run('DELETE FROM relacionamentos WHERE id = ? AND usuario_id = ?',
    [relacionamentoId, req.user.id], function(err) {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao remover relacionamento' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Relacionamento não encontrado' });
      }

      res.json({ mensagem: 'Relacionamento removido com sucesso' });
    }
  );
});

// Rota administrativa - Listar todos os usuários (apenas para ID 1)
// Rota para listar TODOS os perfis cadastrados (apenas admin)
// SEMPRE busca dados atualizados diretamente do SQL, ordenados por ID
app.get('/api/admin/usuarios', authenticateToken, (req, res) => {
  // Verificar se é admin (ID 1)
  if (req.user.id !== 1) {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem acessar esta área.' });
  }

  // SEMPRE buscar dados frescos do banco de dados SQL, ordenados por ID
  // Buscar todos os usuários com ocupação e igreja
  db.all(`SELECT u.id, u.nome, u.nome_completo, u.email, u.cpf, u.telefone, u.endereco, u.cep, 
          u.estado_civil, u.ocupacao_id, u.perfil_completo, u.criado_em, u.atualizado_em,
          a.nome as ocupacao_nome,
          i.nome as igreja_nome, i.id as igreja_id, im.funcao as igreja_funcao
          FROM usuarios u
          LEFT JOIN areas_servicos a ON u.ocupacao_id = a.id
          LEFT JOIN igreja_membros im ON u.id = im.usuario_id
          LEFT JOIN igrejas i ON im.igreja_id = i.id
          ORDER BY u.id ASC`, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar usuários do SQL:', err);
      return res.status(500).json({ erro: 'Erro ao buscar usuários' });
    }

    console.log(`[SQL] ${rows.length} perfis cadastrados buscados diretamente do banco de dados`);
    
    // Para cada usuário, buscar relacionamentos (filhos e cônjuge) diretamente do SQL
    const usuariosComRelacionamentos = [];
    let processados = 0;
    
    if (rows.length === 0) {
      return res.json({ usuarios: [] });
    }
    
    rows.forEach((usuario) => {
      // Buscar relacionamentos para este usuário
      db.all(`SELECT r.tipo, r.relacionado_id, 
              u_rel.nome, u_rel.nome_completo, u_rel.email, u_rel.cpf, u_rel.telefone
              FROM relacionamentos r
              JOIN usuarios u_rel ON r.relacionado_id = u_rel.id
              WHERE r.usuario_id = ?`, [usuario.id], (err, relacionamentos) => {
        if (err) {
          console.error(`Erro ao buscar relacionamentos para usuário ${usuario.id}:`, err);
          relacionamentos = [];
        }
        
        // Adicionar relacionamentos ao objeto do usuário
        usuario.relacionamentos = relacionamentos || [];
        
        // Contar filhos e cônjuge
        const filhos = (relacionamentos || []).filter(r => r.tipo === 'filho');
        const conjuge = (relacionamentos || []).find(r => r.tipo === 'conjuge');
        
        usuario.tem_filhos = filhos.length > 0;
        usuario.quantidade_filhos = filhos.length;
        usuario.tem_conjuge = !!conjuge;
        usuario.conjuge = conjuge || null;
        usuario.filhos = filhos;
        
        // Adicionar usuário à lista com relacionamentos já incluídos
        usuariosComRelacionamentos.push(usuario);
        
        processados++;
        
        // Quando todos os usuários foram processados, retornar resposta
        if (processados === rows.length) {
          // Ordenar por ID para garantir ordem correta
          usuariosComRelacionamentos.sort((a, b) => a.id - b.id);
          console.log(`[SQL] Todos os relacionamentos buscados do banco de dados`);
          res.json({ usuarios: usuariosComRelacionamentos });
        }
      });
    });
  });
});

// Rota para excluir usuário (apenas admin)
app.delete('/api/admin/usuarios/:id', authenticateToken, (req, res) => {
  // Verificar se é admin (ID 1)
  if (req.user.id !== 1) {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem acessar esta área.' });
  }

  const usuarioId = parseInt(req.params.id);

  // Não permitir excluir o próprio admin (ID 1)
  if (usuarioId === 1) {
    return res.status(400).json({ erro: 'Não é possível excluir o administrador principal' });
  }

  // Primeiro, excluir relacionamentos
  db.run('DELETE FROM relacionamentos WHERE usuario_id = ? OR relacionado_id = ?', 
    [usuarioId, usuarioId], (err) => {
      if (err) {
        console.error('Erro ao excluir relacionamentos:', err);
        return res.status(500).json({ erro: 'Erro ao excluir relacionamentos' });
      }

      // Excluir membros da igreja
      db.run('DELETE FROM igreja_membros WHERE usuario_id = ?', [usuarioId], (err) => {
        if (err) {
          console.error('Erro ao excluir membros da igreja:', err);
          return res.status(500).json({ erro: 'Erro ao excluir membros da igreja' });
        }

        // Excluir usuário
        db.run('DELETE FROM usuarios WHERE id = ?', [usuarioId], function(err) {
          if (err) {
            console.error('Erro ao excluir usuário:', err);
            return res.status(500).json({ erro: 'Erro ao excluir usuário' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
          }

          res.json({ mensagem: 'Usuário excluído permanentemente com sucesso' });
        });
      });
    }
  );
});

// Rota para buscar relacionamentos de um usuário (apenas admin)
app.get('/api/admin/usuarios/:id/relacionamentos', authenticateToken, (req, res) => {
  // Verificar se é admin (ID 1)
  if (req.user.id !== 1) {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem acessar esta área.' });
  }

  const usuarioId = parseInt(req.params.id);

  // Buscar relacionamentos
  db.all(`SELECT r.tipo, r.relacionado_id, u.nome, u.nome_completo, u.email, u.cpf, u.telefone
          FROM relacionamentos r
          JOIN usuarios u ON r.relacionado_id = u.id
          WHERE r.usuario_id = ?`, [usuarioId], (err, relacionamentos) => {
    if (err) {
      console.error('Erro ao buscar relacionamentos:', err);
      return res.status(500).json({ erro: 'Erro ao buscar relacionamentos' });
    }

    res.json({ relacionamentos: relacionamentos || [] });
  });
});

// Rota para atualizar usuário (apenas admin)
app.put('/api/admin/usuarios/:id', authenticateToken, (req, res) => {
  // Verificar se é admin (ID 1)
  if (req.user.id !== 1) {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem acessar esta área.' });
  }

  const usuarioId = parseInt(req.params.id);
  const { nome, nome_completo, email, cpf, telefone, endereco, cep, estado_civil, ocupacao_id, igreja_id, filhos } = req.body;

  console.log('[ADMIN UPDATE] Dados recebidos:', {
    usuarioId,
    nome,
    filhos: filhos ? (Array.isArray(filhos) ? filhos.length : 'não é array') : 'undefined',
    filhos_detalhes: filhos
  });

  // Validar ocupação se fornecida
  if (ocupacao_id) {
    db.get('SELECT id FROM areas_servicos WHERE id = ?', [ocupacao_id], (err, ocupacao) => {
      if (err || !ocupacao) {
        return res.status(400).json({ erro: 'Ocupação inválida' });
      }

      atualizarUsuario();
    });
  } else {
    atualizarUsuario();
  }

  function atualizarUsuario() {
    // Atualizar dados do usuário
    db.run(`UPDATE usuarios SET 
            nome = ?, nome_completo = ?, email = ?, cpf = ?, telefone = ?, 
            endereco = ?, cep = ?, estado_civil = ?, ocupacao_id = ?, 
            atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?`,
      [nome || null, nome_completo || null, email || null, cpf || null, 
       telefone || null, endereco || null, cep || null, estado_civil || null, 
       ocupacao_id || null, usuarioId],
      function(err) {
        if (err) {
          console.error('Erro ao atualizar usuário:', err);
          return res.status(500).json({ erro: 'Erro ao atualizar usuário' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        console.log('[ADMIN UPDATE] Usuário atualizado. Processando filhos e igreja:', {
          filhos_undefined: filhos === undefined,
          filhos_null: filhos === null,
          filhos_array: Array.isArray(filhos),
          filhos_length: Array.isArray(filhos) ? filhos.length : 'não é array',
          tem_igreja: !!igreja_id
        });

        // Função para processar igreja e depois filhos
        function processarIgrejaEFilhos() {
          // Atualizar vínculo com igreja
          if (igreja_id) {
          // Verificar se igreja existe
          db.get('SELECT id FROM igrejas WHERE id = ?', [igreja_id], (err, igreja) => {
            if (err || !igreja) {
              return res.status(400).json({ erro: 'Igreja inválida' });
            }

            // Verificar se já existe vínculo
            db.get('SELECT id FROM igreja_membros WHERE usuario_id = ?', [usuarioId], (err, existente) => {
              if (err) {
                console.error('Erro ao verificar vínculo:', err);
                return res.status(500).json({ erro: 'Erro ao verificar vínculo com igreja' });
              }

              if (existente) {
                // Atualizar vínculo existente
                db.run('UPDATE igreja_membros SET igreja_id = ? WHERE usuario_id = ?',
                  [igreja_id, usuarioId], (err) => {
                    if (err) {
                      console.error('Erro ao atualizar vínculo:', err);
                      return res.status(500).json({ erro: 'Erro ao atualizar vínculo com igreja' });
                    }

                    // Atualizar quantidade de membros nas igrejas afetadas
                    atualizarQuantidadeIgrejas();
                    // Processar filhos após atualizar igreja
                    if (filhos !== undefined) {
                      processarFilhosAdmin(req, res, filhos, usuarioId);
                    } else {
                      res.json({ mensagem: 'Usuário atualizado com sucesso' });
                    }
                  }
                );
              } else {
                // Criar novo vínculo
                db.run('INSERT INTO igreja_membros (igreja_id, usuario_id) VALUES (?, ?)',
                  [igreja_id, usuarioId], (err) => {
                    if (err) {
                      console.error('Erro ao criar vínculo:', err);
                      return res.status(500).json({ erro: 'Erro ao criar vínculo com igreja' });
                    }

                    atualizarQuantidadeIgrejas();
                    // Processar filhos após criar vínculo
                    if (filhos !== undefined) {
                      processarFilhosAdmin(req, res, filhos, usuarioId);
                    } else {
                      res.json({ mensagem: 'Usuário atualizado com sucesso' });
                    }
                  }
                );
              }
            });
          });
          } else {
            // Remover vínculo se igreja_id for null
            db.run('DELETE FROM igreja_membros WHERE usuario_id = ?', [usuarioId], (err) => {
              if (err) {
                console.error('Erro ao remover vínculo:', err);
              }
              atualizarQuantidadeIgrejas();
              // Processar filhos após remover vínculo
              if (filhos !== undefined) {
                processarFilhosAdmin(req, res, filhos, usuarioId);
              } else {
                res.json({ mensagem: 'Usuário atualizado com sucesso' });
              }
            });
          }
        }

        // Chamar função para processar igreja e filhos
        processarIgrejaEFilhos();
      }
    );
  }

  function atualizarQuantidadeIgrejas() {
    db.run('UPDATE igrejas SET quantidade_vinculados = (SELECT COUNT(*) FROM igreja_membros WHERE igreja_id = igrejas.id)');
  }
});

// Middleware para verificar se é admin
const isAdmin = (req, res, next) => {
  if (req.user.id !== 2) {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem acessar esta área.' });
  }
  next();
};

// ========== ROTAS DE IGREJAS ==========
// Listar todas as igrejas
app.get('/api/admin/igrejas', authenticateToken, isAdmin, (req, res) => {
  db.all(`SELECT i.*, 
          (SELECT COUNT(*) FROM igreja_membros WHERE igreja_id = i.id) as quantidade_vinculados
          FROM igrejas i ORDER BY nome`, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar igrejas:', err);
      return res.status(500).json({ erro: 'Erro ao buscar igrejas' });
    }
    res.json({ igrejas: rows });
  });
});

// Criar nova igreja
app.post('/api/admin/igrejas', authenticateToken, isAdmin, (req, res) => {
  const { nome, estado, descricao, quantidade_vinculados } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ erro: 'Nome da igreja é obrigatório' });
  }

  const quantidade = quantidade_vinculados ? parseInt(quantidade_vinculados) : 0;

  db.run('INSERT INTO igrejas (nome, estado, descricao, quantidade_vinculados) VALUES (?, ?, ?, ?)',
    [nome.trim(), estado ? estado.trim() : null, descricao ? descricao.trim() : null, quantidade],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ erro: 'Já existe uma igreja com este nome' });
        }
        console.error('Erro ao criar igreja:', err);
        return res.status(500).json({ erro: 'Erro ao criar igreja' });
      }
      res.json({ mensagem: 'Igreja criada com sucesso', id: this.lastID });
    }
  );
});

// Atualizar igreja
app.put('/api/admin/igrejas/:id', authenticateToken, isAdmin, (req, res) => {
  const { nome, estado, descricao, quantidade_vinculados } = req.body;
  const id = parseInt(req.params.id);

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ erro: 'Nome da igreja é obrigatório' });
  }

  const quantidade = quantidade_vinculados ? parseInt(quantidade_vinculados) : 0;

  db.run('UPDATE igrejas SET nome = ?, estado = ?, descricao = ?, quantidade_vinculados = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
    [nome.trim(), estado ? estado.trim() : null, descricao ? descricao.trim() : null, quantidade, id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ erro: 'Já existe uma igreja com este nome' });
        }
        console.error('Erro ao atualizar igreja:', err);
        return res.status(500).json({ erro: 'Erro ao atualizar igreja' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Igreja não encontrada' });
      }
      res.json({ mensagem: 'Igreja atualizada com sucesso' });
    }
  );
});

// Deletar igreja
app.delete('/api/admin/igrejas/:id', authenticateToken, isAdmin, (req, res) => {
  const id = parseInt(req.params.id);

  // Deletar membros primeiro
  db.run('DELETE FROM igreja_membros WHERE igreja_id = ?', [id], (err) => {
    if (err) {
      console.error('Erro ao deletar membros:', err);
    }
    
    // Deletar igreja
    db.run('DELETE FROM igrejas WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Erro ao deletar igreja:', err);
        return res.status(500).json({ erro: 'Erro ao deletar igreja' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Igreja não encontrada' });
      }
      res.json({ mensagem: 'Igreja deletada com sucesso' });
    });
  });
});

// Vincular membro à igreja
app.post('/api/admin/igrejas/:id/membros', authenticateToken, isAdmin, (req, res) => {
  const igrejaId = parseInt(req.params.id);
  const { usuario_id, funcao } = req.body;

  if (!usuario_id) {
    return res.status(400).json({ erro: 'ID do usuário é obrigatório' });
  }

  // Verificar se já existe vínculo
  db.get('SELECT id FROM igreja_membros WHERE igreja_id = ? AND usuario_id = ?', 
    [igrejaId, usuario_id], (err, existente) => {
      if (err) {
        console.error('Erro ao verificar membro:', err);
        return res.status(500).json({ erro: 'Erro ao vincular membro' });
      }

      if (existente) {
        // Atualizar função se já existe
        db.run('UPDATE igreja_membros SET funcao = ? WHERE id = ?',
          [funcao ? funcao.trim() : null, existente.id], (err) => {
            if (err) {
              console.error('Erro ao atualizar membro:', err);
              return res.status(500).json({ erro: 'Erro ao atualizar membro' });
            }
            res.json({ mensagem: 'Membro atualizado com sucesso', id: existente.id });
          });
      } else {
        // Criar novo vínculo
        db.run('INSERT INTO igreja_membros (igreja_id, usuario_id, funcao) VALUES (?, ?, ?)',
          [igrejaId, usuario_id, funcao ? funcao.trim() : null],
          function(err) {
            if (err) {
              console.error('Erro ao vincular membro:', err);
              return res.status(500).json({ erro: 'Erro ao vincular membro' });
            }
            
            // Atualizar quantidade de membros na igreja
            db.run('UPDATE igrejas SET quantidade_vinculados = (SELECT COUNT(*) FROM igreja_membros WHERE igreja_id = ?) WHERE id = ?',
              [igrejaId, igrejaId], (err) => {
                if (err) {
                  console.error('Erro ao atualizar quantidade:', err);
                }
              });
            
            res.json({ mensagem: 'Membro vinculado com sucesso', id: this.lastID });
          }
        );
      }
    }
  );
});

// Listar membros de uma igreja
app.get('/api/admin/igrejas/:id/membros', authenticateToken, isAdmin, (req, res) => {
  const igrejaId = parseInt(req.params.id);

  db.all(`SELECT im.*, u.nome, u.nome_completo, u.email, u.cpf 
          FROM igreja_membros im
          JOIN usuarios u ON im.usuario_id = u.id
          WHERE im.igreja_id = ?`, [igrejaId], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar membros:', err);
      return res.status(500).json({ erro: 'Erro ao buscar membros' });
    }
    res.json({ membros: rows });
  });
});

// Remover membro da igreja
app.delete('/api/admin/igrejas/:id/membros/:membroId', authenticateToken, isAdmin, (req, res) => {
  const igrejaId = parseInt(req.params.id);
  const membroId = parseInt(req.params.membroId);

  db.run('DELETE FROM igreja_membros WHERE igreja_id = ? AND id = ?', [igrejaId, membroId], function(err) {
    if (err) {
      console.error('Erro ao remover membro:', err);
      return res.status(500).json({ erro: 'Erro ao remover membro' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ erro: 'Membro não encontrado' });
    }
    
    // Atualizar quantidade de membros na igreja
    db.run('UPDATE igrejas SET quantidade_vinculados = (SELECT COUNT(*) FROM igreja_membros WHERE igreja_id = ?) WHERE id = ?',
      [igrejaId, igrejaId], (err) => {
        if (err) {
          console.error('Erro ao atualizar quantidade:', err);
        }
      });
    
    res.json({ mensagem: 'Membro removido com sucesso' });
  });
});

// ========== ROTAS PÚBLICAS ==========
// Listar todas as ocupações (pública para cadastro)
app.get('/api/ocupacoes', (req, res) => {
  db.all('SELECT id, nome, descricao FROM areas_servicos ORDER BY nome', [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar ocupações:', err);
      return res.status(500).json({ erro: 'Erro ao buscar ocupações' });
    }
    res.json({ ocupacoes: rows });
  });
});

// Listar todas as igrejas (pública para cadastro)
app.get('/api/igrejas-publicas', (req, res) => {
  db.all('SELECT id, nome, estado FROM igrejas ORDER BY nome', [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar igrejas:', err);
      return res.status(500).json({ erro: 'Erro ao buscar igrejas' });
    }
    res.json({ igrejas: rows });
  });
});

// ========== ROTAS DE ÁREAS/SERVIÇOS ==========

// Listar todas as áreas/serviços (admin)
app.get('/api/admin/areas-servicos', authenticateToken, isAdmin, (req, res) => {
  db.all(`SELECT a.*, 
          (SELECT COUNT(*) FROM usuarios WHERE ocupacao_id = a.id) as quantidade_vinculados
          FROM areas_servicos a ORDER BY tipo, nome`, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar áreas/serviços:', err);
      return res.status(500).json({ erro: 'Erro ao buscar áreas/serviços' });
    }
    res.json({ areas_servicos: rows });
  });
});

// Criar nova área/serviço
app.post('/api/admin/areas-servicos', authenticateToken, isAdmin, (req, res) => {
  const { nome, descricao, tipo } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }

  const tipoValido = tipo === 'area' || tipo === 'servico' ? tipo : 'area';

  db.run('INSERT INTO areas_servicos (nome, descricao, tipo) VALUES (?, ?, ?)',
    [nome.trim(), descricao ? descricao.trim() : null, tipoValido],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ erro: 'Já existe uma área/serviço com este nome' });
        }
        console.error('Erro ao criar área/serviço:', err);
        return res.status(500).json({ erro: 'Erro ao criar área/serviço' });
      }
      res.json({ mensagem: 'Área/Serviço criado com sucesso', id: this.lastID });
    }
  );
});

// Atualizar área/serviço
app.put('/api/admin/areas-servicos/:id', authenticateToken, isAdmin, (req, res) => {
  const { nome, descricao, tipo } = req.body;
  const id = parseInt(req.params.id);

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }

  const tipoValido = tipo === 'area' || tipo === 'servico' ? tipo : 'area';

  db.run('UPDATE areas_servicos SET nome = ?, descricao = ?, tipo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
    [nome.trim(), descricao ? descricao.trim() : null, tipoValido, id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ erro: 'Já existe uma área/serviço com este nome' });
        }
        console.error('Erro ao atualizar área/serviço:', err);
        return res.status(500).json({ erro: 'Erro ao atualizar área/serviço' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Área/Serviço não encontrado' });
      }
      res.json({ mensagem: 'Área/Serviço atualizado com sucesso' });
    }
  );
});

// Deletar área/serviço
app.delete('/api/admin/areas-servicos/:id', authenticateToken, isAdmin, (req, res) => {
  const id = parseInt(req.params.id);

  db.run('DELETE FROM areas_servicos WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Erro ao deletar área/serviço:', err);
      return res.status(500).json({ erro: 'Erro ao deletar área/serviço' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ erro: 'Área/Serviço não encontrado' });
    }
    res.json({ mensagem: 'Área/Serviço deletado com sucesso' });
  });
});

// Rota para servir o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== FUNÇÕES AUXILIARES ==========

// Função para gerar código único para programação (PRG-YYYY-XXX)
function gerarCodigoProgramacao(callback) {
  const ano = new Date().getFullYear();
  const prefixo = `PRG-${ano}-`;
  
  // Buscar o último código do ano
  db.get(`SELECT codigo FROM programacoes WHERE codigo LIKE ? ORDER BY codigo DESC LIMIT 1`, 
    [`${prefixo}%`], 
    (err, row) => {
      if (err) {
        console.error('Erro ao buscar último código:', err);
        // Se houver erro, retornar código padrão
        return callback(`${prefixo}001`);
      }
      
      if (!row || !row.codigo) {
        // Primeiro código do ano
        return callback(`${prefixo}001`);
      }
      
      // Extrair número do código (últimos 3 dígitos)
      const ultimoNumero = parseInt(row.codigo.slice(-3)) || 0;
      const proximoNumero = (ultimoNumero + 1).toString().padStart(3, '0');
      
      callback(`${prefixo}${proximoNumero}`);
    }
  );
}

// Iniciar servidor
// ========== ROTAS DE PROGRAMAÇÕES E EVENTOS ==========

// Verificar programações existentes por data (para validação antes de criar)
// Verifica APENAS por data, independente de igreja, hora, título, etc.
app.get('/api/programacoes/verificar-conflito', authenticateToken, (req, res) => {
  const { data_evento } = req.query;
  
  if (!data_evento) {
    return res.status(400).json({ erro: 'Data do evento é obrigatória' });
  }
  
  // Garantir formato YYYY-MM-DD
  const dataFormatada = data_evento.split('T')[0].split(' ')[0].trim();
  
  // Buscar TODAS as programações no mesmo dia, independente de qualquer outro critério
  const query = `SELECT p.id, p.titulo, p.descricao, 
                strftime('%Y-%m-%d', p.data_evento) as data_evento,
                CASE WHEN p.data_fim_evento IS NOT NULL THEN strftime('%Y-%m-%d', p.data_fim_evento) ELSE NULL END as data_fim_evento,
                p.hora_evento, p.local_evento, p.igreja_id, p.codigo,
                i.nome as igreja_nome
                FROM programacoes p
                LEFT JOIN igrejas i ON p.igreja_id = i.id
                WHERE strftime('%Y-%m-%d', p.data_evento) = ?
                ORDER BY p.hora_evento ASC`;
  
  db.all(query, [dataFormatada], (err, rows) => {
    if (err) {
      console.error('Erro ao verificar conflito:', err);
      return res.status(500).json({ erro: 'Erro ao verificar programações existentes' });
    }
    
    res.json({ programacoes: rows || [] });
  });
});

// Listar programações aprovadas (ACESSÍVEL A TODOS OS USUÁRIOS LOGADOS - não apenas admin)
// Todos os usuários cadastrados podem ver as programações aprovadas no calendário e na lista
app.get('/api/programacoes', authenticateToken, (req, res) => {
  const { mes, ano } = req.query;
  
  // Retornar data_evento EXATAMENTE como está no banco SQLite (sem conversões)
  // Usar strftime para garantir formato YYYY-MM-DD puro, sem hora/timezone
  let query = `SELECT p.id, p.titulo, p.descricao, 
                strftime('%Y-%m-%d', p.data_evento) as data_evento,
                CASE WHEN p.data_fim_evento IS NOT NULL THEN strftime('%Y-%m-%d', p.data_fim_evento) ELSE NULL END as data_fim_evento,
                p.hora_evento, p.local_evento, p.igreja_id, 
                p.criado_por, p.aprovado_por, p.observacoes, p.codigo,
                p.criado_em, p.atualizado_em,
                u.id as criado_por_id,
                u.nome as criado_por_nome,
                u.nome_completo as criado_por_nome_completo,
                a.nome as criado_por_ocupacao,
                i.nome as igreja_nome
                FROM programacoes p
                LEFT JOIN usuarios u ON p.criado_por = u.id
                LEFT JOIN igrejas i ON p.igreja_id = i.id
                LEFT JOIN areas_servicos a ON u.ocupacao_id = a.id
                WHERE 1=1`;
  const params = [];
  
  if (mes && ano) {
    // Filtrar por mês e ano usando strftime diretamente na coluna data_evento
    // Isso garante que comparamos com a data exata do banco
    query += ` AND (strftime('%m', p.data_evento) = ? AND strftime('%Y', p.data_evento) = ?)`;
    params.push(mes.padStart(2, '0'), ano);
  }
  
  // Adicionar filtros opcionais
  if (req.query.igreja_id) {
    query += ` AND p.igreja_id = ?`;
    params.push(req.query.igreja_id);
  }
  
  if (req.query.codigo) {
    query += ` AND p.codigo LIKE ?`;
    params.push(`%${req.query.codigo}%`);
  }
  
  if (req.query.titulo) {
    query += ` AND p.titulo LIKE ?`;
    params.push(`%${req.query.titulo}%`);
  }
  
  query += ` ORDER BY data_evento ASC, hora_evento ASC`;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Erro ao buscar programações:', err);
      return res.status(500).json({ erro: 'Erro ao buscar programações' });
    }
    
    // Para cada programação, buscar membros vinculados
    if (rows.length === 0) {
      return res.json({ programacoes: [] });
    }
    
    let programacoesProcessadas = 0;
    const programacoesComMembros = [];
    
    rows.forEach((prog) => {
      db.all(`SELECT pm.*, u.id as usuario_id, u.nome, u.nome_completo, u.email, u.telefone
              FROM programacao_membros pm
              JOIN usuarios u ON pm.usuario_id = u.id
              WHERE pm.programacao_id = ?`, [prog.id], (err, membros) => {
        if (err) {
          console.error('Erro ao buscar membros:', err);
          membros = [];
        }
        
        prog.membros_vinculados = membros || [];
        programacoesComMembros.push(prog);
        
        programacoesProcessadas++;
        if (programacoesProcessadas === rows.length) {
          res.json({ programacoes: programacoesComMembros });
        }
      });
    });
  });
});

// Criar programação (apenas admin)
app.post('/api/programacoes', authenticateToken, (req, res) => {
  if (req.user.id !== 1) {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem criar programações.' });
  }
  
  const { titulo, descricao, data_evento, data_fim_evento, hora_evento, local_evento, igreja_id, membros_vinculados, observacoes } = req.body;
  
  if (!titulo || !data_evento) {
    return res.status(400).json({ erro: 'Título e data do evento são obrigatórios' });
  }
  
  // Log para debug - verificar data recebida
  console.log('[Backend] Criar programação - Data recebida:', { data_evento, data_fim_evento, titulo });
  
  // Garantir que a data está no formato YYYY-MM-DD (sem hora/timezone)
  // O frontend já envia nesse formato, mas vamos garantir
  const dataEventoFormatada = data_evento.split('T')[0].split(' ')[0].trim();
  const dataFimFormatada = data_fim_evento ? data_fim_evento.split('T')[0].split(' ')[0].trim() : null;
  
  console.log('[Backend] Data formatada para salvar:', { dataEventoFormatada, dataFimFormatada });
  
  // Determinar local_evento: se igreja_id foi selecionado, buscar nome da igreja, senão usar local_evento texto
  let localFinal = local_evento || null;
  let igrejaIdFinal = igreja_id ? parseInt(igreja_id) : null;
  
  if (igrejaIdFinal) {
    db.get('SELECT nome FROM igrejas WHERE id = ?', [igrejaIdFinal], (err, igreja) => {
      if (err) {
        console.error('Erro ao buscar igreja:', err);
        igrejaIdFinal = null;
      } else if (igreja) {
        localFinal = igreja.nome;
      }
      
      // Gerar código e inserir programação
      gerarCodigoProgramacao((codigo) => {
        db.run(`INSERT INTO programacoes (codigo, titulo, descricao, data_evento, data_fim_evento, hora_evento, local_evento, igreja_id, criado_por, aprovado_por, observacoes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [codigo, titulo.trim(), descricao ? descricao.trim() : null, dataEventoFormatada, dataFimFormatada, hora_evento || null, localFinal, igrejaIdFinal, req.user.id, req.user.id, observacoes ? observacoes.trim() : null],
          function(err) {
            if (err) {
              console.error('Erro ao criar programação:', err);
              return res.status(500).json({ erro: 'Erro ao criar programação: ' + err.message });
            }
            
            const programacaoId = this.lastID;
            
            // Vincular membros se fornecidos
            if (membros_vinculados && Array.isArray(membros_vinculados) && membros_vinculados.length > 0) {
            let membrosProcessados = 0;
            let membrosErro = false;
            
            membros_vinculados.forEach((membro) => {
              const usuarioId = parseInt(membro.usuario_id);
              const horaEspecifica = membro.hora_especifica || null;
              
              if (isNaN(usuarioId)) {
                console.error('ID de usuário inválido:', membro.usuario_id);
                membrosProcessados++;
                if (membrosProcessados === membros_vinculados.length && !membrosErro) {
                  res.json({ mensagem: 'Programação criada com sucesso (alguns membros não puderam ser vinculados)', id: programacaoId });
                }
                return;
              }
              
              db.run(`INSERT INTO programacao_membros (programacao_id, usuario_id, hora_especifica)
                      VALUES (?, ?, ?)`,
                [programacaoId, usuarioId, horaEspecifica],
                (err) => {
                  if (err) {
                    console.error('Erro ao vincular membro:', err);
                    membrosErro = true;
                  }
                  membrosProcessados++;
                  if (membrosProcessados === membros_vinculados.length) {
                    if (membrosErro) {
                      res.json({ mensagem: 'Programação criada com sucesso (alguns membros não puderam ser vinculados)', id: programacaoId, codigo: codigo });
                    } else {
                      res.json({ mensagem: 'Programação criada com sucesso', id: programacaoId, codigo: codigo });
                    }
                  }
                }
              );
            });
          } else {
            res.json({ mensagem: 'Programação criada com sucesso', id: programacaoId, codigo: codigo });
          }
        }
      );
      });
    });
  } else {
    // Sem igreja selecionada, gerar código e inserir diretamente
    gerarCodigoProgramacao((codigo) => {
      db.run(`INSERT INTO programacoes (codigo, titulo, descricao, data_evento, data_fim_evento, hora_evento, local_evento, igreja_id, criado_por, aprovado_por, observacoes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [codigo, titulo.trim(), descricao ? descricao.trim() : null, dataEventoFormatada, dataFimFormatada, hora_evento || null, localFinal, null, req.user.id, req.user.id, observacoes ? observacoes.trim() : null],
        function(err) {
                  if (err) {
                    console.error('Erro ao criar programação:', err);
                    return res.status(500).json({ erro: 'Erro ao criar programação: ' + err.message });
                  }
                  
                  const programacaoId = this.lastID;
                  
                  // Vincular membros se fornecidos
                  if (membros_vinculados && Array.isArray(membros_vinculados) && membros_vinculados.length > 0) {
          let membrosProcessados = 0;
          let membrosErro = false;
          
          membros_vinculados.forEach((membro) => {
            const usuarioId = parseInt(membro.usuario_id);
            const horaEspecifica = membro.hora_especifica || null;
            
            if (isNaN(usuarioId)) {
              console.error('ID de usuário inválido:', membro.usuario_id);
              membrosProcessados++;
              if (membrosProcessados === membros_vinculados.length && !membrosErro) {
                res.json({ mensagem: 'Programação criada com sucesso (alguns membros não puderam ser vinculados)', id: programacaoId, codigo: codigo });
              }
              return;
            }
            
            db.run(`INSERT INTO programacao_membros (programacao_id, usuario_id, hora_especifica)
                    VALUES (?, ?, ?)`,
              [programacaoId, usuarioId, horaEspecifica],
              (err) => {
                if (err) {
                  console.error('Erro ao vincular membro:', err);
                  membrosErro = true;
                }
                membrosProcessados++;
                if (membrosProcessados === membros_vinculados.length) {
                  if (membrosErro) {
                    res.json({ mensagem: 'Programação criada com sucesso (alguns membros não puderam ser vinculados)', id: programacaoId, codigo: codigo });
                  } else {
                    res.json({ mensagem: 'Programação criada com sucesso', id: programacaoId, codigo: codigo });
                  }
                }
              }
            );
          });
        } else {
          res.json({ mensagem: 'Programação criada com sucesso', id: programacaoId, codigo: codigo });
        }
      }
    );
    });
  }
});

// Criar solicitação de evento (usuário comum)
app.post('/api/solicitacoes-eventos', authenticateToken, (req, res) => {
  const { titulo, descricao, data_evento, data_fim_evento, hora_evento, local_evento, igreja_id, observacoes } = req.body;
  
  if (!titulo || !data_evento) {
    return res.status(400).json({ erro: 'Título e data do evento são obrigatórios' });
  }
  
  // Garantir que a data está no formato YYYY-MM-DD (sem hora/timezone)
  const dataEventoFormatada = data_evento.split('T')[0].split(' ')[0].trim();
  const dataFimFormatada = data_fim_evento ? data_fim_evento.split('T')[0].split(' ')[0].trim() : null;
  
  console.log('[Backend] Criar solicitação - Data formatada:', { dataEventoFormatada, dataFimFormatada, titulo });
  
  // Determinar local_evento: se igreja_id foi selecionado, buscar nome da igreja, senão usar local_evento texto
  let localFinal = local_evento || null;
  let igrejaIdFinal = igreja_id ? parseInt(igreja_id) : null;
  
  if (igrejaIdFinal) {
    db.get('SELECT nome FROM igrejas WHERE id = ?', [igrejaIdFinal], (err, igreja) => {
      if (err) {
        console.error('Erro ao buscar igreja:', err);
        igrejaIdFinal = null;
      } else if (igreja) {
        localFinal = igreja.nome;
      }
      
      db.run(`INSERT INTO solicitacoes_eventos (titulo, descricao, data_evento, data_fim_evento, hora_evento, local_evento, igreja_id, solicitado_por, status, observacoes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
        [titulo.trim(), descricao ? descricao.trim() : null, dataEventoFormatada, dataFimFormatada, hora_evento || null, localFinal, igrejaIdFinal, req.user.id, observacoes ? observacoes.trim() : null],
        function(err) {
          if (err) {
            console.error('Erro ao criar solicitação:', err);
            return res.status(500).json({ erro: 'Erro ao criar solicitação de evento: ' + err.message });
          }
          res.json({ mensagem: 'Solicitação enviada com sucesso. Aguardando aprovação do administrador.', id: this.lastID });
        }
      );
    });
  } else {
    db.run(`INSERT INTO solicitacoes_eventos (titulo, descricao, data_evento, data_fim_evento, hora_evento, local_evento, igreja_id, solicitado_por, status, observacoes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
      [titulo.trim(), descricao ? descricao.trim() : null, dataEventoFormatada, dataFimFormatada, hora_evento || null, localFinal, null, req.user.id, observacoes ? observacoes.trim() : null],
      function(err) {
        if (err) {
          console.error('Erro ao criar solicitação:', err);
          return res.status(500).json({ erro: 'Erro ao criar solicitação de evento: ' + err.message });
        }
        res.json({ mensagem: 'Solicitação enviada com sucesso. Aguardando aprovação do administrador.', id: this.lastID });
      }
    );
  }
});

// Listar solicitações
// Admin: vê todas as solicitações pendentes
// Usuário comum: vê apenas suas próprias solicitações (pendentes, aprovadas, rejeitadas)
app.get('/api/solicitacoes-eventos', authenticateToken, (req, res) => {
  const { status, minhas } = req.query;
  
  let query = `SELECT s.*, u.id as solicitado_por_id, u.nome as solicitado_por_nome, u.nome_completo as solicitado_por_nome_completo, u.email as solicitado_por_email, u.telefone as solicitado_por_telefone, i.nome as igreja_nome
               FROM solicitacoes_eventos s
               LEFT JOIN usuarios u ON s.solicitado_por = u.id
               LEFT JOIN igrejas i ON s.igreja_id = i.id
               WHERE 1=1`;
  const params = [];
  
  if (req.user.id === 1) {
    // Admin: ver todas as solicitações pendentes (ou status especificado)
    if (status) {
      query += ` AND s.status = ?`;
      params.push(status);
    } else {
      query += ` AND s.status = 'pendente'`;
    }
  } else {
    // Usuário comum: ver apenas suas próprias solicitações
    query += ` AND s.solicitado_por = ?`;
    params.push(req.user.id);
    
    // Se minhas=true, retornar todas (pendentes, aprovadas, rejeitadas)
    // Se não especificado, retornar todas também para o usuário ver o status
    if (status) {
      query += ` AND s.status = ?`;
      params.push(status);
    }
  }
  
  query += ` ORDER BY s.criado_em DESC`;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Erro ao buscar solicitações:', err);
      return res.status(500).json({ erro: 'Erro ao buscar solicitações' });
    }
    res.json({ solicitacoes: rows || [] });
  });
});

// Aprovar solicitação (apenas admin)
app.put('/api/solicitacoes-eventos/:id/aprovar', authenticateToken, (req, res) => {
  if (req.user.id !== 1) {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem aprovar solicitações.' });
  }
  
  const solicitacaoId = parseInt(req.params.id);
  const { observacoes } = req.body;
  
  // Buscar solicitação
  db.get('SELECT * FROM solicitacoes_eventos WHERE id = ?', [solicitacaoId], (err, solicitacao) => {
    if (err) {
      console.error('Erro ao buscar solicitação:', err);
      return res.status(500).json({ erro: 'Erro ao buscar solicitação' });
    }
    
    if (!solicitacao) {
      return res.status(404).json({ erro: 'Solicitação não encontrada' });
    }
    
    if (solicitacao.status !== 'pendente') {
      return res.status(400).json({ erro: 'Solicitação já foi processada' });
    }
    
    // Atualizar status da solicitação
    db.run(`UPDATE solicitacoes_eventos 
            SET status = 'aprovado', aprovado_por = ?, observacoes = ?, atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?`,
      [req.user.id, observacoes || null, solicitacaoId],
      (err) => {
        if (err) {
          console.error('Erro ao aprovar solicitação:', err);
          return res.status(500).json({ erro: 'Erro ao aprovar solicitação' });
        }
        
        // Gerar código e criar programação aprovada (incluir observacoes da solicitação)
        // Garantir que as datas estão no formato YYYY-MM-DD (sem hora/timezone)
        const dataEventoSolicitacao = solicitacao.data_evento ? solicitacao.data_evento.split('T')[0].split(' ')[0].trim() : null;
        const dataFimSolicitacao = solicitacao.data_fim_evento ? solicitacao.data_fim_evento.split('T')[0].split(' ')[0].trim() : null;
        
        gerarCodigoProgramacao((codigo) => {
          db.run(`INSERT INTO programacoes (codigo, titulo, descricao, data_evento, data_fim_evento, hora_evento, local_evento, igreja_id, criado_por, aprovado_por, observacoes)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [codigo, solicitacao.titulo, solicitacao.descricao, dataEventoSolicitacao, dataFimSolicitacao, solicitacao.hora_evento, solicitacao.local_evento, solicitacao.igreja_id || null, solicitacao.solicitado_por, req.user.id, solicitacao.observacoes || null],
            function(err) {
              if (err) {
                console.error('Erro ao criar programação:', err);
                return res.status(500).json({ erro: 'Erro ao criar programação aprovada' });
              }
              res.json({ mensagem: 'Solicitação aprovada e programação criada com sucesso', id: this.lastID, codigo: codigo });
            }
          );
        });
      }
    );
  });
});

// Rejeitar solicitação (apenas admin)
app.put('/api/solicitacoes-eventos/:id/rejeitar', authenticateToken, (req, res) => {
  if (req.user.id !== 1) {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem rejeitar solicitações.' });
  }
  
  const solicitacaoId = parseInt(req.params.id);
  const { observacoes } = req.body;
  
  db.run(`UPDATE solicitacoes_eventos 
          SET status = 'rejeitado', aprovado_por = ?, observacoes = ?, atualizado_em = CURRENT_TIMESTAMP
          WHERE id = ?`,
    [req.user.id, observacoes || null, solicitacaoId],
    function(err) {
      if (err) {
        console.error('Erro ao rejeitar solicitação:', err);
        return res.status(500).json({ erro: 'Erro ao rejeitar solicitação' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Solicitação não encontrada' });
      }
      
      res.json({ mensagem: 'Solicitação rejeitada com sucesso' });
    }
  );
});

// Listar aniversariantes do mês (público para todos os usuários logados)
app.get('/api/aniversariantes', authenticateToken, (req, res) => {
  const { mes } = req.query;
  const mesAtual = mes || new Date().getMonth() + 1;
  
  db.all(`SELECT id, nome, nome_completo, data_nascimento, email, telefone
          FROM usuarios
          WHERE data_nascimento IS NOT NULL
          AND strftime('%m', data_nascimento) = ?
          ORDER BY strftime('%d', data_nascimento) ASC`,
    [mesAtual.toString().padStart(2, '0')],
    (err, rows) => {
      if (err) {
        console.error('Erro ao buscar aniversariantes:', err);
        return res.status(500).json({ erro: 'Erro ao buscar aniversariantes' });
      }
      res.json({ aniversariantes: rows || [] });
    }
  );
});

// Deletar programação (apenas admin)
app.delete('/api/programacoes/:id', authenticateToken, (req, res) => {
  if (req.user.id !== 1) {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem deletar programações.' });
  }
  
  const programacaoId = parseInt(req.params.id);
  
  db.run('DELETE FROM programacoes WHERE id = ?', [programacaoId], function(err) {
    if (err) {
      console.error('Erro ao deletar programação:', err);
      return res.status(500).json({ erro: 'Erro ao deletar programação' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ erro: 'Programação não encontrada' });
    }
    
    res.json({ mensagem: 'Programação deletada com sucesso' });
  });
});

// ========== ROTAS DE CONFIRMAÇÃO DE PRESENÇA ==========

// Confirmar presença em uma programação
app.post('/api/programacoes/:id/confirmar-presenca', authenticateToken, (req, res) => {
  const programacaoId = parseInt(req.params.id);
  const usuarioId = req.user.id;
  
  // Verificar se a programação existe
  db.get('SELECT id, criado_por, data_evento, data_fim_evento FROM programacoes WHERE id = ?', [programacaoId], (err, programacao) => {
    if (err) {
      console.error('Erro ao buscar programação:', err);
      return res.status(500).json({ erro: 'Erro ao buscar programação' });
    }
    
    if (!programacao) {
      return res.status(404).json({ erro: 'Programação não encontrada' });
    }
    
    // Verificar se programação já terminou (exceto para admin ou criador)
    if (usuarioId !== 1 && usuarioId !== programacao.criado_por) {
      const hoje = new Date().toISOString().split('T')[0];
      const dataFim = programacao.data_fim_evento || programacao.data_evento;
      if (dataFim < hoje) {
        return res.status(400).json({ erro: 'Esta programação já terminou. Confirmações não podem ser alteradas.' });
      }
    }
    
    // Verificar se já existe confirmação
    db.get('SELECT id FROM confirmacoes_presenca WHERE programacao_id = ? AND usuario_id = ?', 
      [programacaoId, usuarioId], 
      (err, confirmacaoExistente) => {
        if (err) {
          console.error('Erro ao verificar confirmação:', err);
          return res.status(500).json({ erro: 'Erro ao verificar confirmação' });
        }
        
        if (confirmacaoExistente) {
          // Atualizar confirmação existente
          db.run(`UPDATE confirmacoes_presenca 
                  SET status = 'presente', justificativa = NULL, atualizado_em = CURRENT_TIMESTAMP
                  WHERE programacao_id = ? AND usuario_id = ?`,
            [programacaoId, usuarioId],
            function(err) {
              if (err) {
                console.error('Erro ao confirmar presença:', err);
                return res.status(500).json({ erro: 'Erro ao confirmar presença' });
              }
              res.json({ mensagem: 'Presença confirmada com sucesso', id: confirmacaoExistente.id });
            }
          );
        } else {
          // Inserir nova confirmação
          db.run(`INSERT INTO confirmacoes_presenca 
                  (programacao_id, usuario_id, status, justificativa, atualizado_em)
                  VALUES (?, ?, 'presente', NULL, CURRENT_TIMESTAMP)`,
            [programacaoId, usuarioId],
            function(err) {
              if (err) {
                console.error('Erro ao confirmar presença:', err);
                return res.status(500).json({ erro: 'Erro ao confirmar presença' });
              }
              res.json({ mensagem: 'Presença confirmada com sucesso', id: this.lastID });
            }
          );
        }
      }
    );
  });
});

// Cancelar presença (ausente) em uma programação
app.put('/api/programacoes/:id/cancelar-presenca', authenticateToken, (req, res) => {
  const programacaoId = parseInt(req.params.id);
  const usuarioId = req.user.id;
  const { justificativa } = req.body;
  
  // Verificar se a programação existe
  db.get('SELECT id, criado_por, data_evento, data_fim_evento FROM programacoes WHERE id = ?', [programacaoId], (err, programacao) => {
    if (err) {
      console.error('Erro ao buscar programação:', err);
      return res.status(500).json({ erro: 'Erro ao buscar programação' });
    }
    
    if (!programacao) {
      return res.status(404).json({ erro: 'Programação não encontrada' });
    }
    
    // Verificar se programação já terminou (exceto para admin ou criador)
    if (usuarioId !== 1 && usuarioId !== programacao.criado_por) {
      const hoje = new Date().toISOString().split('T')[0];
      const dataFim = programacao.data_fim_evento || programacao.data_evento;
      if (dataFim < hoje) {
        return res.status(400).json({ erro: 'Esta programação já terminou. Confirmações não podem ser alteradas.' });
      }
    }
    
    // Verificar se já existe confirmação
    db.get('SELECT id FROM confirmacoes_presenca WHERE programacao_id = ? AND usuario_id = ?', 
      [programacaoId, usuarioId], 
      (err, confirmacaoExistente) => {
        if (err) {
          console.error('Erro ao verificar confirmação:', err);
          return res.status(500).json({ erro: 'Erro ao verificar confirmação' });
        }
        
        if (confirmacaoExistente) {
          // Atualizar confirmação existente
          db.run(`UPDATE confirmacoes_presenca 
                  SET status = 'ausente', justificativa = ?, atualizado_em = CURRENT_TIMESTAMP
                  WHERE programacao_id = ? AND usuario_id = ?`,
            [justificativa || null, programacaoId, usuarioId],
            function(err) {
              if (err) {
                console.error('Erro ao cancelar presença:', err);
                return res.status(500).json({ erro: 'Erro ao cancelar presença' });
              }
              res.json({ mensagem: 'Ausência registrada com sucesso', id: confirmacaoExistente.id });
            }
          );
        } else {
          // Inserir nova confirmação como ausente
          db.run(`INSERT INTO confirmacoes_presenca 
                  (programacao_id, usuario_id, status, justificativa, atualizado_em)
                  VALUES (?, ?, 'ausente', ?, CURRENT_TIMESTAMP)`,
            [programacaoId, usuarioId, justificativa || null],
            function(err) {
              if (err) {
                console.error('Erro ao cancelar presença:', err);
                return res.status(500).json({ erro: 'Erro ao cancelar presença' });
              }
              res.json({ mensagem: 'Ausência registrada com sucesso', id: this.lastID });
            }
          );
        }
      }
    );
  });
});

// Listar confirmações de presença de uma programação
app.get('/api/programacoes/:id/confirmacoes', authenticateToken, (req, res) => {
  const programacaoId = parseInt(req.params.id);
  
  // Buscar todas as confirmações da programação com informações do usuário
  const query = `SELECT cp.id, cp.programacao_id, cp.usuario_id, cp.status, cp.justificativa, 
                        cp.criado_em, cp.atualizado_em,
                        u.nome, u.nome_completo, u.email, u.telefone
                 FROM confirmacoes_presenca cp
                 JOIN usuarios u ON cp.usuario_id = u.id
                 WHERE cp.programacao_id = ?
                 ORDER BY cp.status ASC, cp.atualizado_em DESC`;
  
  db.all(query, [programacaoId], (err, confirmacoes) => {
    if (err) {
      console.error('Erro ao buscar confirmações:', err);
      return res.status(500).json({ erro: 'Erro ao buscar confirmações' });
    }
    
    res.json({ confirmacoes: confirmacoes || [] });
  });
});

// Verificar status de confirmação do usuário atual
app.get('/api/programacoes/:id/minha-confirmacao', authenticateToken, (req, res) => {
  const programacaoId = parseInt(req.params.id);
  const usuarioId = req.user.id;
  
  db.get(`SELECT id, status, justificativa, criado_em, atualizado_em
          FROM confirmacoes_presenca
          WHERE programacao_id = ? AND usuario_id = ?`,
    [programacaoId, usuarioId],
    (err, confirmacao) => {
      if (err) {
        console.error('Erro ao buscar confirmação:', err);
        return res.status(500).json({ erro: 'Erro ao buscar confirmação' });
      }
      
      if (!confirmacao) {
        return res.json({ confirmacao: null });
      }
      
      res.json({ confirmacao });
    }
  );
});

// Listar usuários básicos (para gerenciamento de confirmações - apenas nome e ID)
app.get('/api/usuarios/lista-basica', authenticateToken, (req, res) => {
  db.all(`SELECT id, nome, nome_completo
          FROM usuarios
          ORDER BY nome_completo ASC, nome ASC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Erro ao buscar usuários:', err);
        return res.status(500).json({ erro: 'Erro ao buscar usuários' });
      }
      
      res.json({ usuarios: rows || [] });
    }
  );
});

// Adicionar confirmação manualmente (apenas admin ou criador da programação)
app.post('/api/programacoes/:id/confirmacoes', authenticateToken, (req, res) => {
  const programacaoId = parseInt(req.params.id);
  const { usuario_id, status, justificativa } = req.body;
  const usuarioLogadoId = req.user.id;
  
  // Verificar se programação existe e se usuário é admin ou criador
  db.get('SELECT criado_por FROM programacoes WHERE id = ?', [programacaoId], (err, programacao) => {
    if (err) {
      console.error('Erro ao buscar programação:', err);
      return res.status(500).json({ erro: 'Erro ao buscar programação' });
    }
    
    if (!programacao) {
      return res.status(404).json({ erro: 'Programação não encontrada' });
    }
    
    // Verificar permissão (admin ou criador)
    if (usuarioLogadoId !== 1 && usuarioLogadoId !== programacao.criado_por) {
      return res.status(403).json({ erro: 'Acesso negado. Apenas admin ou criador da programação podem adicionar confirmações.' });
    }
    
    // Inserir ou atualizar confirmação
    db.run(`INSERT OR REPLACE INTO confirmacoes_presenca 
            (programacao_id, usuario_id, status, justificativa, atualizado_em)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [programacaoId, usuario_id, status || 'presente', justificativa || null],
      function(err) {
        if (err) {
          console.error('Erro ao adicionar confirmação:', err);
          return res.status(500).json({ erro: 'Erro ao adicionar confirmação' });
        }
        res.json({ mensagem: 'Confirmação adicionada com sucesso', id: this.lastID });
      }
    );
  });
});

// Remover confirmação (apenas admin ou criador da programação)
app.delete('/api/programacoes/:id/confirmacoes/:usuarioId', authenticateToken, (req, res) => {
  const programacaoId = parseInt(req.params.id);
  const usuarioId = parseInt(req.params.usuarioId);
  const usuarioLogadoId = req.user.id;
  
  // Verificar se programação existe e se usuário é admin ou criador
  db.get('SELECT criado_por FROM programacoes WHERE id = ?', [programacaoId], (err, programacao) => {
    if (err) {
      console.error('Erro ao buscar programação:', err);
      return res.status(500).json({ erro: 'Erro ao buscar programação' });
    }
    
    if (!programacao) {
      return res.status(404).json({ erro: 'Programação não encontrada' });
    }
    
    // Verificar permissão (admin ou criador)
    if (usuarioLogadoId !== 1 && usuarioLogadoId !== programacao.criado_por) {
      return res.status(403).json({ erro: 'Acesso negado. Apenas admin ou criador da programação podem remover confirmações.' });
    }
    
    db.run('DELETE FROM confirmacoes_presenca WHERE programacao_id = ? AND usuario_id = ?',
      [programacaoId, usuarioId],
      function(err) {
        if (err) {
          console.error('Erro ao remover confirmação:', err);
          return res.status(500).json({ erro: 'Erro ao remover confirmação' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ erro: 'Confirmação não encontrada' });
        }
        
        res.json({ mensagem: 'Confirmação removida com sucesso' });
      }
    );
  });
});

// ========== ROTAS DE ANEXOS/NOTAS DE PROGRAMAÇÃO ==========

// Adicionar anexo/nota a uma programação
app.post('/api/programacoes/:id/anexos', authenticateToken, (req, res) => {
  const programacaoId = parseInt(req.params.id);
  const usuarioId = req.user.id;
  const { tipo, titulo, conteudo, arquivo_nome, arquivo_tipo, arquivo_dados } = req.body;
  
  // Log para debug
  console.log(`[Adicionar Anexo] Programação: ${programacaoId}, Tipo: ${tipo}, Tamanho do conteúdo recebido: ${conteudo ? conteudo.length : 0} caracteres`);
  
  // Validar tipo
  if (!['nota', 'arquivo', 'foto'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido. Use: nota, arquivo ou foto' });
  }
  
  // Validar conteúdo (máximo 10.000 caracteres)
  if (conteudo && conteudo.length > 10000) {
    console.log(`[Adicionar Anexo] ERRO: Conteúdo muito grande. Recebido: ${conteudo.length} caracteres`);
    return res.status(400).json({ erro: 'Conteúdo muito grande. Máximo de 10.000 caracteres.' });
  }
  
  // Verificar se programação existe e permissão (admin ou criador)
  db.get('SELECT id, criado_por FROM programacoes WHERE id = ?', [programacaoId], (err, programacao) => {
    if (err) {
      console.error('Erro ao buscar programação:', err);
      return res.status(500).json({ erro: 'Erro ao buscar programação' });
    }
    
    if (!programacao) {
      return res.status(404).json({ erro: 'Programação não encontrada' });
    }
    
    // Verificar permissão: apenas admin (id === 1) ou criador da programação
    if (usuarioId !== 1 && usuarioId !== programacao.criado_por) {
      return res.status(403).json({ erro: 'Acesso negado. Apenas admin ou criador da programação podem adicionar anexos.' });
    }
    
    // Converter arquivo_dados de base64 para buffer se for string
    let arquivoDadosBuffer = null;
    if (arquivo_dados && typeof arquivo_dados === 'string') {
      try {
        arquivoDadosBuffer = Buffer.from(arquivo_dados, 'base64');
        // Limitar tamanho do arquivo (5MB)
        if (arquivoDadosBuffer.length > 5 * 1024 * 1024) {
          return res.status(400).json({ erro: 'Arquivo muito grande. Máximo de 5MB.' });
        }
      } catch (e) {
        return res.status(400).json({ erro: 'Formato de arquivo inválido' });
      }
    }
    
    // Log do conteúdo antes de salvar
    if (conteudo) {
      console.log(`[Adicionar Anexo] Salvando conteúdo com ${conteudo.length} caracteres`);
      console.log(`[Adicionar Anexo] Primeiros 100 caracteres: ${conteudo.substring(0, 100)}...`);
      console.log(`[Adicionar Anexo] Últimos 100 caracteres: ...${conteudo.substring(Math.max(0, conteudo.length - 100))}`);
    }
    
    db.run(`INSERT INTO programacao_anexos 
            (programacao_id, usuario_id, tipo, titulo, conteudo, arquivo_nome, arquivo_tipo, arquivo_dados)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [programacaoId, usuarioId, tipo, titulo || null, conteudo || null, arquivo_nome || null, arquivo_tipo || null, arquivoDadosBuffer],
      function(err) {
        if (err) {
          console.error('Erro ao adicionar anexo:', err);
          return res.status(500).json({ erro: 'Erro ao adicionar anexo: ' + err.message });
        }
        
        // Verificar o que foi salvo
        db.get('SELECT id, LENGTH(conteudo) as tamanho_conteudo FROM programacao_anexos WHERE id = ?', [this.lastID], (err, anexoSalvo) => {
          if (!err && anexoSalvo) {
            console.log(`[Adicionar Anexo] Anexo salvo com ID ${anexoSalvo.id}, tamanho no banco: ${anexoSalvo.tamanho_conteudo} caracteres`);
            if (conteudo && anexoSalvo.tamanho_conteudo !== conteudo.length) {
              console.error(`[Adicionar Anexo] AVISO: Tamanho diferente! Enviado: ${conteudo.length}, Salvo: ${anexoSalvo.tamanho_conteudo}`);
            }
          }
        });
        
        res.json({ mensagem: 'Anexo adicionado com sucesso', id: this.lastID });
      }
    );
  });
});

// Listar anexos de uma programação
app.get('/api/programacoes/:id/anexos', authenticateToken, (req, res) => {
  const programacaoId = parseInt(req.params.id);
  
  const query = `SELECT pa.id, pa.programacao_id, pa.usuario_id, pa.tipo, pa.titulo, pa.conteudo, 
                        pa.arquivo_nome, pa.arquivo_tipo, pa.criado_em,
                        LENGTH(pa.conteudo) as tamanho_conteudo,
                        u.nome, u.nome_completo
                 FROM programacao_anexos pa
                 JOIN usuarios u ON pa.usuario_id = u.id
                 WHERE pa.programacao_id = ?
                 ORDER BY pa.criado_em DESC`;
  
  db.all(query, [programacaoId], (err, anexos) => {
    if (err) {
      console.error('Erro ao buscar anexos:', err);
      return res.status(500).json({ erro: 'Erro ao buscar anexos' });
    }
    
    // Log para debug
    anexos.forEach(anexo => {
      if (anexo.conteudo) {
        console.log(`[Listar Anexos] Anexo ID ${anexo.id}: ${anexo.conteudo.length} caracteres no conteúdo, ${anexo.tamanho_conteudo} no banco`);
      }
    });
    
    // Não enviar dados binários na listagem (apenas metadados)
    // Mas enviar TODO o conteúdo de texto (não truncar)
    const anexosSemDados = anexos.map(anexo => ({
      ...anexo,
      arquivo_dados: null, // Não enviar dados binários na listagem
      tamanho_conteudo: undefined // Remover campo auxiliar
    }));
    
    res.json({ anexos: anexosSemDados || [] });
  });
});

// Buscar arquivo de anexo (retorna dados binários)
app.get('/api/programacoes/:id/anexos/:anexoId/arquivo', authenticateToken, (req, res) => {
  const programacaoId = parseInt(req.params.id);
  const anexoId = parseInt(req.params.anexoId);
  const download = req.query.download === 'true'; // Verificar se é para download ou visualização
  
  db.get(`SELECT tipo, arquivo_nome, arquivo_tipo, arquivo_dados
          FROM programacao_anexos
          WHERE id = ? AND programacao_id = ?`,
    [anexoId, programacaoId],
    (err, anexo) => {
      if (err) {
        console.error('Erro ao buscar arquivo:', err);
        return res.status(500).json({ erro: 'Erro ao buscar arquivo' });
      }
      
      if (!anexo || !anexo.arquivo_dados) {
        return res.status(404).json({ erro: 'Arquivo não encontrado' });
      }
      
      // Detectar tipo de arquivo baseado na extensão se o tipo não estiver definido
      let contentType = anexo.arquivo_tipo;
      const arquivoNome = anexo.arquivo_nome || '';
      const extensao = arquivoNome.split('.').pop().toLowerCase();
      
      // Mapear extensões para tipos MIME
      const tiposMime = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'bmp': 'image/bmp',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
      
      if (!contentType && extensao && tiposMime[extensao]) {
        contentType = tiposMime[extensao];
      }
      
      if (!contentType) {
        contentType = 'application/octet-stream';
      }
      
      // Configurar Content-Type
      res.setHeader('Content-Type', contentType);
      
      // Verificar se é imagem ou PDF
      const isImage = contentType.startsWith('image/');
      const isPdf = contentType === 'application/pdf';
      
      // Se for foto/imagem/PDF e não for download explícito, permitir visualização inline
      // Caso contrário, forçar download
      if ((anexo.tipo === 'foto' || anexo.tipo === 'arquivo') && !download && (isImage || isPdf)) {
        res.setHeader('Content-Disposition', `inline; filename="${anexo.arquivo_nome || 'arquivo'}"`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename="${anexo.arquivo_nome || 'arquivo'}"`);
      }
      
      // Cache para imagens e PDFs (1 hora)
      if (isImage || isPdf) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
      
      // CORS headers para permitir exibição de imagens
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      res.send(anexo.arquivo_dados);
    }
  );
});

// Deletar anexo
app.delete('/api/programacoes/:id/anexos/:anexoId', authenticateToken, (req, res) => {
  const programacaoId = parseInt(req.params.id);
  const anexoId = parseInt(req.params.anexoId);
  const usuarioId = req.user.id;
  
  // Verificar se anexo existe e se usuário é o criador, admin ou criador da programação
  db.get(`SELECT pa.usuario_id, p.criado_por
          FROM programacao_anexos pa
          JOIN programacoes p ON pa.programacao_id = p.id
          WHERE pa.id = ? AND pa.programacao_id = ?`,
    [anexoId, programacaoId],
    (err, resultado) => {
      if (err) {
        console.error('Erro ao verificar anexo:', err);
        return res.status(500).json({ erro: 'Erro ao verificar anexo' });
      }
      
      if (!resultado) {
        return res.status(404).json({ erro: 'Anexo não encontrado' });
      }
      
      // Verificar permissão (criador do anexo, admin ou criador da programação)
      if (usuarioId !== 1 && usuarioId !== resultado.usuario_id && usuarioId !== resultado.criado_por) {
        return res.status(403).json({ erro: 'Acesso negado' });
      }
      
      db.run('DELETE FROM programacao_anexos WHERE id = ?', [anexoId], function(err) {
        if (err) {
          console.error('Erro ao deletar anexo:', err);
          return res.status(500).json({ erro: 'Erro ao deletar anexo' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ erro: 'Anexo não encontrado' });
        }
        
        res.json({ mensagem: 'Anexo deletado com sucesso' });
      });
    }
  );
});

// Rota informativa para /api
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API do Sistema ADMB',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/api/health',
      login: 'POST /api/login',
      registro: 'POST /api/registro',
      perfil: 'GET /api/perfil (requer autenticação)'
    },
    timestamp: new Date().toISOString()
  });
});

// Rota de health check para Render e monitoramento
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Tratamento de rotas não encontradas (404)
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    erro: 'Rota não encontrada',
    path: req.path,
    method: req.method,
    message: 'Verifique a documentação da API para rotas disponíveis'
  });
});

// Fallback para servir o frontend em produção (SPA)
app.get('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ erro: 'Endpoint não encontrado' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse localmente: http://localhost:${PORT}`);
  console.log(`Acesse na rede: http://${LOCAL_IP}:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`\n📱 Para acessar do celular na mesma rede WiFi:`);
  console.log(`   Use: http://${LOCAL_IP}:${PORT}`);
});

// Fechar banco de dados ao encerrar
process.on('SIGINT', async () => {
  try {
    await db.close();
    console.log('Conexão com banco de dados fechada.');
  } catch (err) {
    console.error('Erro ao fechar banco de dados:', err.message || err);
  }
  process.exit(0);
});

