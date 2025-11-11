const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL não configurada. Defina a variável antes de iniciar o servidor.');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function normalizeSql(sql) {
  let text = sql.trim();
  const original = text;
  let ignoreConflict = false;
  let replaceConfirmacao = false;

  if (/^INSERT\s+OR\s+IGNORE\s+/i.test(text)) {
    text = text.replace(/^INSERT\s+OR\s+IGNORE\s+/i, 'INSERT ');
    ignoreConflict = true;
  }

  if (/^INSERT\s+OR\s+REPLACE\s+INTO\s+confirmacoes_presenca/i.test(text)) {
    text = text.replace(/^INSERT\s+OR\s+REPLACE\s+/i, 'INSERT ');
    replaceConfirmacao = true;
  }

  if (/CREATE\s+TABLE/i.test(text)) {
    text = text
      .replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
      .replace(/DATETIME/gi, 'TIMESTAMP')
      .replace(/BOOLEAN\s+DEFAULT\s+0/gi, 'BOOLEAN DEFAULT FALSE')
      .replace(/BOOLEAN\s+DEFAULT\s+1/gi, 'BOOLEAN DEFAULT TRUE')
      .replace(/INTEGER\s+DEFAULT\s+0/gi, 'INTEGER DEFAULT 0');
  }

  if (/ALTER\s+TABLE/i.test(text) && /ADD\s+COLUMN/i.test(text)) {
    text = text.replace(/ADD\s+COLUMN\s+([\w_]+)/i, 'ADD COLUMN IF NOT EXISTS $1');
  }

  let finalSql = convertPlaceholders(text);

  if (replaceConfirmacao) {
    finalSql = `${finalSql} ON CONFLICT (programacao_id, usuario_id) DO UPDATE SET status = EXCLUDED.status, justificativa = EXCLUDED.justificativa, atualizado_em = CURRENT_TIMESTAMP`;
  } else if (ignoreConflict) {
    finalSql = `${finalSql} ON CONFLICT DO NOTHING`;
  }

  return finalSql;
}

function prepareStatement(sql) {
  const text = normalizeSql(sql);
  const isInsert = /^\s*INSERT/i.test(sql);
  const hasReturning = /RETURNING\s+/i.test(text);
  const shouldReturnId = isInsert && !hasReturning;
  const finalText = shouldReturnId ? `${text} RETURNING id` : text;
  return { text: finalText, shouldReturnId };
}

function run(sql, params, callback) {
  let args = params;
  let cb = callback;
  if (typeof params === 'function') {
    cb = params;
    args = [];
  }

  const { text, shouldReturnId } = prepareStatement(sql);

  pool
    .query(text, args)
    .then((res) => {
      if (cb) {
        const ctx = {
          lastID: shouldReturnId && res.rows[0] ? res.rows[0].id : undefined,
          changes: res.rowCount,
        };
        cb.call(ctx, null);
      }
    })
    .catch((err) => {
      if (cb) cb(err);
      else console.error('Erro em db.run:', err);
    });
}

function get(sql, params, callback) {
  let args = params;
  let cb = callback;
  if (typeof params === 'function') {
    cb = params;
    args = [];
  }

  const { text } = prepareStatement(sql);

  pool
    .query(text, args)
    .then((res) => {
      if (cb) cb(null, res.rows[0]);
    })
    .catch((err) => {
      if (cb) cb(err);
      else console.error('Erro em db.get:', err);
    });
}

function all(sql, params, callback) {
  let args = params;
  let cb = callback;
  if (typeof params === 'function') {
    cb = params;
    args = [];
  }

  const { text } = prepareStatement(sql);

  pool
    .query(text, args)
    .then((res) => {
      if (cb) cb(null, res.rows);
    })
    .catch((err) => {
      if (cb) cb(err);
      else console.error('Erro em db.all:', err);
    });
}

async function initialize() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS areas_servicos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE,
      descricao TEXT,
      tipo TEXT NOT NULL DEFAULT 'area',
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      nome_completo TEXT,
      cpf TEXT UNIQUE,
      endereco TEXT,
      cep TEXT,
      telefone TEXT,
      estado_civil TEXT,
      ocupacao_id INTEGER REFERENCES areas_servicos(id),
      perfil_completo BOOLEAN DEFAULT FALSE,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS relacionamentos (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      tipo TEXT NOT NULL,
      relacionado_id INTEGER NOT NULL REFERENCES usuarios(id),
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(usuario_id, relacionado_id, tipo)
    )`,
    `CREATE TABLE IF NOT EXISTS igrejas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE,
      estado TEXT,
      descricao TEXT,
      quantidade_vinculados INTEGER DEFAULT 0,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS igreja_membros (
      id SERIAL PRIMARY KEY,
      igreja_id INTEGER NOT NULL REFERENCES igrejas(id),
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      funcao TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(igreja_id, usuario_id)
    )`,
    `CREATE TABLE IF NOT EXISTS programacoes (
      id SERIAL PRIMARY KEY,
      codigo TEXT,
      titulo TEXT NOT NULL,
      descricao TEXT,
      data_evento DATE NOT NULL,
      data_fim_evento DATE,
      hora_evento TIME,
      local_evento TEXT,
      igreja_id INTEGER REFERENCES igrejas(id),
      criado_por INTEGER NOT NULL REFERENCES usuarios(id),
      aprovado_por INTEGER REFERENCES usuarios(id),
      observacoes TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(codigo)
    )`,
    `CREATE TABLE IF NOT EXISTS programacao_membros (
      id SERIAL PRIMARY KEY,
      programacao_id INTEGER NOT NULL REFERENCES programacoes(id) ON DELETE CASCADE,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      hora_especifica TIME,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(programacao_id, usuario_id)
    )`,
    `CREATE TABLE IF NOT EXISTS solicitacoes_eventos (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      descricao TEXT,
      data_evento DATE NOT NULL,
      data_fim_evento DATE,
      hora_evento TIME,
      local_evento TEXT,
      igreja_id INTEGER REFERENCES igrejas(id),
      solicitado_por INTEGER NOT NULL REFERENCES usuarios(id),
      status TEXT NOT NULL DEFAULT 'pendente',
      aprovado_por INTEGER REFERENCES usuarios(id),
      observacoes TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS confirmacoes_presenca (
      id SERIAL PRIMARY KEY,
      programacao_id INTEGER NOT NULL REFERENCES programacoes(id) ON DELETE CASCADE,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      status TEXT NOT NULL DEFAULT 'presente',
      justificativa TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(programacao_id, usuario_id)
    )`,
    `CREATE TABLE IF NOT EXISTS programacao_anexos (
      id SERIAL PRIMARY KEY,
      programacao_id INTEGER NOT NULL REFERENCES programacoes(id) ON DELETE CASCADE,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      tipo TEXT NOT NULL DEFAULT 'nota',
      titulo TEXT,
      conteudo TEXT,
      arquivo_nome TEXT,
      arquivo_tipo TEXT,
      arquivo_dados BYTEA,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome_completo TEXT`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf TEXT`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS endereco TEXT`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cep TEXT`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone TEXT`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS estado_civil TEXT`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil_completo BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ocupacao_id INTEGER REFERENCES areas_servicos(id)`,
    `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS data_nascimento DATE`,
    `ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS estado TEXT`,
    `ALTER TABLE igrejas ADD COLUMN IF NOT EXISTS quantidade_vinculados INTEGER DEFAULT 0`,
    `ALTER TABLE solicitacoes_eventos ADD COLUMN IF NOT EXISTS data_fim_evento DATE`,
    `ALTER TABLE solicitacoes_eventos ADD COLUMN IF NOT EXISTS igreja_id INTEGER REFERENCES igrejas(id)`
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function close() {
  await pool.end();
}

module.exports = {
  run,
  get,
  all,
  query: (sql, params) => {
    const { text } = prepareStatement(sql);
    return pool.query(text, params);
  },
  pool,
  initialize,
  close,
};

