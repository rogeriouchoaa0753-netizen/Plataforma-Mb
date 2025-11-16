const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar ao banco de dados
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
        process.exit(1);
    }
    console.log('✅ Conectado ao banco de dados SQLite\n');
});

// Buscar todas as programações aprovadas
console.log('📅 ============================================');
console.log('📅 PROGRAMAÇÕES APROVADAS');
console.log('📅 ============================================\n');

db.all(`SELECT p.*, 
        u.nome as criado_por_nome, 
        u.nome_completo as criado_por_nome_completo,
        a.nome as criado_por_ocupacao,
        i.nome as igreja_nome,
        u2.nome as aprovado_por_nome
        FROM programacoes p
        LEFT JOIN usuarios u ON p.criado_por = u.id
        LEFT JOIN usuarios u2 ON p.aprovado_por = u2.id
        LEFT JOIN igrejas i ON p.igreja_id = i.id
        LEFT JOIN areas_servicos a ON u.ocupacao_id = a.id
        ORDER BY p.data_evento ASC, p.hora_evento ASC`, 
    [], 
    (err, programacoes) => {
        if (err) {
            console.error('❌ Erro ao buscar programações:', err.message);
            db.close();
            return;
        }

        if (programacoes.length === 0) {
            console.log('⚠️  Nenhuma programação aprovada encontrada.\n');
        } else {
            console.log(`✅ Total de programações aprovadas: ${programacoes.length}\n`);
            
            programacoes.forEach((prog, index) => {
                console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                console.log(`📋 Programação #${prog.id} - ${index + 1} de ${programacoes.length}`);
                console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                console.log(`   Código:           ${prog.codigo || 'Não informado'}`);
                console.log(`   Título:           ${prog.titulo}`);
                if (prog.descricao) {
                    console.log(`   Descrição:        ${prog.descricao}`);
                }
                console.log(`   Data de Início:   ${prog.data_evento}`);
                if (prog.data_fim_evento) {
                    console.log(`   Data de Fim:      ${prog.data_fim_evento}`);
                }
                if (prog.hora_evento) {
                    console.log(`   Hora:             ${prog.hora_evento}`);
                }
                console.log(`   Local:            ${prog.igreja_nome || prog.local_evento || 'Não informado'}`);
                if (prog.igreja_id) {
                    console.log(`   Igreja ID:        ${prog.igreja_id}`);
                }
                if (prog.observacoes) {
                    console.log(`   Observações:      ${prog.observacoes}`);
                }
                console.log(`   Criado por:       ${prog.criado_por_nome_completo || prog.criado_por_nome || 'ID: ' + prog.criado_por}`);
                if (prog.criado_por_ocupacao) {
                    console.log(`   Ocupação:         ${prog.criado_por_ocupacao}`);
                }
                if (prog.aprovado_por_nome) {
                    console.log(`   Aprovado por:     ${prog.aprovado_por_nome} (ID: ${prog.aprovado_por})`);
                }
                console.log(`   Criado em:        ${prog.criado_em}`);
                console.log(`   Atualizado em:    ${prog.atualizado_em || 'Nunca'}`);
                
                // Buscar membros vinculados
                db.all(`SELECT pm.*, u.nome, u.nome_completo, u.email, u.telefone
                        FROM programacao_membros pm
                        JOIN usuarios u ON pm.usuario_id = u.id
                        WHERE pm.programacao_id = ?`, 
                    [prog.id], 
                    (err, membros) => {
                        if (!err && membros.length > 0) {
                            console.log(`   Membros vinculados (${membros.length}):`);
                            membros.forEach((membro, idx) => {
                                console.log(`      ${idx + 1}. ${membro.nome_completo || membro.nome} (ID: ${membro.usuario_id})`);
                                if (membro.hora_especifica) {
                                    console.log(`         Horário específico: ${membro.hora_especifica}`);
                                }
                            });
                        }
                    }
                );
            });
        }

        // Buscar solicitações pendentes
        console.log('\n\n⏳ ============================================');
        console.log('⏳ SOLICITAÇÕES PENDENTES');
        console.log('⏳ ============================================\n');

        db.all(`SELECT s.*, 
                u.nome as solicitado_por_nome, 
                u.nome_completo as solicitado_por_nome_completo,
                u.email as solicitado_por_email,
                u.telefone as solicitado_por_telefone,
                i.nome as igreja_nome
                FROM solicitacoes_eventos s
                LEFT JOIN usuarios u ON s.solicitado_por = u.id
                LEFT JOIN igrejas i ON s.igreja_id = i.id
                WHERE s.status = 'pendente'
                ORDER BY s.criado_em DESC`, 
            [], 
            (err, solicitacoes) => {
                if (err) {
                    console.error('❌ Erro ao buscar solicitações:', err.message);
                    db.close();
                    return;
                }

                if (solicitacoes.length === 0) {
                    console.log('✅ Nenhuma solicitação pendente encontrada.\n');
                } else {
                    console.log(`⚠️  Total de solicitações pendentes: ${solicitacoes.length}\n`);
                    
                    solicitacoes.forEach((sol, index) => {
                        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                        console.log(`📋 Solicitação #${sol.id} - ${index + 1} de ${solicitacoes.length}`);
                        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                        console.log(`   Título:           ${sol.titulo}`);
                        if (sol.descricao) {
                            console.log(`   Descrição:        ${sol.descricao}`);
                        }
                        console.log(`   Data de Início:   ${sol.data_evento}`);
                        if (sol.data_fim_evento) {
                            console.log(`   Data de Fim:      ${sol.data_fim_evento}`);
                        }
                        if (sol.hora_evento) {
                            console.log(`   Hora:             ${sol.hora_evento}`);
                        }
                        console.log(`   Local:            ${sol.igreja_nome || sol.local_evento || 'Não informado'}`);
                        if (sol.igreja_id) {
                            console.log(`   Igreja ID:        ${sol.igreja_id}`);
                        }
                        if (sol.observacoes) {
                            console.log(`   Observações:      ${sol.observacoes}`);
                        }
                        console.log(`   Status:           ${sol.status}`);
                        console.log(`   Solicitado por:   ${sol.solicitado_por_nome_completo || sol.solicitado_por_nome || 'ID: ' + sol.solicitado_por}`);
                        if (sol.solicitado_por_email) {
                            console.log(`   Email:            ${sol.solicitado_por_email}`);
                        }
                        if (sol.solicitado_por_telefone) {
                            console.log(`   Telefone:         ${sol.solicitado_por_telefone}`);
                        }
                        console.log(`   Criado em:        ${sol.criado_em}`);
                    });
                }

                // Fechar conexão após um pequeno delay para garantir que todas as queries assíncronas terminaram
                setTimeout(() => {
                    console.log('\n\n✅ Consulta concluída!\n');
                    db.close();
                }, 500);
            }
        );
    }
);
















