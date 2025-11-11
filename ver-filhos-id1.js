const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
        return;
    }
    console.log('Conectado ao banco de dados SQLite\n');
});

// Buscar dados do usuário ID 1
db.get(`SELECT id, nome, nome_completo, email, cpf, telefone, endereco, cep, 
        estado_civil, ocupacao_id, perfil_completo, criado_em, atualizado_em
        FROM usuarios WHERE id = 1`, [], (err, usuario) => {
    if (err) {
        console.error('Erro ao buscar usuário:', err);
        db.close();
        return;
    }

    if (!usuario) {
        console.log('Usuário ID 1 não encontrado.');
        db.close();
        return;
    }

    console.log('=== DADOS DO USUÁRIO ID 1 ===');
    console.log('ID:', usuario.id);
    console.log('Nome:', usuario.nome);
    console.log('Nome Completo:', usuario.nome_completo);
    console.log('Email:', usuario.email);
    console.log('CPF:', usuario.cpf);
    console.log('Telefone:', usuario.telefone);
    console.log('Endereço:', usuario.endereco);
    console.log('CEP:', usuario.cep);
    console.log('Estado Civil:', usuario.estado_civil);
    console.log('Ocupação ID:', usuario.ocupacao_id);
    console.log('Perfil Completo:', usuario.perfil_completo);
    console.log('');

    // Buscar relacionamentos (filhos) do usuário ID 1
    db.all(`SELECT r.id as relacionamento_id, r.tipo, r.relacionado_id, 
            u.id as filho_id, u.nome, u.nome_completo, u.email, u.cpf, u.telefone
            FROM relacionamentos r
            JOIN usuarios u ON r.relacionado_id = u.id
            WHERE r.usuario_id = 1 AND r.tipo = 'filho'`, [], (err, filhos) => {
        if (err) {
            console.error('Erro ao buscar filhos:', err);
            db.close();
            return;
        }

        console.log('=== INFORMAÇÃO SOBRE FILHOS ===');
        console.log('Tem filhos?', filhos && filhos.length > 0 ? 'SIM' : 'NÃO');
        console.log('Quantidade de filhos:', filhos ? filhos.length : 0);
        console.log('');

        if (filhos && filhos.length > 0) {
            console.log('=== DETALHES DOS FILHOS ===');
            filhos.forEach((filho, index) => {
                console.log(`\nFilho ${index + 1}:`);
                console.log('  Relacionamento ID:', filho.relacionamento_id);
                console.log('  Tipo:', filho.tipo);
                console.log('  ID do Filho:', filho.filho_id);
                console.log('  Nome:', filho.nome);
                console.log('  Nome Completo:', filho.nome_completo);
                console.log('  Email:', filho.email || 'Não informado');
                console.log('  CPF:', filho.cpf || 'Não informado');
                console.log('  Telefone:', filho.telefone || 'Não informado');
            });
        } else {
            console.log('Nenhum filho cadastrado para este usuário.');
        }

        console.log('\n=== VERIFICAÇÃO NA TABELA relacionamentos ===');
        db.all(`SELECT * FROM relacionamentos WHERE usuario_id = 1`, [], (err, todosRelacionamentos) => {
            if (err) {
                console.error('Erro ao buscar relacionamentos:', err);
            } else {
                console.log('Total de relacionamentos do ID 1:', todosRelacionamentos.length);
                todosRelacionamentos.forEach(rel => {
                    console.log(`  - Tipo: ${rel.tipo}, Relacionado ID: ${rel.relacionado_id}`);
                });
            }

            db.close();
        });
    });
});








