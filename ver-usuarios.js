const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
    return;
  }
  console.log('Conectado ao banco de dados SQLite\n');
  
  // Buscar todos os usuários com informações completas
  db.all(`SELECT id, nome, nome_completo, email, cpf, telefone, endereco, cep, 
          estado_civil, perfil_completo, criado_em, atualizado_em 
          FROM usuarios ORDER BY id`, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar usuários:', err.message);
      return;
    }
    
    if (rows.length === 0) {
      console.log('Nenhum usuário cadastrado ainda.');
      db.close();
      return;
    }
    
    console.log('=== USUÁRIOS CADASTRADOS ===\n');
    
    let processados = 0;
    rows.forEach((row) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`ID: ${row.id}`);
      console.log(`Nome: ${row.nome || 'N/A'}`);
      if (row.nome_completo) {
        console.log(`Nome Completo: ${row.nome_completo}`);
      }
      console.log(`Email: ${row.email || 'N/A'}`);
      if (row.cpf) {
        console.log(`CPF: ${row.cpf}`);
      }
      if (row.telefone) {
        console.log(`Telefone: ${row.telefone}`);
      }
      if (row.endereco) {
        console.log(`Endereço: ${row.endereco}`);
      }
      if (row.cep) {
        console.log(`CEP: ${row.cep}`);
      }
      if (row.estado_civil) {
        console.log(`Estado Civil: ${row.estado_civil}`);
      }
      console.log(`Perfil Completo: ${row.perfil_completo ? 'Sim' : 'Não'}`);
      console.log(`Cadastrado em: ${row.criado_em}`);
      if (row.atualizado_em) {
        console.log(`Atualizado em: ${row.atualizado_em}`);
      }
      
      // Buscar relacionamentos
      db.all(`SELECT r.tipo, r.relacionado_id, u.nome_completo, u.cpf, u.email
              FROM relacionamentos r
              JOIN usuarios u ON r.relacionado_id = u.id
              WHERE r.usuario_id = ?`, [row.id], (err, relacionamentos) => {
        if (!err && relacionamentos.length > 0) {
          console.log(`\nRelacionamentos:`);
          relacionamentos.forEach((rel) => {
            console.log(`  - ${rel.tipo === 'conjuge' ? 'Cônjuge' : 'Filho'}: ID ${rel.relacionado_id} - ${rel.nome_completo || rel.email} ${rel.cpf ? `(CPF: ${rel.cpf})` : ''}`);
          });
        }
        
        processados++;
        if (processados === rows.length) {
          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`\nTotal: ${rows.length} usuário(s)`);
          db.close();
        }
      });
    });
  });
});

