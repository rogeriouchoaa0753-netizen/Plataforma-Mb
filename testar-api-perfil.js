const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');

// Simular o que o servidor faz
const db = new sqlite3.Database('./database.db');
const JWT_SECRET = process.env.JWT_SECRET || 'seu_secret_key_aqui_mude_em_producao';

// Criar um token para o usuário ID 1
const token = jwt.sign({ id: 1, email: 'rogeriouchoaa0753@gmail.com' }, JWT_SECRET, { expiresIn: '24h' });

console.log('Token gerado:', token);
console.log('\n=== TESTANDO QUERY DO PERFIL ===\n');

// Executar a mesma query que o servidor usa
db.get(`SELECT u.id, u.nome, u.nome_completo, u.email, u.cpf, u.telefone, u.endereco, u.cep, 
        u.estado_civil, u.ocupacao_id, u.perfil_completo, u.criado_em, u.atualizado_em,
        a.nome as ocupacao_nome,
        i.nome as igreja_nome, i.id as igreja_id, im.funcao as igreja_funcao
        FROM usuarios u
        LEFT JOIN areas_servicos a ON u.ocupacao_id = a.id
        LEFT JOIN igreja_membros im ON u.id = im.usuario_id
        LEFT JOIN igrejas i ON im.igreja_id = i.id
        WHERE u.id = ?`, [1], (err, row) => {
    if (err) {
        console.error('Erro:', err);
        db.close();
        return;
    }

    console.log('Resultado da query:');
    console.log(JSON.stringify(row, null, 2));
    console.log('\n=== VALORES ESPECÍFICOS ===');
    console.log('ocupacao_id:', row.ocupacao_id);
    console.log('ocupacao_nome:', row.ocupacao_nome);
    console.log('igreja_id:', row.igreja_id);
    console.log('igreja_nome:', row.igreja_nome);
    console.log('igreja_funcao:', row.igreja_funcao);
    
    // Verificar se os valores são null ou undefined
    console.log('\n=== VERIFICAÇÃO DE NULL/UNDEFINED ===');
    console.log('ocupacao_nome é null?', row.ocupacao_nome === null);
    console.log('ocupacao_nome é undefined?', row.ocupacao_nome === undefined);
    console.log('igreja_nome é null?', row.igreja_nome === null);
    console.log('igreja_nome é undefined?', row.igreja_nome === undefined);
    
    db.close();
});


