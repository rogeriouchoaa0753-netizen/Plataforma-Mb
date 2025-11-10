const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('=== INFORMAÇÕES COMPLETAS DO CADASTRO ID 1 ===\n');

// Buscar dados do usuário ID 1 com todas as informações relacionadas
db.get(`SELECT 
    u.id,
    u.nome,
    u.nome_completo,
    u.email,
    u.cpf,
    u.telefone,
    u.endereco,
    u.cep,
    u.estado_civil,
    u.ocupacao_id,
    u.perfil_completo,
    u.criado_em,
    u.atualizado_em,
    a.nome as ocupacao_nome,
    i.id as igreja_id,
    i.nome as igreja_nome,
    i.estado as igreja_estado,
    im.funcao as igreja_funcao
FROM usuarios u
LEFT JOIN areas_servicos a ON u.ocupacao_id = a.id
LEFT JOIN igreja_membros im ON u.id = im.usuario_id
LEFT JOIN igrejas i ON im.igreja_id = i.id
WHERE u.id = 1`, [], (err, usuario) => {
    if (err) {
        console.error('Erro ao buscar usuário:', err);
        db.close();
        return;
    }

    if (!usuario) {
        console.log('Usuário ID 1 não encontrado!');
        db.close();
        return;
    }

    console.log('📋 DADOS PESSOAIS:');
    console.log('─────────────────────────────────────────');
    console.log(`ID: ${usuario.id}`);
    console.log(`Nome: ${usuario.nome || 'Não informado'}`);
    console.log(`Nome Completo: ${usuario.nome_completo || 'Não informado'}`);
    console.log(`Email: ${usuario.email || 'Não informado'}`);
    console.log(`CPF: ${usuario.cpf || 'Não informado'}`);
    console.log(`Telefone: ${usuario.telefone || 'Não informado'}`);
    console.log(`Endereço: ${usuario.endereco || 'Não informado'}`);
    console.log(`CEP: ${usuario.cep || 'Não informado'}`);
    console.log(`Estado Civil: ${usuario.estado_civil || 'Não informado'}`);
    console.log(`Perfil Completo: ${usuario.perfil_completo ? 'Sim' : 'Não'}`);
    console.log(`Cadastrado em: ${usuario.criado_em || 'Não informado'}`);
    console.log(`Atualizado em: ${usuario.atualizado_em || 'Não informado'}`);
    console.log('');

    console.log('💼 OCUPAÇÃO:');
    console.log('─────────────────────────────────────────');
    if (usuario.ocupacao_id) {
        console.log(`ID da Ocupação: ${usuario.ocupacao_id}`);
        console.log(`Nome da Ocupação: ${usuario.ocupacao_nome || 'Não encontrado'}`);
    } else {
        console.log('Não vinculado a nenhuma ocupação');
    }
    console.log('');

    console.log('⛪ IGREJA:');
    console.log('─────────────────────────────────────────');
    if (usuario.igreja_id) {
        console.log(`ID da Igreja: ${usuario.igreja_id}`);
        console.log(`Nome da Igreja: ${usuario.igreja_nome || 'Não encontrado'}`);
        console.log(`Estado: ${usuario.igreja_estado || 'Não informado'}`);
        console.log(`Função na Igreja: ${usuario.igreja_funcao || 'Não informado'}`);
    } else {
        console.log('Não vinculado a nenhuma igreja');
    }
    console.log('');

    // Buscar relacionamentos (cônjuge e filhos)
    db.all(`SELECT 
        r.id as relacionamento_id,
        r.tipo,
        r.relacionado_id,
        u.nome,
        u.nome_completo,
        u.email,
        u.cpf,
        u.telefone
    FROM relacionamentos r
    JOIN usuarios u ON r.relacionado_id = u.id
    WHERE r.usuario_id = 1`, [], (err, relacionamentos) => {
        if (err) {
            console.error('Erro ao buscar relacionamentos:', err);
            db.close();
            return;
        }

        if (relacionamentos && relacionamentos.length > 0) {
            console.log('👨‍👩‍👧‍👦 RELACIONAMENTOS:');
            console.log('─────────────────────────────────────────');
            
            const conjuge = relacionamentos.find(r => r.tipo === 'conjuge');
            const filhos = relacionamentos.filter(r => r.tipo === 'filho');

            if (conjuge) {
                console.log('💑 CÔNJUGE:');
                console.log(`  ID: ${conjuge.relacionado_id}`);
                console.log(`  Nome: ${conjuge.nome || 'Não informado'}`);
                console.log(`  Nome Completo: ${conjuge.nome_completo || 'Não informado'}`);
                console.log(`  Email: ${conjuge.email || 'Não informado'}`);
                console.log(`  CPF: ${conjuge.cpf || 'Não informado'}`);
                console.log(`  Telefone: ${conjuge.telefone || 'Não informado'}`);
                console.log('');
            } else {
                console.log('💑 CÔNJUGE: Não vinculado');
                console.log('');
            }

            if (filhos.length > 0) {
                console.log(`👶 FILHOS (${filhos.length}):`);
                filhos.forEach((filho, index) => {
                    console.log(`  Filho ${index + 1}:`);
                    console.log(`    ID: ${filho.relacionado_id}`);
                    console.log(`    Nome: ${filho.nome || 'Não informado'}`);
                    console.log(`    Nome Completo: ${filho.nome_completo || 'Não informado'}`);
                    console.log(`    Email: ${filho.email || 'Não informado'}`);
                    console.log(`    CPF: ${filho.cpf || 'Não informado'}`);
                    console.log(`    Telefone: ${filho.telefone || 'Não informado'}`);
                    console.log('');
                });
            } else {
                console.log('👶 FILHOS: Nenhum filho vinculado');
                console.log('');
            }
        } else {
            console.log('👨‍👩‍👧‍👦 RELACIONAMENTOS:');
            console.log('─────────────────────────────────────────');
            console.log('Nenhum relacionamento vinculado');
            console.log('');
        }

        // Verificar se há vínculo na tabela igreja_membros
        db.get('SELECT * FROM igreja_membros WHERE usuario_id = 1', [], (err, membro) => {
            if (err) {
                console.error('Erro ao verificar igreja_membros:', err);
            } else {
                console.log('🔗 VÍNCULO NA TABELA igreja_membros:');
                console.log('─────────────────────────────────────────');
                if (membro) {
                    console.log(JSON.stringify(membro, null, 2));
                } else {
                    console.log('Nenhum registro encontrado na tabela igreja_membros');
                }
                console.log('');
            }

            console.log('=== FIM DO RELATÓRIO ===');
            db.close();
        });
    });
});






