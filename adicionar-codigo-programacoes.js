const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
        process.exit(1);
    }
    console.log('✅ Conectado ao banco de dados SQLite\n');
    
    // Adicionar coluna codigo se não existir
    db.run('ALTER TABLE programacoes ADD COLUMN codigo TEXT', (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erro ao adicionar coluna codigo:', err.message);
            db.close();
            return;
        }
        
        console.log('✅ Coluna codigo verificada/adicionada\n');
        
        // Buscar programações sem código
        db.all('SELECT id FROM programacoes WHERE codigo IS NULL OR codigo = ""', [], (err, rows) => {
            if (err) {
                console.error('❌ Erro ao buscar programações:', err.message);
                db.close();
                return;
            }
            
            if (!rows || rows.length === 0) {
                console.log('✅ Todas as programações já têm código.\n');
                db.close();
                return;
            }
            
            console.log(`📋 Encontradas ${rows.length} programação(ões) sem código. Gerando códigos...\n`);
            
            const ano = new Date().getFullYear();
            let processadas = 0;
            
            rows.forEach((row, index) => {
                // Buscar o último código do ano para gerar sequencial
                db.get('SELECT codigo FROM programacoes WHERE codigo LIKE ? ORDER BY codigo DESC LIMIT 1', 
                    [`PRG-${ano}-%`], 
                    (err, ultimoCodigo) => {
                        let proximoNumero = 1;
                        
                        if (!err && ultimoCodigo && ultimoCodigo.codigo) {
                            const ultimoNumero = parseInt(ultimoCodigo.codigo.slice(-3)) || 0;
                            proximoNumero = ultimoNumero + 1;
                        }
                        
                        const codigo = `PRG-${ano}-${String(proximoNumero + index).padStart(3, '0')}`;
                        
                        db.run('UPDATE programacoes SET codigo = ? WHERE id = ?', [codigo, row.id], (err2) => {
                            if (err2) {
                                console.error(`❌ Erro ao gerar código para programação ID ${row.id}:`, err2.message);
                            } else {
                                console.log(`✅ Código ${codigo} gerado para programação ID ${row.id}`);
                            }
                            
                            processadas++;
                            if (processadas === rows.length) {
                                console.log('\n✅ Processo concluído!\n');
                                db.close();
                            }
                        });
                    }
                );
            });
        });
    });
});
















