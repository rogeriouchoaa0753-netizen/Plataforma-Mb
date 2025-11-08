const API_URL = '/api';

// Elementos do DOM
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const perfilCompletoForm = document.getElementById('perfilCompletoForm');
const profileSection = document.getElementById('profileSection');
const adminSection = document.getElementById('adminSection');
const configSection = document.getElementById('configSection');
const inicioSection = document.getElementById('inicioSection');
const sidebarMenu = document.getElementById('sidebarMenu');
const loginFormElement = document.getElementById('loginFormElement');
const registerFormElement = document.getElementById('registerFormElement');
const perfilCompletoFormElement = document.getElementById('perfilCompletoFormElement');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');
const messageDiv = document.getElementById('message');
const pageTitle = document.getElementById('pageTitle');
let currentUserId = null;

// Verificar se já está logado
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        verificarToken(token);
    }
    
    // Verificar periodicamente se o sidebar está visível quando logado e esconder formulários
    setInterval(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Garantir que formulários de login estejam sempre escondidos quando logado
            esconderFormulariosLogin();
            garantirSidebarVisivel();
            // Também garantir que os itens do menu estejam configurados corretamente
            if (currentUserId) {
                configurarItensMenu(currentUserId);
            }
        }
    }, 1000); // Verificar a cada 1 segundo
});

// Salvar seção atual
function salvarSecaoAtual(secao) {
    localStorage.setItem('secaoAtual', secao);
}

// Esconder formulários de login/registro
function esconderFormulariosLogin() {
    if (loginForm) {
        loginForm.classList.remove('active');
        loginForm.style.display = 'none';
        loginForm.style.visibility = 'hidden';
    }
    if (registerForm) {
        registerForm.classList.remove('active');
        registerForm.style.display = 'none';
        registerForm.style.visibility = 'hidden';
    }
}

// Garantir que o sidebar esteja sempre visível quando o usuário estiver logado
function garantirSidebarVisivel() {
    const token = localStorage.getItem('token');
    if (token && sidebarMenu) {
        sidebarMenu.style.display = 'block';
        const container = document.querySelector('.container');
        if (container && !container.classList.contains('with-sidebar')) {
            container.classList.add('with-sidebar');
        }
    }
}

// Configurar itens do menu baseado no ID do usuário
function configurarItensMenu(usuarioId) {
    const menuAdmin = document.getElementById('menuAdmin');
    const menuConfig = document.getElementById('menuConfig');
    
    if (menuAdmin && menuConfig) {
        if (usuarioId === 1) {
            // Admin (ID 1) - mostrar Administração e Configuração
            menuAdmin.style.display = 'block';
            menuConfig.style.display = 'block';
        } else {
            // Usuário comum - esconder Administração e Configuração
            menuAdmin.style.display = 'none';
            menuConfig.style.display = 'none';
        }
    }
}

// Restaurar seção salva
async function restaurarSecaoSalva() {
    // Primeiro, carregar dados do usuário para ter currentUserId
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return; // Não está logado, deixar formulário de login visível
        }
        
        const response = await fetch(`${API_URL}/perfil`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('secaoAtual');
            return;
        }

        const data = await response.json();
        currentUserId = data.usuario.id;
        
        // Esconder formulários de login/registro imediatamente quando logado
        esconderFormulariosLogin();
        
        // Garantir que o sidebar esteja visível ao restaurar seção
        garantirSidebarVisivel();
        
        // Configurar itens do menu baseado no ID do usuário
        configurarItensMenu(currentUserId);

        const secaoSalva = localStorage.getItem('secaoAtual');
        if (!secaoSalva) {
            // Se não há seção salva, mostrar perfil padrão
            if (!data.usuario.perfil_completo) {
                mostrarFormularioPerfilCompleto(data.usuario, data.relacionamentos || []);
            } else {
                mostrarPerfilCompleto(data);
            }
            return;
        }

        // Restaurar seção salva
        switch(secaoSalva) {
            case 'inicio':
                await mostrarSecaoInicio();
                break;
            case 'perfil':
                if (!data.usuario.perfil_completo) {
                    mostrarFormularioPerfilCompleto(data.usuario, data.relacionamentos || []);
                } else {
                    mostrarPerfilCompleto(data);
                }
                break;
            case 'editar':
                mostrarFormularioPerfilCompleto(data.usuario, data.relacionamentos || []);
                break;
            case 'admin':
                if (currentUserId === 1) {
                    await mostrarSecaoAdmin();
                } else {
                    mostrarPerfilCompleto(data);
                }
                break;
            case 'config':
                if (currentUserId === 1) {
                    await mostrarSecaoConfig();
                } else {
                    mostrarPerfilCompleto(data);
                }
                break;
            default:
                if (!data.usuario.perfil_completo) {
                    mostrarFormularioPerfilCompleto(data.usuario, data.relacionamentos || []);
                } else {
                    mostrarPerfilCompleto(data);
                }
        }
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('secaoAtual');
    }
}

// Alternar entre formulários
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    limparMensagem();
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    limparMensagem();
});

// Login
loginFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparMensagem();

    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value;

    if (!email || !senha) {
        mostrarMensagem('Preencha todos os campos', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUserId = data.usuario.id;
            salvarSecaoAtual('perfil'); // Salvar seção padrão após login
            mostrarMensagem(`Login realizado com sucesso! ID: ${data.usuario.id}`, 'success');
            
            // Esconder formulários de login/registro IMEDIATAMENTE e FORÇADAMENTE
            if (loginForm) {
                loginForm.classList.remove('active');
                loginForm.style.display = 'none';
                loginForm.style.visibility = 'hidden';
            }
            if (registerForm) {
                registerForm.classList.remove('active');
                registerForm.style.display = 'none';
                registerForm.style.visibility = 'hidden';
            }
            
            // Garantir que o sidebar esteja visível
            garantirSidebarVisivel();
            
            // Configurar itens do menu baseado no ID do usuário
            configurarItensMenu(currentUserId);
            
            setTimeout(async () => {
                await carregarPerfilCompleto();
            }, 1500);
        } else {
            mostrarMensagem(data.erro || 'Erro ao fazer login', 'error');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        mostrarMensagem('Erro ao conectar com o servidor. Verifique se o servidor está rodando.', 'error');
    }
});

// Carregar ocupações para o select de cadastro
async function carregarOcupacoes() {
    try {
        const response = await fetch(`${API_URL}/ocupacoes`);
        const data = await response.json();
        
        if (response.ok && data.ocupacoes) {
            const selectOcupacao = document.getElementById('registerOcupacao');
            if (selectOcupacao) {
                selectOcupacao.innerHTML = '<option value="">Selecione uma ocupação...</option>';
                data.ocupacoes.forEach(ocupacao => {
                    const option = document.createElement('option');
                    option.value = ocupacao.id;
                    option.textContent = ocupacao.nome;
                    selectOcupacao.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar ocupações:', error);
    }
}

// Carregar igrejas para o select de cadastro (rota pública)
async function carregarIgrejasPublicas() {
    try {
        const response = await fetch(`${API_URL}/igrejas-publicas`);
        const data = await response.json();
        
        if (response.ok && data.igrejas) {
            const selectIgreja = document.getElementById('registerIgreja');
            if (selectIgreja) {
                selectIgreja.innerHTML = '<option value="">Selecione uma igreja (opcional)...</option>';
                data.igrejas.forEach(igreja => {
                    const option = document.createElement('option');
                    option.value = igreja.id;
                    option.textContent = igreja.nome;
                    selectIgreja.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar igrejas:', error);
        // Se a rota não existir, deixar vazio
        const selectIgreja = document.getElementById('registerIgreja');
        if (selectIgreja) {
            selectIgreja.innerHTML = '<option value="">Nenhuma igreja disponível</option>';
        }
    }
}

// Carregar ocupações e igrejas quando a página carregar
window.addEventListener('DOMContentLoaded', () => {
    carregarOcupacoes();
    carregarIgrejasPublicas();
});

// Carregar ocupações e igrejas para o formulário de perfil
async function carregarOcupacoesEIgrejasPerfil(ocupacaoIdSelecionada = null, igrejaIdSelecionada = null) {
    try {
        // Carregar ocupações
        const ocupResponse = await fetch(`${API_URL}/ocupacoes`);
        const ocupData = await ocupResponse.json();
        
        if (ocupResponse.ok && ocupData.ocupacoes) {
            const selectOcupacao = document.getElementById('perfilOcupacao');
            if (selectOcupacao) {
                selectOcupacao.innerHTML = '<option value="">Selecione uma ocupação...</option>';
                ocupData.ocupacoes.forEach(ocupacao => {
                    const option = document.createElement('option');
                    option.value = ocupacao.id;
                    option.textContent = ocupacao.nome;
                    if (ocupacaoIdSelecionada && ocupacao.id == ocupacaoIdSelecionada) {
                        option.selected = true;
                    }
                    selectOcupacao.appendChild(option);
                });
            }
        }

        // Carregar igrejas
        const igrejaResponse = await fetch(`${API_URL}/igrejas-publicas`);
        const igrejaData = await igrejaResponse.json();
        
        if (igrejaResponse.ok && igrejaData.igrejas) {
            const selectIgreja = document.getElementById('perfilIgreja');
            if (selectIgreja) {
                selectIgreja.innerHTML = '<option value="">Selecione uma igreja (opcional)...</option>';
                igrejaData.igrejas.forEach(igreja => {
                    const option = document.createElement('option');
                    option.value = igreja.id;
                    option.textContent = igreja.nome;
                    if (igrejaIdSelecionada && igreja.id == igrejaIdSelecionada) {
                        option.selected = true;
                    }
                    selectIgreja.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar ocupações e igrejas:', error);
    }
}

// Registro
registerFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparMensagem();

    const nome = document.getElementById('registerNome')?.value?.trim();
    const email = document.getElementById('registerEmail')?.value?.trim();
    const cpf = document.getElementById('registerCpf')?.value.replace(/\D/g, '');
    const ocupacaoId = document.getElementById('registerOcupacao')?.value;
    const igrejaId = document.getElementById('registerIgreja')?.value;
    const senha = document.getElementById('registerSenha')?.value;

    console.log('[Frontend] Dados do registro:', { nome, email, cpf: cpf ? '***' : '', ocupacaoId, igrejaId, senha: senha ? '***' : '' });

    // Validação básica
    if (!nome || !email || !cpf || !senha) {
        mostrarMensagem('Preencha todos os campos obrigatórios', 'error');
        return;
    }

    if (!ocupacaoId) {
        mostrarMensagem('Selecione uma ocupação', 'error');
        return;
    }

    if (senha.length < 6) {
        mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }

    try {
        const bodyData = { 
            nome, 
            email, 
            senha, 
            cpf, 
            ocupacao_id: parseInt(ocupacaoId)
        };
        
        // Adicionar igreja_id se foi selecionada
        if (igrejaId) {
            bodyData.igreja_id = parseInt(igrejaId);
        }

        console.log('[Frontend] Enviando registro...', { ...bodyData, senha: '***', cpf: '***' });

        const response = await fetch(`${API_URL}/registro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();
        console.log('[Frontend] Resposta do registro:', data);

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUserId = data.usuario.id;
            salvarSecaoAtual('editar'); // Salvar seção de edição após registro (para completar perfil)
            mostrarMensagem(`Cadastro realizado com sucesso! ID: ${data.usuario.id}`, 'success');
            // Esconder formulário de registro e ir direto ao perfil
            // Esconder formulários de login/registro IMEDIATAMENTE e FORÇADAMENTE
            if (loginForm) {
                loginForm.classList.remove('active');
                loginForm.style.display = 'none';
                loginForm.style.visibility = 'hidden';
            }
            if (registerForm) {
                registerForm.classList.remove('active');
                registerForm.style.display = 'none';
                registerForm.style.visibility = 'hidden';
            }
            
            // Garantir que o sidebar esteja visível
            garantirSidebarVisivel();
            
            // Configurar itens do menu baseado no ID do usuário
            configurarItensMenu(currentUserId);
            
            setTimeout(async () => {
                await carregarPerfilCompleto();
            }, 1500);
        } else {
            // Se CPF já existe, mostrar ID da conta
            if (data.conta_existente) {
                mostrarMensagem(`${data.mensagem || 'CPF já cadastrado'}. ID da conta: ${data.conta_existente.id}`, 'error');
            } else {
                mostrarMensagem(data.erro || 'Erro ao cadastrar', 'error');
            }
        }
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
});

// Botão cancelar perfil completo
const cancelarPerfilCompleto = document.getElementById('cancelarPerfilCompleto');
if (cancelarPerfilCompleto) {
    cancelarPerfilCompleto.addEventListener('click', () => {
        if (confirm('Deseja cancelar? As alterações não serão salvas.')) {
            perfilCompletoForm.style.display = 'none';
            profileSection.style.display = 'block';
            carregarPerfilCompleto();
        }
    });
}

// Botão editar perfil
const editarPerfilBtn = document.getElementById('editarPerfilBtn');
if (editarPerfilBtn) {
    editarPerfilBtn.addEventListener('click', async () => {
        await carregarDadosParaEdicao();
    });
}

// Carregar dados para edição - SEMPRE busca dados atualizados do cadastro oficial
async function carregarDadosParaEdicao() {
    salvarSecaoAtual('perfil');
    // Garantir que o sidebar esteja visível
    garantirSidebarVisivel();
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            fazerLogout();
            return;
        }

        // Adicionar timestamp para evitar cache - sempre busca dados atualizados
        const timestamp = new Date().getTime();
        const response = await fetch(`${API_URL}/perfil?t=${timestamp}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            cache: 'no-store' // Forçar busca sem cache
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Dados para edição recebidos (oficial):', data);
            mostrarFormularioPerfilCompleto(data.usuario, data.relacionamentos || []);
        } else {
            if (response.status === 401) {
                fazerLogout();
            } else {
                mostrarMensagem('Erro ao carregar dados', 'error');
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dados para edição:', error);
        mostrarMensagem('Erro ao carregar dados', 'error');
    }
}

// Configurar botão Editar Perfil
document.addEventListener('DOMContentLoaded', () => {
    const btnEditarPerfil = document.getElementById('btnEditarPerfil');
    if (btnEditarPerfil) {
        btnEditarPerfil.addEventListener('click', () => {
            carregarDadosParaEdicao();
        });
    }
});

// Formulário de perfil completo - usar delegação de eventos para garantir que funcione
document.addEventListener('submit', async (e) => {
    // Verificar se é o formulário de perfil completo
    if (e.target && e.target.id === 'perfilCompletoFormElement') {
        e.preventDefault();
        console.log('Formulário de perfil submetido');
        limparMensagem();

        const nome_completo = document.getElementById('nomeCompleto')?.value.trim();
        const cpfInput = document.getElementById('cpf');
        // Se CPF estiver readonly, não enviar (já está cadastrado)
        const cpf = cpfInput?.readOnly ? null : cpfInput?.value.replace(/\D/g, '');
        const endereco = document.getElementById('endereco')?.value.trim();
        const cep = document.getElementById('cep')?.value.replace(/\D/g, '');
        const telefone = document.getElementById('telefone')?.value.replace(/\D/g, '');
        const estado_civil = document.getElementById('estadoCivil')?.value;
        const ocupacao_id = document.getElementById('perfilOcupacao')?.value;
        const igreja_id = document.getElementById('perfilIgreja')?.value;
        const temFilhos = document.getElementById('temFilhos')?.value;

        // Validação básica
        if (!nome_completo || !endereco || !telefone) {
            mostrarMensagem('Preencha todos os campos obrigatórios (Nome completo, Endereço e Telefone)', 'error');
            return;
        }

        // Validar ocupação (obrigatória)
        if (!ocupacao_id) {
            mostrarMensagem('Selecione uma ocupação', 'error');
            return;
        }

        // Coletar dados dos filhos e validar CPFs duplicados
        const filhos = [];
        const cpfsUsados = new Set();
        
        console.log('[Frontend] Verificando filhos. temFilhos:', temFilhos);
        
        if (temFilhos === 'sim') {
            const quantidade = parseInt(document.getElementById('quantidadeFilhos')?.value || 0);
            console.log('[Frontend] Quantidade de filhos informada:', quantidade);
            
            if (quantidade === 0 || isNaN(quantidade)) {
                mostrarMensagem('Se você tem filhos, informe a quantidade de filhos.', 'error');
                return;
            }
            
            for (let i = 1; i <= quantidade; i++) {
                const filhoId = document.getElementById(`filhoId${i}`)?.value;
                const nome = document.getElementById(`filhoNome${i}`)?.value?.trim();
                const cpfFilho = document.getElementById(`filhoCpf${i}`)?.value.replace(/\D/g, '');
                const email = document.getElementById(`filhoEmail${i}`)?.value?.trim();
                const telefoneFilho = document.getElementById(`filhoTelefone${i}`)?.value.replace(/\D/g, '');

                console.log(`[Frontend] Filho ${i}:`, { filhoId, nome, cpfFilho, email, telefoneFilho });

                // Validar CPF duplicado entre filhos
                if (cpfFilho && cpfsUsados.has(cpfFilho)) {
                    mostrarMensagem(`CPF ${cpfFilho} está duplicado nos filhos. Cada filho deve ter um CPF único.`, 'error');
                    return;
                }
                
                if (cpfFilho) {
                    cpfsUsados.add(cpfFilho);
                }

                // Se tem ID, usar para vincular diretamente
                if (filhoId) {
                    filhos.push({
                        id: parseInt(filhoId),
                        vincular_existente: true
                    });
                    console.log(`[Frontend] Filho ${i} será vinculado pelo ID:`, filhoId);
                } else if (nome && cpfFilho) {
                    // Criar novo filho
                    filhos.push({
                        nome_completo: nome,
                        cpf: cpfFilho,
                        email: email || null,
                        telefone: telefoneFilho || null
                    });
                    console.log(`[Frontend] Filho ${i} será criado:`, { nome, cpfFilho });
                } else if (nome || cpfFilho) {
                    // Tem nome OU CPF, mas não ambos - avisar
                    mostrarMensagem(`Filho ${i}: É necessário informar Nome e CPF para criar um novo filho, ou vincular um filho existente pelo ID.`, 'error');
                    return;
                }
            }
            
            // Se tem filhos selecionado mas nenhum filho foi preenchido
            if (filhos.length === 0 && quantidade > 0) {
                mostrarMensagem('Preencha os dados de pelo menos um filho ou vincule um filho existente pelo ID.', 'error');
                return;
            }
        }
        
        console.log('[Frontend] Total de filhos a serem processados:', filhos.length);
        
        // Validar se o CPF do usuário não está duplicado com os filhos
        if (cpf && cpfsUsados.has(cpf)) {
            mostrarMensagem('O CPF informado não pode ser o mesmo de um dos filhos.', 'error');
            return;
        }

        try {
            console.log('[Frontend] Enviando dados do perfil completo...', { 
                nome_completo, 
                ocupacao_id, 
                igreja_id, 
                temFilhos,
                quantidadeFilhos: filhos.length,
                filhos: filhos 
            });
            const token = localStorage.getItem('token');
            
            if (!token) {
                mostrarMensagem('Sessão expirada. Faça login novamente.', 'error');
                return;
            }

            const bodyData = { 
                nome_completo, 
                cpf, 
                endereco, 
                cep, 
                telefone, 
                estado_civil, 
                ocupacao_id: ocupacao_id ? parseInt(ocupacao_id) : null, 
                igreja_id: igreja_id ? parseInt(igreja_id) : null, 
                filhos 
            };
            
            console.log('[Frontend] Dados que serão enviados:', bodyData);

            const response = await fetch(`${API_URL}/perfil/completo`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bodyData)
            });

            const data = await response.json();
            console.log('Resposta do servidor:', data);

            if (response.ok) {
                mostrarMensagem('Alteração concluída e salva com sucesso!', 'success');
                
                // Após salvar, sair da tela de edição e ir para a visualização do perfil
                setTimeout(async () => {
                    // Esconder formulário de edição
                    if (perfilCompletoForm) {
                        perfilCompletoForm.style.display = 'none';
                    }
                    
                    // Mostrar seção de perfil
                    if (profileSection) {
                        profileSection.style.display = 'block';
                    }
                    
                    // Atualizar menu ativo para "Meu Perfil"
                    document.querySelectorAll('.menu-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    const menuPerfil = document.querySelector('[data-section="perfil"]');
                    if (menuPerfil) {
                        menuPerfil.classList.add('active');
                    }
                    
                    // Salvar seção atual
                    salvarSecaoAtual('perfil');
                    
                    // Recarregar dados atualizados do perfil
                    await carregarPerfilCompleto();
                    
                    // Se for admin, também recarregar dados da administração (sem mudar de página)
                    if (currentUserId === 1 && adminSection && adminSection.style.display !== 'none') {
                        await carregarDadosAdmin();
                    }
                }, 1000);
            } else {
                console.error('Erro ao atualizar perfil:', data);
                mostrarMensagem(data.erro || 'Erro ao atualizar perfil', 'error');
            }
        } catch (error) {
            console.error('Erro ao conectar com o servidor:', error);
            mostrarMensagem('Erro ao conectar com o servidor. Verifique se o servidor está rodando.', 'error');
        }
    }
});

// Configurar navegação do menu
function configurarNavegacaoMenu() {
    // Remover listeners anteriores para evitar duplicação
    document.querySelectorAll('.menu-item').forEach(item => {
        // Clonar o elemento para remover listeners antigos
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        newItem.addEventListener('click', async (e) => {
            e.preventDefault();
            const section = newItem.getAttribute('data-section');
            
            // Atualizar menu ativo
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            newItem.classList.add('active');
            
            // Salvar seção atual
            salvarSecaoAtual(section);
            
            // Navegar para seção
            switch(section) {
                case 'inicio':
                    await mostrarSecaoInicio();
                    break;
                case 'perfil':
                    mostrarSecaoPerfil();
                    break;
                case 'admin':
                    await mostrarSecaoAdmin();
                    break;
                case 'config':
                    await mostrarSecaoConfig();
                    break;
                case 'logout':
                    fazerLogout();
                    break;
            }
        });
    });
}

// Mostrar seção de perfil
function mostrarSecaoPerfil() {
    salvarSecaoAtual('perfil');
    
    // Esconder formulários de login/registro
    esconderFormulariosLogin();
    
    // Garantir que o sidebar esteja visível
    garantirSidebarVisivel();
    
    // Esconder TODAS as outras seções primeiro
    if (inicioSection) inicioSection.style.display = 'none';
    if (perfilCompletoForm) perfilCompletoForm.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
    if (configSection) configSection.style.display = 'none';
    
    // Mostrar menu e seção de perfil
    if (sidebarMenu) sidebarMenu.style.display = 'block';
    if (profileSection) profileSection.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Meu Perfil';
    
    // Adicionar classe with-sidebar ao container
    const container = document.querySelector('.container');
    if (container) container.classList.add('with-sidebar');
    
    // Atualizar menu ativo
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    const menuPerfil = document.querySelector('[data-section="perfil"]');
    if (menuPerfil) menuPerfil.classList.add('active');
    
    // Garantir que a navegação do menu esteja configurada
    configurarNavegacaoMenu();
    
    // SEMPRE recarrega dados atualizados do cadastro oficial
    console.log('Carregando perfil com dados atualizados do cadastro oficial...');
    carregarPerfilCompleto();
}

// Mostrar seção administrativa
async function mostrarSecaoAdmin() {
    if (currentUserId !== 1) {
        mostrarMensagem('Acesso negado. Apenas administradores podem acessar esta área.', 'error');
        return;
    }
    
    salvarSecaoAtual('admin');
    
    // Esconder formulários de login/registro
    esconderFormulariosLogin();
    
    // Garantir que o sidebar esteja visível
    garantirSidebarVisivel();
    
    // Configurar itens do menu (garantir que Administração e Configuração estejam visíveis)
    configurarItensMenu(currentUserId);
    
    // Esconder TODAS as outras seções primeiro
    if (inicioSection) inicioSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (perfilCompletoForm) perfilCompletoForm.style.display = 'none';
    if (configSection) configSection.style.display = 'none';
    
    // Mostrar menu e seção admin
    if (sidebarMenu) sidebarMenu.style.display = 'block';
    if (adminSection) adminSection.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Área Administrativa';
    
    // Adicionar classe with-sidebar ao container
    const container = document.querySelector('.container');
    if (container) container.classList.add('with-sidebar');
    
    // Atualizar menu ativo
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    const menuAdmin = document.querySelector('[data-section="admin"]');
    if (menuAdmin) menuAdmin.classList.add('active');
    
    // Garantir que a navegação do menu esteja configurada
    configurarNavegacaoMenu();
    
    await carregarDadosAdmin();
}

// Carregar dados administrativos - SEMPRE busca dados atualizados do SQL
// NÃO armazena dados localmente - sempre busca do banco de dados
async function carregarDadosAdmin() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            fazerLogout();
            return;
        }

        // Adicionar timestamp para evitar cache - sempre buscar dados frescos do SQL
        const timestamp = new Date().getTime();
        const response = await fetch(`${API_URL}/admin/usuarios?t=${timestamp}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            cache: 'no-store' // Forçar busca sem cache - sempre do SQL
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`[Frontend] ${data.usuarios.length} perfis recebidos do SQL (dados atualizados)`);
            
            // NÃO armazenar localmente - sempre usar dados do servidor
            // Os dados vêm diretamente do SQL, sem cache
            await carregarFiltros(data.usuarios);
            // Aplicar filtros usando dados frescos do SQL
            aplicarFiltrosComDados(data.usuarios);
        } else {
            if (response.status === 401) {
                fazerLogout();
            } else {
                mostrarMensagem(data.erro || 'Erro ao carregar dados', 'error');
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dados administrativos:', error);
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Carregar opções de filtros
async function carregarFiltros(usuarios) {
    const filtrosAdmin = document.getElementById('filtrosAdmin');
    if (!filtrosAdmin) return;

    // Mostrar área de filtros apenas se não estiver editando
    // Verificar se não há formulário de edição ativo
    const formEditarUsuario = document.getElementById('formEditarUsuario');
    if (!formEditarUsuario) {
        filtrosAdmin.style.display = 'block';
    }

    // Buscar igrejas e ocupações
    const token = localStorage.getItem('token');
    
    try {
        // Carregar igrejas
        const igrejasResponse = await fetch(`${API_URL}/admin/igrejas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const igrejasData = await igrejasResponse.json();
        const igrejas = igrejasData.igrejas || [];

        // Carregar ocupações
        const ocupacoesResponse = await fetch(`${API_URL}/ocupacoes`);
        const ocupacoesData = await ocupacoesResponse.json();
        const ocupacoes = ocupacoesData.ocupacoes || [];

        // Preencher select de igrejas
        const filtroIgreja = document.getElementById('filtroIgreja');
        if (filtroIgreja) {
            filtroIgreja.innerHTML = '<option value="">Todas</option>';
            igrejas.forEach(igreja => {
                const option = document.createElement('option');
                option.value = igreja.id;
                option.textContent = igreja.nome;
                filtroIgreja.appendChild(option);
            });
        }

        // Preencher select de ocupações
        const filtroOcupacao = document.getElementById('filtroOcupacao');
        if (filtroOcupacao) {
            filtroOcupacao.innerHTML = '<option value="">Todas</option>';
            ocupacoes.forEach(ocupacao => {
                const option = document.createElement('option');
                option.value = ocupacao.id;
                option.textContent = ocupacao.nome;
                filtroOcupacao.appendChild(option);
            });
        }

        // Adicionar eventos para filtros automáticos
        const filtroId = document.getElementById('filtroId');
        const filtroNome = document.getElementById('filtroNome');
        const filtroCpf = document.getElementById('filtroCpf');

        if (filtroIgreja) {
            filtroIgreja.addEventListener('change', aplicarFiltros);
        }
        if (filtroOcupacao) {
            filtroOcupacao.addEventListener('change', aplicarFiltros);
        }
        if (filtroId) {
            filtroId.addEventListener('input', aplicarFiltros);
        }
        if (filtroNome) {
            filtroNome.addEventListener('input', aplicarFiltros);
        }
        if (filtroCpf) {
            filtroCpf.addEventListener('input', aplicarFiltros);
        }
    } catch (error) {
        console.error('Erro ao carregar filtros:', error);
    }
}

// Aplicar filtros - SEMPRE busca dados atualizados do SQL antes de filtrar
window.aplicarFiltros = async function() {
    // SEMPRE buscar dados atualizados do SQL antes de filtrar
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            fazerLogout();
            return;
        }

        const timestamp = new Date().getTime();
        const response = await fetch(`${API_URL}/admin/usuarios?t=${timestamp}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            mostrarMensagem('Erro ao buscar dados atualizados do SQL', 'error');
            return;
        }

        const data = await response.json();
        const todosUsuarios = data.usuarios; // Dados frescos do SQL

        // Aplicar filtros nos dados atualizados do SQL
        aplicarFiltrosComDados(todosUsuarios);
    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        mostrarMensagem('Erro ao buscar dados atualizados', 'error');
    }
}

// Função auxiliar para aplicar filtros com dados fornecidos (do SQL)
// Esta função recebe dados DIRETAMENTE do SQL, sem cache
function aplicarFiltrosComDados(usuariosDoSQL) {
    if (!usuariosDoSQL || usuariosDoSQL.length === 0) {
        exibirUsuariosAdmin([]);
        return;
    }

    console.log(`[Frontend] Aplicando filtros em ${usuariosDoSQL.length} usuários (dados do SQL)`);

    const filtroIgreja = document.getElementById('filtroIgreja')?.value || '';
    const filtroOcupacao = document.getElementById('filtroOcupacao')?.value || '';
    const filtroId = document.getElementById('filtroId')?.value.trim() || '';
    const filtroNome = document.getElementById('filtroNome')?.value.trim().toLowerCase() || '';
    const filtroCpf = document.getElementById('filtroCpf')?.value.replace(/\D/g, '') || '';

    // Filtrar dados que vieram DIRETAMENTE do SQL
    let usuariosFiltrados = usuariosDoSQL.filter(usuario => {
        // Filtro por Igreja
        if (filtroIgreja && usuario.igreja_id != filtroIgreja) {
            return false;
        }

        // Filtro por Ocupação
        if (filtroOcupacao && usuario.ocupacao_id != filtroOcupacao) {
            return false;
        }

        // Filtro por ID
        if (filtroId && usuario.id.toString() !== filtroId) {
            return false;
        }

        // Filtro por Nome
        if (filtroNome) {
            const nomeCompleto = (usuario.nome_completo || '').toLowerCase();
            const nome = (usuario.nome || '').toLowerCase();
            if (!nomeCompleto.includes(filtroNome) && !nome.includes(filtroNome)) {
                return false;
            }
        }

        // Filtro por CPF
        if (filtroCpf) {
            const cpfUsuario = (usuario.cpf || '').replace(/\D/g, '');
            if (!cpfUsuario.includes(filtroCpf)) {
                return false;
            }
        }

        return true;
    });

    exibirUsuariosAdmin(usuariosFiltrados);
}

// Limpar filtros - recarrega dados atualizados do SQL
window.limparFiltros = function() {
    document.getElementById('filtroIgreja').value = '';
    document.getElementById('filtroOcupacao').value = '';
    document.getElementById('filtroId').value = '';
    document.getElementById('filtroNome').value = '';
    document.getElementById('filtroCpf').value = '';
    // Recarregar dados atualizados do SQL
    aplicarFiltros();
}

// Exibir usuários na área administrativa
function exibirUsuariosAdmin(usuarios) {
    const adminContent = document.getElementById('adminContent');
    
    // Mostrar filtros quando exibir lista de usuários (não quando estiver editando)
    const filtrosAdmin = document.getElementById('filtrosAdmin');
    if (filtrosAdmin) {
        filtrosAdmin.style.display = 'block';
    }
    
    if (!usuarios || usuarios.length === 0) {
        adminContent.innerHTML = '<p style="text-align: center; color: #666;">Nenhum usuário cadastrado.</p>';
        return;
    }
    
    const totalFiltrado = usuarios.length;
    
    adminContent.innerHTML = `
        <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <p style="color: #666;">
                <strong>Total de membros exibidos:</strong> ${totalFiltrado}
            </p>
            <p style="color: #999; font-size: 12px; margin: 0;">Dados atualizados diretamente do SQL</p>
        </div>
        <div style="display: grid; gap: 15px;">
            ${usuarios.map((usuario, index) => `
                <div class="user-card" style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="user-card-header">
                        <h3 style="color: #667eea; margin-bottom: 10px; margin: 0; flex: 1;">ID: ${usuario.id} - ${usuario.nome_completo || usuario.nome}</h3>
                        <div class="menu-dots">
                            <button class="menu-dots-button" onclick="toggleMenu(${index})">⋯</button>
                            <div class="menu-dropdown" id="menu-${index}">
                                <div class="menu-dropdown-item" onclick="editarUsuario(${usuario.id})">Alterar</div>
                                <div class="menu-dropdown-item delete" onclick="excluirUsuario(${usuario.id}, '${(usuario.nome_completo || usuario.nome).replace(/'/g, "\\'")}')">Excluir</div>
                            </div>
                        </div>
                    </div>
                    <div style="background: #e9ecef; padding: 12px; border-radius: 6px; margin-bottom: 15px; display: flex; gap: 20px; flex-wrap: wrap;">
                        <p style="margin: 0;"><strong style="color: #667eea;">Ocupação:</strong> <span style="color: #333;">${usuario.ocupacao_nome || 'Não definida'}</span></p>
                        <p style="margin: 0;"><strong style="color: #667eea;">Igreja:</strong> <span style="color: #333;">${usuario.igreja_nome ? `${usuario.igreja_nome}${usuario.igreja_funcao ? ` (${usuario.igreja_funcao})` : ''}` : 'Não vinculada'}</span></p>
                    </div>
                    <p><strong>Email:</strong> ${usuario.email}</p>
                    ${usuario.cpf ? `<p><strong>CPF:</strong> ${usuario.cpf}</p>` : ''}
                    ${usuario.telefone ? `<p><strong>Telefone:</strong> ${usuario.telefone}</p>` : ''}
                    ${usuario.endereco ? `<p><strong>Endereço:</strong> ${usuario.endereco}</p>` : ''}
                    ${usuario.estado_civil ? `<p><strong>Estado Civil:</strong> ${formatarEstadoCivil(usuario.estado_civil)}</p>` : ''}
                    ${usuario.tem_conjuge ? `<p><strong>Cônjuge:</strong> ${usuario.conjuge.nome_completo || usuario.conjuge.nome} (ID: ${usuario.conjuge.relacionado_id})</p>` : ''}
                    <p><strong>Tem filhos?</strong> ${usuario.tem_filhos ? `Sim (${usuario.quantidade_filhos} ${usuario.quantidade_filhos === 1 ? 'filho' : 'filhos'})` : 'Não'}</p>
                    ${usuario.tem_filhos && usuario.filhos ? `
                        <div style="margin-top: 10px; padding: 10px; background: #e7f3ff; border-radius: 5px;">
                            <strong style="color: #667eea;">Filhos:</strong>
                            <ul style="margin: 5px 0 0 20px; padding: 0;">
                                ${usuario.filhos.map(filho => `
                                    <li style="margin: 5px 0;">
                                        ${filho.nome_completo || filho.nome} (ID: ${filho.relacionado_id})
                                        ${filho.cpf ? ` - CPF: ${filho.cpf}` : ''}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    <p style="color: #999; font-size: 12px; margin-top: 10px;">
                        Cadastrado em: ${new Date(usuario.criado_em).toLocaleString('pt-BR')}
                    </p>
                </div>
            `).join('')}
        </div>
    `;
}

// Toggle menu dropdown
window.toggleMenu = function(index) {
    // Fechar todos os outros menus
    document.querySelectorAll('.menu-dropdown').forEach((menu, i) => {
        if (i !== index) {
            menu.classList.remove('show');
        }
    });
    
    // Toggle do menu atual
    const menu = document.getElementById(`menu-${index}`);
    menu.classList.toggle('show');
}

// Fechar menus ao clicar fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-dots')) {
        document.querySelectorAll('.menu-dropdown').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

// Excluir usuário
window.excluirUsuario = async function(usuarioId, nomeUsuario) {
    if (!confirm(`Tem certeza que deseja excluir permanentemente o cadastro de "${nomeUsuario}"?\n\nEsta ação não pode ser desfeita!`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/usuarios/${usuarioId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            mostrarMensagem('Usuário excluído permanentemente com sucesso!', 'success');
            await carregarDadosAdmin();
        } else {
            mostrarMensagem(data.erro || 'Erro ao excluir usuário', 'error');
        }
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Editar usuário
window.editarUsuario = async function(usuarioId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            fazerLogout();
            return;
        }
        
        // SEMPRE buscar dados atualizados do SQL
        const timestamp = new Date().getTime();
        const response = await fetch(`${API_URL}/admin/usuarios?t=${timestamp}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            cache: 'no-store' // Forçar busca sem cache - sempre do SQL
        });

        if (!response.ok) {
            mostrarMensagem('Erro ao buscar dados atualizados do SQL', 'error');
            return;
        }

        const data = await response.json();
        const usuario = data.usuarios.find(u => u.id === usuarioId);

        if (!usuario) {
            mostrarMensagem('Usuário não encontrado no banco de dados', 'error');
            return;
        }

        console.log('[Frontend] Dados do usuário recebidos do SQL:', {
            id: usuario.id,
            tem_filhos: usuario.tem_filhos,
            quantidade_filhos: usuario.quantidade_filhos,
            filhos: usuario.filhos,
            relacionamentos: usuario.relacionamentos
        });

        // Buscar ocupações disponíveis
        const ocupResponse = await fetch(`${API_URL}/ocupacoes`);
        const ocupData = await ocupResponse.json();
        const ocupacoes = ocupData.ocupacoes || [];

        // Buscar igrejas disponíveis
        const igrejasResponse = await fetch(`${API_URL}/admin/igrejas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const igrejasData = await igrejasResponse.json();
        const igrejas = igrejasData.igrejas || [];

        // Usar filhos que já vêm do SQL (dados oficiais do armazenamento)
        // Se não vierem na resposta, buscar separadamente como fallback
        let filhos = [];
        if (usuario.filhos && Array.isArray(usuario.filhos) && usuario.filhos.length > 0) {
            // Usar filhos que já vêm do SQL (dados oficiais)
            filhos = usuario.filhos;
            console.log('[Frontend] Usando filhos do SQL (dados oficiais):', filhos);
        } else if (usuario.relacionamentos && Array.isArray(usuario.relacionamentos)) {
            // Fallback: filtrar relacionamentos se vierem no objeto
            filhos = usuario.relacionamentos.filter(r => r.tipo === 'filho');
            console.log('[Frontend] Filtrando filhos dos relacionamentos:', filhos);
        } else {
            // Fallback: buscar separadamente se não vierem na resposta
            console.log('[Frontend] Buscando filhos separadamente (fallback)');
            const relacionamentosResponse = await fetch(`${API_URL}/admin/usuarios/${usuarioId}/relacionamentos`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (relacionamentosResponse.ok) {
                const relacionamentosData = await relacionamentosResponse.json();
                filhos = (relacionamentosData.relacionamentos || []).filter(r => r.tipo === 'filho');
                console.log('[Frontend] Filhos buscados separadamente:', filhos);
            }
        }

        console.log('[Frontend] Filhos finais para o formulário:', filhos);

        // Criar formulário de edição
        mostrarFormularioEdicaoUsuario(usuario, ocupacoes, igrejas, filhos);
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Mostrar formulário de edição
function mostrarFormularioEdicaoUsuario(usuario, ocupacoes, igrejas, filhos = []) {
    // Garantir que o sidebar esteja visível
    garantirSidebarVisivel();
    
    // Ocultar filtros quando estiver editando
    const filtrosAdmin = document.getElementById('filtrosAdmin');
    if (filtrosAdmin) {
        filtrosAdmin.style.display = 'none';
    }
    
    const adminContent = document.getElementById('adminContent');
    
    const ocupacoesOptions = ocupacoes.map(ocup => 
        `<option value="${ocup.id}" ${usuario.ocupacao_id == ocup.id ? 'selected' : ''}>${ocup.nome}</option>`
    ).join('');

    const igrejasOptions = igrejas.map(igreja => 
        `<option value="${igreja.id}" ${usuario.igreja_id == igreja.id ? 'selected' : ''}>${igreja.nome}</option>`
    ).join('');

    adminContent.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="color: #999; font-size: 14px; margin-bottom: 20px; opacity: 0.7;">Editar Cadastro - ID: ${usuario.id}</p>
            <form id="formEditarUsuario" onsubmit="salvarEdicaoUsuario(event, ${usuario.id})">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Ocupação:</label>
                        <select id="editOcupacao">
                            <option value="">Não definida</option>
                            ${ocupacoesOptions}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>Igreja:</label>
                        <select id="editIgreja">
                            <option value="">Não vinculada</option>
                            ${igrejasOptions}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Nome:</label>
                    <input type="text" id="editNome" value="${(usuario.nome || '').replace(/"/g, '&quot;')}" required>
                </div>
                <div class="form-group">
                    <label>Nome Completo:</label>
                    <input type="text" id="editNomeCompleto" value="${(usuario.nome_completo || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" id="editEmail" value="${(usuario.email || '').replace(/"/g, '&quot;')}" required>
                </div>
                <div class="form-group">
                    <label>CPF:</label>
                    <input type="text" id="editCpf" value="${usuario.cpf || ''}" placeholder="000.000.000-00">
                </div>
                <div class="form-group">
                    <label>Telefone:</label>
                    <input type="text" id="editTelefone" value="${usuario.telefone || ''}" placeholder="(00) 00000-0000">
                </div>
                <div class="form-group">
                    <label>Endereço:</label>
                    <input type="text" id="editEndereco" value="${(usuario.endereco || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label>CEP:</label>
                    <input type="text" id="editCep" value="${usuario.cep || ''}" placeholder="00000-000">
                </div>
                <div class="form-group">
                    <label>Estado Civil:</label>
                    <select id="editEstadoCivil">
                        <option value="">Selecione...</option>
                        <option value="solteiro" ${usuario.estado_civil === 'solteiro' ? 'selected' : ''}>Solteiro(a)</option>
                        <option value="casado" ${usuario.estado_civil === 'casado' ? 'selected' : ''}>Casado(a)</option>
                        <option value="divorciado" ${usuario.estado_civil === 'divorciado' ? 'selected' : ''}>Divorciado(a)</option>
                        <option value="viuvo" ${usuario.estado_civil === 'viuvo' ? 'selected' : ''}>Viúvo(a)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editTemFilhos">Tem filhos? *:</label>
                    <select id="editTemFilhos" required>
                        <option value="">Selecione...</option>
                        <option value="nao" ${filhos.length === 0 ? 'selected' : ''}>Não tenho</option>
                        <option value="sim" ${filhos.length > 0 ? 'selected' : ''}>Sim</option>
                    </select>
                    <small style="color: #666; font-size: 11px; display: block; margin-top: 5px;">
                        ${filhos.length > 0 ? `Dados do SQL: ${filhos.length} ${filhos.length === 1 ? 'filho' : 'filhos'} cadastrado(s)` : 'Dados do SQL: Nenhum filho cadastrado'}
                    </small>
                </div>
                <div id="editQuantidadeFilhosGroup" class="form-group" style="display: ${filhos.length > 0 ? 'block' : 'none'};">
                    <label for="editQuantidadeFilhos">Quantos filhos? *:</label>
                    <select id="editQuantidadeFilhos" required>
                        <option value="">Selecione a quantidade...</option>
                        ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${filhos.length === n ? 'selected' : ''}>${n} ${n === 1 ? 'filho' : 'filhos'}</option>`).join('')}
                    </select>
                </div>
                <div id="editCamposFilhos" style="display: ${filhos.length > 0 ? 'block' : 'none'}; margin-top: 20px;">
                    <h3 style="color: #667eea; margin-bottom: 15px; font-size: 18px;">Dados dos Filhos</h3>
                    <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
                        Você pode preencher manualmente ou buscar por ID de um cadastro existente
                    </p>
                    <div id="editListaFilhos"></div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                    <button type="button" class="btn btn-secondary" onclick="carregarDadosAdmin()">Cancelar</button>
                </div>
            </form>
        </div>
    `;

    // Aplicar máscaras
    aplicarMascarasEdicao();
    
    // Configurar campos de filhos
    configurarCamposFilhosEdicao(filhos);
}

// Configurar campos de filhos na edição
// Esta função garante que os campos sejam preenchidos com dados do SQL (armazenamento oficial)
function configurarCamposFilhosEdicao(filhos = []) {
    console.log('[Frontend] Configurando campos de filhos na edição:', {
        quantidade: filhos.length,
        filhos: filhos
    });
    
    const temFilhosSelect = document.getElementById('editTemFilhos');
    const quantidadeFilhosGroup = document.getElementById('editQuantidadeFilhosGroup');
    const quantidadeFilhosSelect = document.getElementById('editQuantidadeFilhos');
    const camposFilhos = document.getElementById('editCamposFilhos');
    const listaFilhos = document.getElementById('editListaFilhos');
    
    if (!temFilhosSelect || !quantidadeFilhosGroup || !quantidadeFilhosSelect || !camposFilhos || !listaFilhos) {
        console.error('[Frontend] Elementos do formulário não encontrados');
        return;
    }
    
    // Garantir que o campo "Tem filhos?" está correto baseado nos dados do SQL (armazenamento oficial)
    if (filhos.length > 0) {
        // TEM FILHOS - configurar baseado nos dados do SQL
        temFilhosSelect.value = 'sim';
        quantidadeFilhosGroup.style.display = 'block';
        quantidadeFilhosSelect.value = filhos.length;
        quantidadeFilhosSelect.required = true;
        camposFilhos.style.display = 'block';
        criarCamposFilhosEdicao(filhos.length, filhos);
        console.log('[Frontend] Campos configurados: TEM FILHOS (dados do SQL)');
    } else {
        // NÃO TEM FILHOS - configurar baseado nos dados do SQL
        temFilhosSelect.value = 'nao';
        quantidadeFilhosGroup.style.display = 'none';
        quantidadeFilhosSelect.value = '';
        quantidadeFilhosSelect.required = false;
        camposFilhos.style.display = 'none';
        if (listaFilhos) listaFilhos.innerHTML = '';
        console.log('[Frontend] Campos configurados: NÃO TEM FILHOS (dados do SQL)');
    }
    
    // Event listener para "Tem filhos?"
    temFilhosSelect.addEventListener('change', (e) => {
        if (e.target.value === 'sim') {
            quantidadeFilhosGroup.style.display = 'block';
            quantidadeFilhosSelect.required = true;
        } else if (e.target.value === 'nao') {
            quantidadeFilhosGroup.style.display = 'none';
            camposFilhos.style.display = 'none';
            quantidadeFilhosSelect.required = false;
            quantidadeFilhosSelect.value = '';
            listaFilhos.innerHTML = '';
            // Remover required de todos os campos
            for (let i = 1; i <= 10; i++) {
                const filhoNome = document.getElementById(`editFilhoNome${i}`);
                const filhoCpf = document.getElementById(`editFilhoCpf${i}`);
                if (filhoNome) filhoNome.required = false;
                if (filhoCpf) filhoCpf.required = false;
            }
        }
    });
    
    // Event listener para "Quantos filhos?"
    quantidadeFilhosSelect.addEventListener('change', (e) => {
        const quantidade = parseInt(e.target.value) || 0;
        if (quantidade > 0) {
            criarCamposFilhosEdicao(quantidade);
            camposFilhos.style.display = 'block';
            // Adicionar required apenas aos campos visíveis
            for (let i = 1; i <= quantidade; i++) {
                const filhoNome = document.getElementById(`editFilhoNome${i}`);
                const filhoCpf = document.getElementById(`editFilhoCpf${i}`);
                if (filhoNome) filhoNome.required = true;
                if (filhoCpf) filhoCpf.required = true;
            }
            // Remover required dos campos que não serão usados
            for (let i = quantidade + 1; i <= 10; i++) {
                const filhoNome = document.getElementById(`editFilhoNome${i}`);
                const filhoCpf = document.getElementById(`editFilhoCpf${i}`);
                if (filhoNome) filhoNome.required = false;
                if (filhoCpf) filhoCpf.required = false;
            }
        } else {
            camposFilhos.style.display = 'none';
            listaFilhos.innerHTML = '';
        }
    });
}

// Criar campos de filhos na edição
function criarCamposFilhosEdicao(quantidade, filhosExistentes = []) {
    const listaFilhos = document.getElementById('editListaFilhos');
    if (!listaFilhos) return;
    listaFilhos.innerHTML = '';
    
    // Remover required de todos os campos antigos
    for (let i = 1; i <= 10; i++) {
        const filhoNome = document.getElementById(`editFilhoNome${i}`);
        const filhoCpf = document.getElementById(`editFilhoCpf${i}`);
        if (filhoNome) filhoNome.required = false;
        if (filhoCpf) filhoCpf.required = false;
    }
    
    for (let i = 1; i <= quantidade; i++) {
        const filhoExistente = filhosExistentes[i - 1] || {};
        const filhoDiv = document.createElement('div');
        filhoDiv.className = 'form-group';
        filhoDiv.style.background = '#f8f9fa';
        filhoDiv.style.padding = '20px';
        filhoDiv.style.borderRadius = '8px';
        filhoDiv.style.marginBottom = '15px';
        filhoDiv.style.border = '2px solid #e0e0e0';
        
        const nomeValue = filhoExistente.nome_completo || filhoExistente.nome || '';
        const cpfValue = filhoExistente.cpf || '';
        const emailValue = filhoExistente.email || '';
        const telefoneValue = filhoExistente.telefone || '';
        // O ID pode vir como relacionado_id (da query de relacionamentos) ou id (se vier do objeto usuario.filhos)
        const idValue = filhoExistente.relacionado_id || filhoExistente.id || '';
        
        console.log(`[Frontend] Preenchendo dados do filho ${i}:`, {
            nome: nomeValue,
            cpf: cpfValue,
            id: idValue,
            filhoExistente: filhoExistente
        });
        
        // Formatar CPF
        let cpfFormatado = '';
        if (cpfValue) {
            const cpfLimpo = cpfValue.replace(/\D/g, '');
            cpfFormatado = cpfLimpo.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        
        // Formatar telefone
        let telefoneFormatado = '';
        if (telefoneValue) {
            const telLimpo = telefoneValue.replace(/\D/g, '');
            if (telLimpo.length <= 10) {
                telefoneFormatado = telLimpo.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
            } else {
                telefoneFormatado = telLimpo.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
            }
        }
        
        filhoDiv.innerHTML = `
            <h4 style="color: #667eea; margin-bottom: 15px; font-size: 16px;">Filho ${i}</h4>
            <div style="background: #e7f3ff; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Buscar cadastro existente por ID:</label>
                <div style="display: flex; gap: 5px;">
                    <input type="number" id="editFilhoBuscarId${i}" placeholder="ID do cadastro" value="${idValue}" style="flex: 1; padding: 8px; border: 2px solid #e0e0e0; border-radius: 5px;">
                    <button type="button" class="btn btn-primary" onclick="buscarFilhoPorIdEdicao(${i})" style="width: auto; padding: 8px 15px;">Buscar</button>
                </div>
            </div>
            <div class="form-group">
                <label for="editFilhoNome${i}">Nome Completo *:</label>
                <input type="text" id="editFilhoNome${i}" value="${nomeValue.replace(/"/g, '&quot;')}" required>
            </div>
            <div class="form-group">
                <label for="editFilhoCpf${i}">CPF *:</label>
                <input type="text" id="editFilhoCpf${i}" value="${cpfFormatado}" placeholder="000.000.000-00" required>
            </div>
            <div class="form-group">
                <label for="editFilhoEmail${i}">Email:</label>
                <input type="email" id="editFilhoEmail${i}" value="${emailValue.replace(/"/g, '&quot;')}">
            </div>
            <div class="form-group">
                <label for="editFilhoTelefone${i}">Telefone:</label>
                <input type="text" id="editFilhoTelefone${i}" value="${telefoneFormatado}" placeholder="(00) 00000-0000">
            </div>
            <input type="hidden" id="editFilhoId${i}" value="${idValue}">
        `;
        
        listaFilhos.appendChild(filhoDiv);
        
        // Aplicar máscaras
        const cpfInput = document.getElementById(`editFilhoCpf${i}`);
        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                    value = value.replace(/(\d{3})(\d)/, '$1.$2');
                    value = value.replace(/(\d{3})(\d)/, '$1.$2');
                    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    e.target.value = value;
                }
            });
        }
        
        const telefoneInput = document.getElementById(`editFilhoTelefone${i}`);
        if (telefoneInput) {
            telefoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                    if (value.length <= 10) {
                        value = value.replace(/(\d{2})(\d)/, '($1) $2');
                        value = value.replace(/(\d{4})(\d)/, '$1-$2');
                    } else {
                        value = value.replace(/(\d{2})(\d)/, '($1) $2');
                        value = value.replace(/(\d{5})(\d)/, '$1-$2');
                    }
                    e.target.value = value;
                }
            });
        }
    }
}

// Buscar filho por ID na edição
window.buscarFilhoPorIdEdicao = async function(index) {
    console.log(`[Frontend] Buscando filho por ID no índice ${index}`);
    
    const buscarIdInput = document.getElementById(`editFilhoBuscarId${index}`);
    if (!buscarIdInput) {
        console.error(`[Frontend] Campo editFilhoBuscarId${index} não encontrado`);
        mostrarMensagem('Erro: Campo de busca não encontrado', 'error');
        return;
    }
    
    const filhoId = buscarIdInput.value.trim();
    console.log(`[Frontend] ID informado: "${filhoId}"`);
    
    if (!filhoId || filhoId === '0' || isNaN(parseInt(filhoId))) {
        mostrarMensagem('Informe um ID válido', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarMensagem('Sessão expirada. Faça login novamente.', 'error');
            return;
        }
        
        console.log(`[Frontend] Buscando usuário com ID ${filhoId} no SQL...`);
        const response = await fetch(`${API_URL}/usuarios/buscar?id=${encodeURIComponent(filhoId)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        console.log('[Frontend] Resposta da busca:', data);
        
        if (response.ok && data.usuario) {
            const usuario = data.usuario;
            console.log('[Frontend] Usuário encontrado no SQL:', usuario);
            
            // Preencher campos com dados do SQL
            const nomeInput = document.getElementById(`editFilhoNome${index}`);
            const cpfInput = document.getElementById(`editFilhoCpf${index}`);
            const emailInput = document.getElementById(`editFilhoEmail${index}`);
            const telefoneInput = document.getElementById(`editFilhoTelefone${index}`);
            const idInput = document.getElementById(`editFilhoId${index}`);
            
            if (nomeInput) nomeInput.value = usuario.nome_completo || usuario.nome || '';
            
            if (cpfInput && usuario.cpf) {
                let cpf = usuario.cpf.replace(/\D/g, '');
                cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
                cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
                cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                cpfInput.value = cpf;
            }
            
            if (emailInput) emailInput.value = usuario.email || '';
            
            if (telefoneInput && usuario.telefone) {
                let telefone = usuario.telefone.replace(/\D/g, '');
                if (telefone.length <= 10) {
                    telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
                    telefone = telefone.replace(/(\d{4})(\d)/, '$1-$2');
                } else {
                    telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
                    telefone = telefone.replace(/(\d{5})(\d)/, '$1-$2');
                }
                telefoneInput.value = telefone;
            }
            
            // IMPORTANTE: Salvar o ID para vincular ao cadastro existente
            if (idInput) {
                idInput.value = usuario.id;
                console.log(`[Frontend] ID do filho salvo no campo hidden: ${usuario.id}`);
            }
            
            mostrarMensagem('Cadastro encontrado no SQL e preenchido!', 'success');
        } else {
            console.error('[Frontend] Erro na busca:', data.erro);
            mostrarMensagem(data.erro || 'Cadastro não encontrado no SQL', 'error');
        }
    } catch (error) {
        console.error('[Frontend] Erro ao buscar cadastro:', error);
        mostrarMensagem('Erro ao buscar cadastro no SQL', 'error');
    }
};

// Aplicar máscaras nos campos de edição
function aplicarMascarasEdicao() {
    const cpfInput = document.getElementById('editCpf');
    const telefoneInput = document.getElementById('editTelefone');
    const cepInput = document.getElementById('editCep');

    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    }

    if (telefoneInput) {
        telefoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 10) {
                value = value.replace(/(\d{2})(\d)/, '($1) $2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
            } else {
                value = value.replace(/(\d{2})(\d)/, '($1) $2');
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
            }
            e.target.value = value;
        });
    }

    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
            e.target.value = value;
        });
    }
}

// Salvar edição do usuário
window.salvarEdicaoUsuario = async function(event, usuarioId) {
    event.preventDefault();

    const nome = document.getElementById('editNome').value.trim();
    const nomeCompleto = document.getElementById('editNomeCompleto').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const cpf = document.getElementById('editCpf').value.replace(/\D/g, '');
    const telefone = document.getElementById('editTelefone').value.replace(/\D/g, '');
    const endereco = document.getElementById('editEndereco').value.trim();
    const cep = document.getElementById('editCep').value.replace(/\D/g, '');
    const estadoCivil = document.getElementById('editEstadoCivil').value;
    const ocupacaoId = document.getElementById('editOcupacao').value || null;
    const igrejaId = document.getElementById('editIgreja').value || null;
    
    // Coletar dados dos filhos - SEMPRE buscar do SQL (armazenamento oficial)
    const temFilhos = document.getElementById('editTemFilhos')?.value;
    const filhos = [];
    
    console.log('[Frontend] Coletando dados dos filhos para salvar:', {
        temFilhos,
        quantidadeFilhos: document.getElementById('editQuantidadeFilhos')?.value
    });
    
    if (temFilhos === 'sim') {
        const quantidadeFilhos = parseInt(document.getElementById('editQuantidadeFilhos')?.value) || 0;
        console.log('[Frontend] Processando', quantidadeFilhos, 'filhos');
        
        for (let i = 1; i <= quantidadeFilhos; i++) {
            const filhoNome = document.getElementById(`editFilhoNome${i}`)?.value.trim();
            const filhoCpf = document.getElementById(`editFilhoCpf${i}`)?.value.replace(/\D/g, '');
            const filhoEmail = document.getElementById(`editFilhoEmail${i}`)?.value.trim();
            const filhoTelefone = document.getElementById(`editFilhoTelefone${i}`)?.value.replace(/\D/g, '');
            const filhoId = document.getElementById(`editFilhoId${i}`)?.value.trim();
            
            console.log(`[Frontend] Filho ${i}:`, {
                nome: filhoNome,
                cpf: filhoCpf,
                email: filhoEmail,
                telefone: filhoTelefone,
                filho_id: filhoId
            });
            
            // Incluir filho se tiver pelo menos nome, CPF ou ID
            if (filhoNome || filhoCpf || filhoId) {
                filhos.push({
                    nome: filhoNome || null,
                    nome_completo: filhoNome || null,
                    cpf: filhoCpf || null,
                    email: filhoEmail || null,
                    telefone: filhoTelefone || null,
                    filho_id: filhoId || null  // IMPORTANTE: usar filho_id para vincular cadastro existente
                });
            }
        }
    }
    
    console.log('[Frontend] Dados dos filhos coletados para envio:', filhos);

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarMensagem('Sessão expirada. Faça login novamente.', 'error');
            return;
        }
        
        const dadosParaEnviar = {
            nome,
            nome_completo: nomeCompleto,
            email,
            cpf: cpf || null,
            telefone: telefone || null,
            endereco: endereco || null,
            cep: cep || null,
            estado_civil: estadoCivil || null,
            ocupacao_id: ocupacaoId ? parseInt(ocupacaoId) : null,
            igreja_id: igrejaId ? parseInt(igrejaId) : null,
            filhos: filhos  // Dados dos filhos do SQL
        };
        
        console.log('[Frontend] Enviando dados para o SQL:', {
            usuarioId,
            quantidade_filhos: filhos.length,
            filhos: filhos
        });
        
        const response = await fetch(`${API_URL}/admin/usuarios/${usuarioId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dadosParaEnviar)
        });

        const data = await response.json();

        if (response.ok) {
            mostrarMensagem('Usuário atualizado com sucesso!', 'success');
            // Garantir que o sidebar esteja visível após salvar
            garantirSidebarVisivel();
            
            // Manter na mesma seção - apenas recarregar dados atualizados
            // Se estiver editando, voltar para a lista mas manter na área administrativa
            await carregarDadosAdmin();
            
            // Se o usuário editado for o próprio admin (ID 1), também atualizar o perfil (sem mudar de página)
            if (usuarioId === currentUserId) {
                console.log('Admin editou seu próprio cadastro, atualizando perfil...');
                // Apenas recarregar dados do perfil se estiver na seção de perfil
                if (profileSection && profileSection.style.display !== 'none') {
                    await carregarPerfilCompleto();
                }
            }
        } else {
            mostrarMensagem(data.erro || 'Erro ao atualizar usuário', 'error');
        }
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Alterar ocupação de usuário (apenas admin)
window.alterarOcupacao = async function(usuarioId, ocupacaoAtualId) {
    try {
        // Carregar ocupações disponíveis
        const ocupResponse = await fetch(`${API_URL}/ocupacoes`);
        const ocupData = await ocupResponse.json();
        
        if (!ocupResponse.ok || !ocupData.ocupacoes) {
            mostrarMensagem('Erro ao carregar ocupações', 'error');
            return;
        }
        
        // Criar lista de opções
        let opcoes = 'Selecione uma ocupação:\n\n';
        opcoes += '0 - Remover ocupação\n';
        ocupData.ocupacoes.forEach((ocupacao, index) => {
            opcoes += `${index + 1} - ${ocupacao.nome}\n`;
        });
        
        const escolha = prompt(opcoes);
        if (escolha === null) return;
        
        const escolhaNum = parseInt(escolha);
        let novaOcupacaoId = null;
        
        if (escolhaNum === 0) {
            novaOcupacaoId = null;
        } else if (escolhaNum > 0 && escolhaNum <= ocupData.ocupacoes.length) {
            novaOcupacaoId = ocupData.ocupacoes[escolhaNum - 1].id;
        } else {
            mostrarMensagem('Opção inválida', 'error');
            return;
        }
        
        // Atualizar ocupação
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/usuarios/${usuarioId}/ocupacao`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ocupacao_id: novaOcupacaoId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensagem('Ocupação atualizada com sucesso!', 'success');
            await carregarDadosAdmin();
        } else {
            mostrarMensagem(data.erro || 'Erro ao atualizar ocupação', 'error');
        }
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Mostrar seção de configuração
async function mostrarSecaoConfig() {
    if (currentUserId !== 1) {
        mostrarMensagem('Acesso negado. Apenas administradores podem acessar esta área.', 'error');
        return;
    }
    
    salvarSecaoAtual('config');
    
    // Esconder formulários de login/registro
    esconderFormulariosLogin();
    
    // Garantir que o sidebar esteja visível
    garantirSidebarVisivel();
    
    // Configurar itens do menu (garantir que Administração e Configuração estejam visíveis)
    configurarItensMenu(currentUserId);
    
    // Esconder TODAS as outras seções primeiro
    if (inicioSection) inicioSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (perfilCompletoForm) perfilCompletoForm.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
    
    // Mostrar menu e seção de configuração
    if (sidebarMenu) sidebarMenu.style.display = 'block';
    if (configSection) configSection.style.display = 'block';
    if (pageTitle) pageTitle.textContent = 'Configuração';
    
    // Adicionar classe with-sidebar ao container
    const container = document.querySelector('.container');
    if (container) container.classList.add('with-sidebar');
    
    // Atualizar menu ativo
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    const menuConfig = document.querySelector('[data-section="config"]');
    if (menuConfig) menuConfig.classList.add('active');
    
    // Garantir que a navegação do menu esteja configurada
    configurarNavegacaoMenu();
    
    // Carregar dados
    await carregarIgrejas();
    await carregarAreasServicos();
    
    // Configurar formulários primeiro
    configurarFormulariosConfig();
    
    // Configurar navegação de abas
    configurarNavegacaoAbas();
}

// Configurar navegação de abas
function configurarNavegacaoAbas() {
    document.querySelectorAll('.tab-button').forEach(button => {
        // Remover listeners anteriores para evitar duplicação
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = newButton.getAttribute('data-tab');
            
            // Atualizar botões
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            newButton.classList.add('active');
            
            // Atualizar conteúdo
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${tabName}`).classList.add('active');
            
            // Garantir que os formulários estejam configurados quando trocar de aba
            if (tabName === 'areas-servicos') {
                configurarFormularioAreaServico();
            } else if (tabName === 'igrejas') {
                // Recarregar igrejas se necessário
                carregarIgrejas();
            }
        });
    });
}

// Configurar formulários de configuração
function configurarFormulariosConfig() {
    // Formulário de Igreja
    const formIgreja = document.getElementById('formIgreja');
    if (formIgreja) {
        formIgreja.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('igrejaNome').value.trim();
            const estado = document.getElementById('igrejaEstado').value.trim();
            const descricao = document.getElementById('igrejaDescricao').value.trim();
            const quantidade = document.getElementById('igrejaQuantidade').value;
            
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/admin/igrejas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ nome, estado, descricao, quantidade_vinculados: quantidade })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    mostrarMensagem('Igreja criada com sucesso!', 'success');
                    formIgreja.reset();
                    document.getElementById('igrejaQuantidade').value = 0;
                    await carregarIgrejas();
                } else {
                    mostrarMensagem(data.erro || 'Erro ao criar igreja', 'error');
                }
            } catch (error) {
                mostrarMensagem('Erro ao conectar com o servidor', 'error');
            }
        });
    }
    
    // Configurar formulário de área/serviço
    configurarFormularioAreaServico();
}

// Configurar formulário de área/serviço (função separada para poder ser chamada novamente)
function configurarFormularioAreaServico() {
    const formAreaServico = document.getElementById('formAreaServico');
    if (formAreaServico) {
        // Remover listener anterior se existir
        const newForm = formAreaServico.cloneNode(true);
        formAreaServico.parentNode.replaceChild(newForm, formAreaServico);
        
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('areaServicoNome').value.trim();
            const descricao = document.getElementById('areaServicoDescricao').value.trim();
            
            if (!nome) {
                mostrarMensagem('Nome da ocupação é obrigatório', 'error');
                return;
            }
            
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/admin/areas-servicos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ nome, descricao, tipo: 'area' }) // Tipo padrão: area
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    mostrarMensagem('Ocupação criada com sucesso!', 'success');
                    newForm.reset();
                    await carregarAreasServicos();
                } else {
                    mostrarMensagem(data.erro || 'Erro ao criar ocupação', 'error');
                }
            } catch (error) {
                console.error('Erro:', error);
                mostrarMensagem('Erro ao conectar com o servidor', 'error');
            }
        });
    }
}

// Carregar igrejas
async function carregarIgrejas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/igrejas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            exibirIgrejas(data.igrejas);
        } else {
            document.getElementById('listaIgrejas').innerHTML = '<p style="color: #dc3545;">Erro ao carregar igrejas</p>';
        }
    } catch (error) {
        document.getElementById('listaIgrejas').innerHTML = '<p style="color: #dc3545;">Erro ao conectar com o servidor</p>';
    }
}

// Exibir igrejas
function exibirIgrejas(igrejas) {
    const listaIgrejas = document.getElementById('listaIgrejas');
    
    if (!igrejas || igrejas.length === 0) {
        listaIgrejas.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Nenhuma igreja cadastrada.</p>';
        return;
    }
    
    listaIgrejas.innerHTML = igrejas.map(igreja => `
        <div class="item-list" style="margin-bottom: 20px;">
            <div class="item-list-content" style="flex: 1;">
                <h4 style="margin: 0 0 5px 0; color: #667eea;">${igreja.nome}</h4>
                ${igreja.estado ? `<p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Estado:</strong> ${igreja.estado}</p>` : ''}
                ${igreja.descricao ? `<p style="margin: 5px 0; color: #666; font-size: 14px;">${igreja.descricao}</p>` : ''}
                <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Pessoas vinculadas:</strong> ${igreja.quantidade_vinculados || 0}</p>
                <p style="margin: 5px 0; color: #999; font-size: 12px;">
                    Criado em: ${new Date(igreja.criado_em).toLocaleString('pt-BR')}
                </p>
            </div>
            <div class="item-list-actions">
                <button class="btn btn-secondary btn-small" onclick="vincularMembro(${igreja.id})">Vincular Membro</button>
                <button class="btn btn-secondary btn-small" onclick="verMembros(${igreja.id})">Ver Membros</button>
                <button class="btn btn-secondary btn-small" onclick="editarIgreja(${igreja.id}, '${igreja.nome.replace(/'/g, "\\'")}', '${(igreja.estado || '').replace(/'/g, "\\'")}', '${(igreja.descricao || '').replace(/'/g, "\\'")}', ${igreja.quantidade_vinculados || 0})">Editar</button>
                <button class="btn btn-danger btn-small" onclick="deletarIgreja(${igreja.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

// Vincular membro à igreja (global para onclick)
window.vincularMembro = async function(igrejaId) {
    const usuarioId = prompt('Digite o ID do cadastro para vincular:');
    if (!usuarioId || usuarioId.trim() === '') return;
    
    const funcao = prompt('Digite a função do membro (ex: Pastor, Diácono, Membro, etc.):');
    if (funcao === null) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/igrejas/${igrejaId}/membros`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ usuario_id: parseInt(usuarioId), funcao: funcao.trim() })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensagem('Membro vinculado com sucesso!', 'success');
            await carregarIgrejas();
        } else {
            mostrarMensagem(data.erro || 'Erro ao vincular membro', 'error');
        }
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Ver membros da igreja (global para onclick)
window.verMembros = async function(igrejaId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/igrejas/${igrejaId}/membros`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            exibirMembros(igrejaId, data.membros);
        } else {
            mostrarMensagem('Erro ao carregar membros', 'error');
        }
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Exibir membros
function exibirMembros(igrejaId, membros) {
    const membrosHtml = membros && membros.length > 0 ? membros.map(membro => `
        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #667eea;">
            <p><strong>ID:</strong> ${membro.usuario_id}</p>
            <p><strong>Nome:</strong> ${membro.nome_completo || membro.nome}</p>
            <p><strong>Email:</strong> ${membro.email}</p>
            ${membro.funcao ? `<p><strong>Função:</strong> ${membro.funcao}</p>` : ''}
            <button class="btn btn-danger btn-small" onclick="removerMembro(${igrejaId}, ${membro.id})">Remover</button>
        </div>
    `).join('') : '<p style="text-align: center; color: #666; padding: 20px;">Nenhum membro vinculado.</p>';
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="margin-bottom: 20px; color: #667eea;">Membros da Igreja</h3>
            <div id="membrosList">${membrosHtml}</div>
            <button class="btn btn-secondary" onclick="this.closest('div[style*=\"position: fixed\"]').remove()" style="margin-top: 20px; width: 100%;">Fechar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Remover membro (global para onclick)
window.removerMembro = async function(igrejaId, membroId) {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/igrejas/${igrejaId}/membros/${membroId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensagem('Membro removido com sucesso!', 'success');
            await verMembros(igrejaId);
            await carregarIgrejas();
        } else {
            mostrarMensagem(data.erro || 'Erro ao remover membro', 'error');
        }
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Editar igreja (global para onclick)
window.editarIgreja = async function(id, nome, estado, descricao, quantidade) {
    const novoNome = prompt('Nome da igreja:', nome);
    if (novoNome === null) return;
    
    const novoEstado = prompt('Estado:', estado || '');
    if (novoEstado === null) return;
    
    const novaDescricao = prompt('Descrição:', descricao || '');
    if (novaDescricao === null) return;
    
    const novaQuantidade = prompt('Quantidade de pessoas vinculadas:', quantidade || 0);
    if (novaQuantidade === null) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/igrejas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nome: novoNome, estado: novoEstado, descricao: novaDescricao, quantidade_vinculados: parseInt(novaQuantidade) || 0 })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensagem('Igreja atualizada com sucesso!', 'success');
            await carregarIgrejas();
        } else {
            mostrarMensagem(data.erro || 'Erro ao atualizar igreja', 'error');
        }
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Deletar igreja (global para onclick)
window.deletarIgreja = async function(id) {
    if (!confirm('Tem certeza que deseja excluir esta igreja? Todos os membros vinculados serão removidos.')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/igrejas/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensagem('Igreja excluída com sucesso!', 'success');
            await carregarIgrejas();
        } else {
            mostrarMensagem(data.erro || 'Erro ao excluir igreja', 'error');
        }
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Carregar áreas/serviços
async function carregarAreasServicos() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/areas-servicos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            exibirAreasServicos(data.areas_servicos);
        } else {
            document.getElementById('listaAreasServicos').innerHTML = '<p style="color: #dc3545;">Erro ao carregar áreas/serviços</p>';
        }
    } catch (error) {
        document.getElementById('listaAreasServicos').innerHTML = '<p style="color: #dc3545;">Erro ao conectar com o servidor</p>';
    }
}

// Exibir áreas/serviços
function exibirAreasServicos(areasServicos) {
    const listaAreasServicos = document.getElementById('listaAreasServicos');
    
    if (!areasServicos || areasServicos.length === 0) {
        listaAreasServicos.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Nenhuma ocupação cadastrada.</p>';
        return;
    }
    
    listaAreasServicos.innerHTML = areasServicos.map(item => `
        <div class="item-list">
            <div class="item-list-content">
                <h4 style="margin: 0 0 5px 0; color: #667eea;">${item.nome}</h4>
                ${item.descricao ? `<p style="margin: 5px 0; color: #666; font-size: 14px;">${item.descricao}</p>` : ''}
                <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Cadastros vinculados:</strong> ${item.quantidade_vinculados || 0}</p>
                <p style="margin: 5px 0; color: #999; font-size: 12px;">
                    Criado em: ${new Date(item.criado_em).toLocaleString('pt-BR')}
                </p>
            </div>
            <div class="item-list-actions">
                <button class="btn btn-secondary btn-small" onclick="editarAreaServico(${item.id}, '${item.nome.replace(/'/g, "\\'")}', '${(item.descricao || '').replace(/'/g, "\\'")}', '${item.tipo || 'area'}')">Editar</button>
                <button class="btn btn-danger btn-small" onclick="deletarAreaServico(${item.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

// Editar ocupação (global para onclick)
window.editarAreaServico = async function(id, nome, descricao, tipo) {
    const novoNome = prompt('Qual nome da ocupação:', nome);
    if (novoNome === null) return;
    
    const novaDescricao = prompt('Descrição:', descricao || '');
    if (novaDescricao === null) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/areas-servicos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nome: novoNome, descricao: novaDescricao, tipo: tipo || 'area' }) // Manter tipo existente ou usar padrão
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensagem('Ocupação atualizada com sucesso!', 'success');
            await carregarAreasServicos();
        } else {
            mostrarMensagem(data.erro || 'Erro ao atualizar ocupação', 'error');
        }
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Deletar ocupação (global para onclick)
window.deletarAreaServico = async function(id) {
    if (!confirm('Tem certeza que deseja excluir esta ocupação?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/admin/areas-servicos/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensagem('Ocupação excluída com sucesso!', 'success');
            await carregarAreasServicos();
        } else {
            mostrarMensagem(data.erro || 'Erro ao excluir ocupação', 'error');
        }
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Logout
function fazerLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('secaoAtual');
    currentUserId = null;
    limparMensagem();
    
    // Mostrar formulário de login
    if (loginForm) {
        loginForm.classList.add('active');
        loginForm.style.display = 'block';
        loginForm.style.visibility = 'visible';
    }
    if (registerForm) {
        registerForm.classList.remove('active');
        registerForm.style.display = 'none';
        registerForm.style.visibility = 'hidden';
    }
    
    // Esconder todas as outras seções
    if (perfilCompletoForm) perfilCompletoForm.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
    if (configSection) configSection.style.display = 'none';
    if (inicioSection) inicioSection.style.display = 'none';
    if (sidebarMenu) sidebarMenu.style.display = 'none';
    
    const container = document.querySelector('.container');
    if (container) container.classList.remove('with-sidebar');
    
    if (pageTitle) pageTitle.textContent = 'Sistema de Login';
}

// ========== FUNÇÕES DO CALENDÁRIO E PROGRAMAÇÕES ==========

// Variáveis globais para o calendário
let mesAtualCalendario = new Date().getMonth();
let anoAtualCalendario = new Date().getFullYear();
let programacoesMes = [];
let aniversariantesMes = [];

// Mostrar seção de início
async function mostrarSecaoInicio() {
    salvarSecaoAtual('inicio');
    
    // Esconder formulários de login/registro
    esconderFormulariosLogin();
    
    // Garantir que o sidebar esteja visível
    garantirSidebarVisivel();
    
    // Configurar itens do menu
    configurarItensMenu(currentUserId);
    
    // Esconder TODAS as outras seções primeiro
    if (profileSection) profileSection.style.display = 'none';
    if (perfilCompletoForm) perfilCompletoForm.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
    if (configSection) configSection.style.display = 'none';
    
    // Mostrar menu e seção de início
    if (sidebarMenu) sidebarMenu.style.display = 'block';
    if (inicioSection) inicioSection.style.display = 'block';
    // Não atualizar pageTitle para evitar título duplicado - o calendário já tem seu próprio cabeçalho
    if (pageTitle) pageTitle.textContent = '';
    
    // Adicionar classe with-sidebar ao container
    const container = document.querySelector('.container');
    if (container) container.classList.add('with-sidebar');
    
    // Atualizar menu ativo
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    const menuInicio = document.querySelector('[data-section="inicio"]');
    if (menuInicio) menuInicio.classList.add('active');
    
    // Garantir que a navegação do menu esteja configurada
    configurarNavegacaoMenu();
    
    // Resetar para mês atual
    const hoje = new Date();
    mesAtualCalendario = hoje.getMonth();
    anoAtualCalendario = hoje.getFullYear();
    
    // Configurar visibilidade das abas de solicitações
    const tabSolicitacoes = document.getElementById('tabSolicitacoes');
    const tabMinhasSolicitacoes = document.getElementById('tabMinhasSolicitacoes');
    if (tabSolicitacoes) {
        tabSolicitacoes.style.display = currentUserId === 1 ? 'block' : 'none';
    }
    if (tabMinhasSolicitacoes) {
        tabMinhasSolicitacoes.style.display = currentUserId !== 1 ? 'block' : 'none';
    }
    
    // Configurar navegação de abas de programações
    configurarNavegacaoAbasProgramacoes();
    
    // Carregar programações PRIMEIRO (ela chama carregarCalendario() automaticamente após carregar)
    await carregarProgramacoes();
    await carregarAniversariantes();
    // carregarCalendario() já é chamado dentro de carregarProgramacoes(), não precisa chamar aqui
    if (currentUserId === 1) {
        await carregarSolicitacoes();
    } else {
        await carregarMinhasSolicitacoes();
    }
    
    // Configurar event listeners
    configurarEventListenersCalendario();
}

// Configurar navegação de abas de programações (similar ao configurarNavegacaoAbas)
function configurarNavegacaoAbasProgramacoes() {
    // Buscar apenas os botões de tabs dentro da seção de início
    const inicioSection = document.getElementById('inicioSection');
    if (!inicioSection) return;
    
    const tabButtons = inicioSection.querySelectorAll('.tab-button[data-tab]');
    
    tabButtons.forEach(button => {
        // Remover listeners anteriores para evitar duplicação
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = newButton.getAttribute('data-tab');
            
            // Atualizar botões (apenas os da seção de início)
            inicioSection.querySelectorAll('.tab-button').forEach(b => {
                b.classList.remove('active');
            });
            newButton.classList.add('active');
            
            // Atualizar conteúdo
            inicioSection.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Mostrar o conteúdo correspondente
            if (tabName === 'programacoes') {
                const tabContentProgramacoes = document.getElementById('tabContentProgramacoesAprovadas');
                if (tabContentProgramacoes) {
                    tabContentProgramacoes.classList.add('active');
                }
            } else if (tabName === 'programacoesPassadas') {
                const tabContentProgramacoesPassadas = document.getElementById('tabContentProgramacoesPassadas');
                if (tabContentProgramacoesPassadas) {
                    tabContentProgramacoesPassadas.classList.add('active');
                    // Carregar programações passadas e aniversariantes quando a aba for ativada
                    carregarProgramacoesPassadas();
                    exibirAniversariantesPassadas();
                }
            } else if (tabName === 'solicitacoes') {
                const tabContentSolicitacoes = document.getElementById('tabContentSolicitacoesPendentes');
                if (tabContentSolicitacoes) {
                    tabContentSolicitacoes.classList.add('active');
                }
            } else if (tabName === 'minhasSolicitacoes') {
                const tabContentMinhasSolicitacoes = document.getElementById('tabContentMinhasSolicitacoes');
                if (tabContentMinhasSolicitacoes) {
                    tabContentMinhasSolicitacoes.classList.add('active');
                }
            }
        });
    });
}

// Configurar event listeners do calendário
function configurarEventListenersCalendario() {
    const btnMesAnterior = document.getElementById('btnMesAnterior');
    const btnProximoMes = document.getElementById('btnProximoMes');
    const btnCriarProgramacao = document.getElementById('btnCriarProgramacao');
    const cancelarProgramacao = document.getElementById('cancelarProgramacao');
    const formProgramacaoElement = document.getElementById('formProgramacaoElement');
    
    if (btnMesAnterior) {
        btnMesAnterior.onclick = async () => {
            mesAtualCalendario--;
            if (mesAtualCalendario < 0) {
                mesAtualCalendario = 11;
                anoAtualCalendario--;
            }
            // Carregar programações primeiro, depois o calendário
            await carregarProgramacoes();
            await carregarAniversariantes();
            await carregarCalendario();
        };
    }
    
    if (btnProximoMes) {
        btnProximoMes.onclick = async () => {
            mesAtualCalendario++;
            if (mesAtualCalendario > 11) {
                mesAtualCalendario = 0;
                anoAtualCalendario++;
            }
            // Carregar programações primeiro, depois o calendário
            await carregarProgramacoes();
            await carregarAniversariantes();
            await carregarCalendario();
        };
    }
    
    if (btnCriarProgramacao) {
        btnCriarProgramacao.onclick = () => {
            const modalCriarProgramacao = document.getElementById('modalCriarProgramacao');
            const tituloFormProgramacao = document.getElementById('tituloFormProgramacao');
            if (modalCriarProgramacao && tituloFormProgramacao) {
                modalCriarProgramacao.style.display = 'flex';
                if (currentUserId === 1) {
                    tituloFormProgramacao.textContent = '➕ Criar Programação (Admin)';
                } else {
                    tituloFormProgramacao.textContent = '📋 Solicitar Evento (Aguardando Aprovação)';
                }
                // Limpar formulário
                if (formProgramacaoElement) formProgramacaoElement.reset();
                // Resetar checkboxes e esconder seções
                const ativarVinculoMembros = document.getElementById('ativarVinculoMembros');
                const opcoesVinculoMembros = document.getElementById('opcoesVinculoMembros');
                if (ativarVinculoMembros) ativarVinculoMembros.checked = false;
                if (opcoesVinculoMembros) opcoesVinculoMembros.style.display = 'none';
                const programacaoHorarioVinculo = document.getElementById('programacaoHorarioVinculo');
                const horarioVinculoContainer = document.getElementById('horarioVinculoContainer');
                if (programacaoHorarioVinculo) programacaoHorarioVinculo.checked = false;
                if (horarioVinculoContainer) horarioVinculoContainer.style.display = 'none';
            }
        };
    }
    
    // Fechar modal - definir variável uma vez
    const modalCriarProgramacao = document.getElementById('modalCriarProgramacao');
    const fecharModalProgramacao = document.getElementById('fecharModalProgramacao');
    
    // Fechar modal ao clicar no X
    if (fecharModalProgramacao && modalCriarProgramacao) {
        fecharModalProgramacao.onclick = () => {
            modalCriarProgramacao.style.display = 'none';
        };
    }
    
    // Fechar modal ao clicar fora dele (evitar propagação do clique no conteúdo)
    if (modalCriarProgramacao) {
        const modalContent = modalCriarProgramacao.querySelector('div > div');
        if (modalContent) {
            modalContent.onclick = (e) => {
                e.stopPropagation();
            };
        }
        
        modalCriarProgramacao.onclick = (e) => {
            if (e.target === modalCriarProgramacao) {
                modalCriarProgramacao.style.display = 'none';
            }
        };
    }
    
    // Fechar modal ao clicar em Cancelar
    if (cancelarProgramacao && modalCriarProgramacao) {
        cancelarProgramacao.onclick = () => {
            modalCriarProgramacao.style.display = 'none';
        };
    }
    
    if (formProgramacaoElement) {
        formProgramacaoElement.onsubmit = async (e) => {
            e.preventDefault();
            await salvarProgramacao();
        };
    }
    
    // Configurar checkbox de vincular membros
    const ativarVinculoMembros = document.getElementById('ativarVinculoMembros');
    const opcoesVinculoMembros = document.getElementById('opcoesVinculoMembros');
    const programacaoHorarioVinculo = document.getElementById('programacaoHorarioVinculo');
    const horarioVinculoContainer = document.getElementById('horarioVinculoContainer');
    
    if (ativarVinculoMembros) {
        ativarVinculoMembros.onchange = () => {
            if (opcoesVinculoMembros) {
                opcoesVinculoMembros.style.display = ativarVinculoMembros.checked ? 'block' : 'none';
                if (ativarVinculoMembros.checked) {
                    carregarMembrosParaVinculo();
                }
            }
        };
    }
    
    if (programacaoHorarioVinculo) {
        programacaoHorarioVinculo.onchange = () => {
            if (horarioVinculoContainer) {
                horarioVinculoContainer.style.display = programacaoHorarioVinculo.checked ? 'block' : 'none';
            }
        };
    }
    
    // Filtros
    const filtroIgrejaProgramacao = document.getElementById('filtroIgrejaProgramacao');
    const filtroCodigoProgramacao = document.getElementById('filtroCodigoProgramacao');
    const filtroTituloProgramacao = document.getElementById('filtroTituloProgramacao');
    const btnLimparFiltrosProgramacao = document.getElementById('btnLimparFiltrosProgramacao');
    const btnPesquisarFiltros = document.getElementById('btnPesquisarFiltros');
    const btnPesquisarCodigo = document.getElementById('btnPesquisarCodigo');
    const btnPesquisarTitulo = document.getElementById('btnPesquisarTitulo');
    
    // Função para verificar se há filtros preenchidos e mostrar botão de pesquisar
    function verificarFiltrosPreenchidos() {
        const temFiltro = (filtroIgrejaProgramacao && filtroIgrejaProgramacao.value) ||
                         (filtroCodigoProgramacao && filtroCodigoProgramacao.value.trim()) ||
                         (filtroTituloProgramacao && filtroTituloProgramacao.value.trim());
        
        if (btnPesquisarFiltros) {
            btnPesquisarFiltros.style.display = temFiltro ? 'block' : 'none';
        }
        
        if (btnPesquisarCodigo) {
            btnPesquisarCodigo.style.display = (filtroCodigoProgramacao && filtroCodigoProgramacao.value.trim()) ? 'block' : 'none';
        }
        
        if (btnPesquisarTitulo) {
            btnPesquisarTitulo.style.display = (filtroTituloProgramacao && filtroTituloProgramacao.value.trim()) ? 'block' : 'none';
        }
    }
    
    if (filtroIgrejaProgramacao) {
        filtroIgrejaProgramacao.addEventListener('change', () => {
            verificarFiltrosPreenchidos();
            carregarProgramacoes();
        });
    }
    
    if (filtroCodigoProgramacao) {
        filtroCodigoProgramacao.addEventListener('input', () => {
            verificarFiltrosPreenchidos();
        });
        
        // Pesquisar ao pressionar Enter
        filtroCodigoProgramacao.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                carregarProgramacoes();
            }
        });
        
        if (btnPesquisarCodigo) {
            btnPesquisarCodigo.addEventListener('click', () => {
                carregarProgramacoes();
            });
        }
    }
    
    if (filtroTituloProgramacao) {
        filtroTituloProgramacao.addEventListener('input', () => {
            verificarFiltrosPreenchidos();
        });
        
        // Pesquisar ao pressionar Enter
        filtroTituloProgramacao.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                carregarProgramacoes();
            }
        });
        
        if (btnPesquisarTitulo) {
            btnPesquisarTitulo.addEventListener('click', () => {
                carregarProgramacoes();
            });
        }
    }
    
    if (btnPesquisarFiltros) {
        btnPesquisarFiltros.addEventListener('click', () => {
            carregarProgramacoes();
        });
    }
    
    if (btnLimparFiltrosProgramacao) {
        btnLimparFiltrosProgramacao.onclick = () => {
            if (filtroIgrejaProgramacao) filtroIgrejaProgramacao.value = '';
            if (filtroCodigoProgramacao) filtroCodigoProgramacao.value = '';
            if (filtroTituloProgramacao) filtroTituloProgramacao.value = '';
            verificarFiltrosPreenchidos();
            carregarProgramacoes();
        };
    }
    
    // Verificar inicialmente
    verificarFiltrosPreenchidos();
    
    // Carregar igrejas no select e filtros
    carregarIgrejasParaProgramacao();
    
    // Configurar seletores de hora
    configurarSeletoresHora();
}

// Configurar seletores de hora (hora e minuto separados)
function configurarSeletoresHora() {
    // Seletores para hora principal
    const selectHora = document.getElementById('programacaoHoraHora');
    const selectMinuto = document.getElementById('programacaoHoraMinuto');
    const inputHoraOculto = document.getElementById('programacaoHora');
    
    // Seletores para horário de vínculo
    const selectHoraVinculo = document.getElementById('programacaoHoraVinculoHora');
    const selectMinutoVinculo = document.getElementById('programacaoHoraVinculoMinuto');
    const inputHoraVinculoOculto = document.getElementById('programacaoHoraVinculo');
    
    // Popular select de horas (00-23)
    if (selectHora) {
        for (let h = 0; h < 24; h++) {
            const option = document.createElement('option');
            option.value = String(h).padStart(2, '0');
            option.textContent = String(h).padStart(2, '0');
            selectHora.appendChild(option);
        }
    }
    
    if (selectHoraVinculo) {
        for (let h = 0; h < 24; h++) {
            const option = document.createElement('option');
            option.value = String(h).padStart(2, '0');
            option.textContent = String(h).padStart(2, '0');
            selectHoraVinculo.appendChild(option);
        }
    }
    
    // Popular select de minutos (00-59)
    if (selectMinuto) {
        for (let m = 0; m < 60; m++) {
            const option = document.createElement('option');
            option.value = String(m).padStart(2, '0');
            option.textContent = String(m).padStart(2, '0');
            selectMinuto.appendChild(option);
        }
    }
    
    if (selectMinutoVinculo) {
        for (let m = 0; m < 60; m++) {
            const option = document.createElement('option');
            option.value = String(m).padStart(2, '0');
            option.textContent = String(m).padStart(2, '0');
            selectMinutoVinculo.appendChild(option);
        }
    }
    
    // Atualizar input oculto quando hora ou minuto mudarem
    if (selectHora && selectMinuto && inputHoraOculto) {
        const atualizarHora = () => {
            const hora = selectHora.value;
            const minuto = selectMinuto.value;
            if (hora && minuto) {
                inputHoraOculto.value = `${hora}:${minuto}`;
            } else {
                inputHoraOculto.value = '';
            }
        };
        
        selectHora.addEventListener('change', atualizarHora);
        selectMinuto.addEventListener('change', atualizarHora);
    }
    
    // Atualizar input oculto de vínculo quando hora ou minuto mudarem
    if (selectHoraVinculo && selectMinutoVinculo && inputHoraVinculoOculto) {
        const atualizarHoraVinculo = () => {
            const hora = selectHoraVinculo.value;
            const minuto = selectMinutoVinculo.value;
            if (hora && minuto) {
                inputHoraVinculoOculto.value = `${hora}:${minuto}`;
            } else {
                inputHoraVinculoOculto.value = '';
            }
        };
        
        selectHoraVinculo.addEventListener('change', atualizarHoraVinculo);
        selectMinutoVinculo.addEventListener('change', atualizarHoraVinculo);
    }
}

// Carregar igrejas para o select de local
async function carregarIgrejasParaProgramacao() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`${API_URL}/igrejas-publicas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const selectLocal = document.getElementById('programacaoLocal');
            if (selectLocal && data.igrejas) {
                selectLocal.innerHTML = '<option value="">Selecione uma igreja...</option>';
                data.igrejas.forEach(igreja => {
                    const option = document.createElement('option');
                    option.value = igreja.id;
                    option.textContent = igreja.nome;
                    selectLocal.appendChild(option);
                });
            }
            
            // Popular filtro de igreja
            const filtroIgrejaProgramacao = document.getElementById('filtroIgrejaProgramacao');
            if (filtroIgrejaProgramacao && data.igrejas) {
                filtroIgrejaProgramacao.innerHTML = '<option value="">Todas as igrejas</option>';
                data.igrejas.forEach(igreja => {
                    const option = document.createElement('option');
                    option.value = igreja.id;
                    option.textContent = igreja.nome;
                    filtroIgrejaProgramacao.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar igrejas:', error);
    }
}

// Carregar membros para vincular
async function carregarMembrosParaVinculo() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`${API_URL}/admin/usuarios`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const listaMembrosVinculo = document.getElementById('listaMembrosVinculo');
            if (listaMembrosVinculo && data.usuarios) {
                listaMembrosVinculo.innerHTML = data.usuarios.map(usuario => {
                    return `
                        <div style="padding: 8px; margin: 5px 0; background: #f8f9fa; border-radius: 5px; display: flex; align-items: center;">
                            <input type="checkbox" value="${usuario.id}" id="membro_${usuario.id}" style="width: 18px; height: 18px; margin-right: 10px; cursor: pointer;">
                            <label for="membro_${usuario.id}" style="cursor: pointer; margin: 0; flex: 1;">
                                <strong>${usuario.nome || usuario.nome_completo || 'Usuário'}</strong>
                                ${usuario.email ? ` - ${usuario.email}` : ''}
                            </label>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('Erro ao carregar membros:', error);
        const listaMembrosVinculo = document.getElementById('listaMembrosVinculo');
        if (listaMembrosVinculo) {
            listaMembrosVinculo.innerHTML = '<p style="color: #999; font-size: 13px;">Erro ao carregar membros. Apenas administradores podem vincular membros.</p>';
        }
    }
}

// Carregar calendário
async function carregarCalendario() {
    const calendarioGrid = document.getElementById('calendarioGrid');
    const mesAnoAtual = document.getElementById('mesAnoAtual');
    
    if (!calendarioGrid || !mesAnoAtual) return;
    
    console.log(`[Calendário] Renderizando calendário para ${mesAtualCalendario + 1}/${anoAtualCalendario} com ${programacoesMes.length} programações disponíveis`);
    
    // Atualizar título do mês/ano
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    mesAnoAtual.textContent = `${meses[mesAtualCalendario]} ${anoAtualCalendario}`;
    
    // Limpar grid e aplicar classe CSS
    calendarioGrid.innerHTML = '';
    calendarioGrid.className = 'calendario-grid-moderno';
    
    // Cabeçalho dos dias da semana
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    diasSemana.forEach(dia => {
        const headerCell = document.createElement('div');
        headerCell.className = 'calendario-header-cell';
        headerCell.textContent = dia;
        calendarioGrid.appendChild(headerCell);
    });
    
    // Primeiro dia do mês
    const primeiroDia = new Date(anoAtualCalendario, mesAtualCalendario, 1);
    const ultimoDia = new Date(anoAtualCalendario, mesAtualCalendario + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const diaSemanaInicio = primeiroDia.getDay();
    
    // Espaços vazios antes do primeiro dia
    for (let i = 0; i < diaSemanaInicio; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendario-empty-cell';
        calendarioGrid.appendChild(emptyCell);
    }
    
    // Dias do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const cell = document.createElement('div');
        cell.className = 'calendario-day-cell';
        
        // Número do dia
        const diaNum = document.createElement('div');
        diaNum.className = 'calendario-day-number';
        diaNum.textContent = dia;
        cell.appendChild(diaNum);
        
        // Verificar se há programações neste dia (incluindo eventos que começam antes mas terminam depois)
        // Usar comparação de strings para evitar problemas de fuso horário
        const dataAtualStr = `${anoAtualCalendario}-${String(mesAtualCalendario + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        
        const programacoesDia = programacoesMes.filter(p => {
            // Usar a data EXATAMENTE como vem do SQLite (já formatada como YYYY-MM-DD pelo strftime)
            // O backend já retorna no formato correto, então apenas usar diretamente
            let dataInicioStr = '';
            if (p.data_evento) {
                // A data já vem do backend como string "YYYY-MM-DD" (via strftime no SQL)
                // Apenas garantir que está no formato correto
                if (typeof p.data_evento === 'string') {
                    // Remover qualquer espaço ou caractere extra
                    dataInicioStr = p.data_evento.trim();
                    // Se tiver mais de 10 caracteres, pegar apenas os primeiros 10 (YYYY-MM-DD)
                    if (dataInicioStr.length > 10) {
                        dataInicioStr = dataInicioStr.substring(0, 10);
                    }
                } else {
                    // Se por algum motivo não for string, converter (não deveria acontecer)
                    console.warn(`[Calendário] ⚠️ data_evento não é string para "${p.titulo}":`, typeof p.data_evento, p.data_evento);
                    const dataObj = new Date(p.data_evento);
                    dataInicioStr = `${dataObj.getUTCFullYear()}-${String(dataObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dataObj.getUTCDate()).padStart(2, '0')}`;
                }
            }
            
            let dataFimStr = dataInicioStr;
            if (p.data_fim_evento) {
                if (typeof p.data_fim_evento === 'string') {
                    dataFimStr = p.data_fim_evento.trim();
                    if (dataFimStr.length > 10) {
                        dataFimStr = dataFimStr.substring(0, 10);
                    }
                } else {
                    const dataObj = new Date(p.data_fim_evento);
                    dataFimStr = `${dataObj.getUTCFullYear()}-${String(dataObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dataObj.getUTCDate()).padStart(2, '0')}`;
                }
            }
            
            // Comparar strings de data diretamente (exatamente como está no banco)
            // A data do calendário (dataAtualStr) deve corresponder EXATAMENTE à data do banco (dataInicioStr)
            const corresponde = dataAtualStr === dataInicioStr || (dataFimStr && dataAtualStr >= dataInicioStr && dataAtualStr <= dataFimStr);
            
            // Debug: log quando encontrar correspondência
            if (corresponde) {
                console.log(`[Calendário] ✅ Programação "${p.titulo}" encontrada no dia ${dataAtualStr} (data_evento do SQLite: ${dataInicioStr}, data_fim: ${dataFimStr || 'N/A'})`);
            }
            
            return corresponde;
        });
        
        if (programacoesDia.length > 0) {
            // Ordenar por data e hora (mais antigo primeiro)
            programacoesDia.sort((a, b) => {
                const dataA = new Date(a.data_evento + ' ' + (a.hora_evento || '00:00'));
                const dataB = new Date(b.data_evento + ' ' + (b.hora_evento || '00:00'));
                return dataA - dataB;
            });
            
            programacoesDia.forEach(prog => {
                const evento = document.createElement('div');
                evento.className = 'calendario-evento';
                
                // Determinar status da programação para aplicar cor no calendário
                const dataEventoStr = prog.data_evento ? prog.data_evento.split('T')[0].split(' ')[0] : '';
                const status = determinarStatusProgramacao(dataEventoStr);
                
                // Aplicar cores baseado no status
                if (status === 'passada') {
                    evento.style.background = '#9e9e9e';
                    evento.style.opacity = '0.6';
                    evento.style.color = '#fff';
                    evento.style.border = 'none';
                } else if (status === 'hoje') {
                    evento.style.background = '#ffcdd2';
                    evento.style.border = '2px solid #f44336';
                    evento.style.color = '#c62828';
                    evento.style.fontWeight = 'bold';
                } else if (status === 'amanha') {
                    evento.style.background = '#ffc107';
                    evento.style.border = '2px solid #ff9800';
                    evento.style.color = '#000';
                    evento.style.fontWeight = 'bold';
                } else {
                    evento.style.background = '#667eea';
                    evento.style.color = '#fff';
                    evento.style.border = 'none';
                }
                
                // Criar container para evento com possível badge
                const eventoContainer = document.createElement('div');
                eventoContainer.style.position = 'relative';
                eventoContainer.style.display = 'flex';
                eventoContainer.style.alignItems = 'center';
                eventoContainer.style.gap = '4px';
                
                evento.textContent = prog.titulo.length > 10 ? prog.titulo.substring(0, 10) + '...' : prog.titulo;
                evento.style.flex = '1';
                evento.title = prog.titulo + (prog.hora_evento ? ' - ' + prog.hora_evento : '') + (prog.local_evento || prog.igreja_nome ? ' - ' + (prog.igreja_nome || prog.local_evento) : '');
                evento.onclick = () => mostrarDetalhesProgramacao(prog.id);
                
                eventoContainer.appendChild(evento);
                
                // Adicionar badge de notificação se for hoje ou amanhã
                if (status === 'hoje') {
                    const badgeHoje = document.createElement('span');
                    badgeHoje.textContent = 'HOJE';
                    badgeHoje.style.background = '#f44336';
                    badgeHoje.style.color = 'white';
                    badgeHoje.style.fontSize = '8px';
                    badgeHoje.style.padding = '2px 4px';
                    badgeHoje.style.borderRadius = '3px';
                    badgeHoje.style.fontWeight = 'bold';
                    badgeHoje.style.whiteSpace = 'nowrap';
                    eventoContainer.appendChild(badgeHoje);
                } else if (status === 'amanha') {
                    const badgeAmanha = document.createElement('span');
                    badgeAmanha.textContent = 'AMANHÃ';
                    badgeAmanha.style.background = '#ff9800';
                    badgeAmanha.style.color = 'white';
                    badgeAmanha.style.fontSize = '8px';
                    badgeAmanha.style.padding = '2px 4px';
                    badgeAmanha.style.borderRadius = '3px';
                    badgeAmanha.style.fontWeight = 'bold';
                    badgeAmanha.style.whiteSpace = 'nowrap';
                    eventoContainer.appendChild(badgeAmanha);
                }
                
                cell.appendChild(eventoContainer);
            });
            
            // Indicador visual de múltiplas programações
            if (programacoesDia.length > 1) {
                const indicador = document.createElement('div');
                indicador.className = 'calendario-indicador-multiplos';
                indicador.textContent = programacoesDia.length;
                indicador.title = `${programacoesDia.length} programações neste dia`;
                cell.appendChild(indicador);
            }
        }
        
        // Verificar se há aniversariantes neste dia
        const aniversariantesDia = aniversariantesMes.filter(a => {
            if (!a.data_nascimento) return false;
            // Extrair apenas a parte da data (YYYY-MM-DD) sem hora
            const dataNascStr = a.data_nascimento.split('T')[0];
            // Comparar com a data atual (mesmo dia e mês, qualquer ano)
            const partesDataNasc = dataNascStr.split('-');
            const diaNasc = parseInt(partesDataNasc[2]);
            const mesNasc = parseInt(partesDataNasc[1]) - 1; // JavaScript usa meses 0-11
            return diaNasc === dia && mesNasc === mesAtualCalendario;
        });
        
        if (aniversariantesDia.length > 0) {
            aniversariantesDia.forEach(aniv => {
                const anivBadge = document.createElement('div');
                anivBadge.className = 'calendario-aniversario';
                anivBadge.textContent = `🎂 ${(aniv.nome || aniv.nome_completo || 'Aniversariante').substring(0, 10)}`;
                cell.appendChild(anivBadge);
            });
        }
        
        // Destacar dia atual
        const hoje = new Date();
        if (dia === hoje.getDate() && mesAtualCalendario === hoje.getMonth() && anoAtualCalendario === hoje.getFullYear()) {
            cell.classList.add('calendario-dia-atual');
        }
        
        calendarioGrid.appendChild(cell);
    }
}

// Carregar programações passadas (todas as programações com data < hoje)
let programacoesPassadas = [];
async function carregarProgramacoesPassadas() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Buscar TODAS as programações aprovadas (sem filtro de mês/ano)
        const response = await fetch(`${API_URL}/programacoes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const todasProgramacoes = data.programacoes || [];
            
            // Obter data atual no formato YYYY-MM-DD
            const hoje = new Date();
            const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
            
            // Filtrar apenas programações passadas (data_evento < hoje)
            // Também considerar programações que já terminaram (data_fim_evento < hoje)
            programacoesPassadas = todasProgramacoes.filter(p => {
                if (!p.data_evento) return false;
                const dataEventoStr = p.data_evento.split('T')[0].split(' ')[0].trim();
                
                // Se tiver data_fim_evento, usar ela para comparação, senão usar data_evento
                if (p.data_fim_evento) {
                    const dataFimStr = p.data_fim_evento.split('T')[0].split(' ')[0].trim();
                    return dataFimStr < hojeStr;
                }
                
                return dataEventoStr < hojeStr;
            });
            
            // Ordenar por data (mais recente primeiro)
            programacoesPassadas.sort((a, b) => {
                const dataA = (a.data_fim_evento || a.data_evento).split('T')[0].split(' ')[0].trim();
                const dataB = (b.data_fim_evento || b.data_evento).split('T')[0].split(' ')[0].trim();
                return dataB.localeCompare(dataA); // Ordem decrescente (mais recente primeiro)
            });
            
            exibirProgramacoesPassadas();
        }
    } catch (error) {
        console.error('Erro ao carregar programações passadas:', error);
    }
}

// Exibir programações passadas
function exibirProgramacoesPassadas() {
    const listaProgramacoesPassadas = document.getElementById('listaProgramacoesPassadas');
    const contadorProgramacoesPassadas = document.getElementById('contadorProgramacoesPassadas');
    
    if (!listaProgramacoesPassadas) return;
    
    if (contadorProgramacoesPassadas) {
        contadorProgramacoesPassadas.textContent = `${programacoesPassadas.length} ${programacoesPassadas.length === 1 ? 'programação' : 'programações'}`;
    }
    
    if (programacoesPassadas.length === 0) {
        listaProgramacoesPassadas.innerHTML = '<p style="color: #666; padding: 20px; text-align: center; background: #f8f9fa; border-radius: 8px;">Nenhuma programação passada encontrada.</p>';
        return;
    }
    
    listaProgramacoesPassadas.innerHTML = programacoesPassadas.map(prog => {
        // Formatar data SEM usar new Date() para evitar problemas de fuso horário
        const dataEventoStr = prog.data_evento.split('T')[0].split(' ')[0].trim();
        const partesData = dataEventoStr.split('-');
        const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : dataEventoStr;
        
        let dataFimFormatada = '';
        if (prog.data_fim_evento) {
            const dataFimStr = prog.data_fim_evento.split('T')[0].split(' ')[0].trim();
            const partesDataFim = dataFimStr.split('-');
            dataFimFormatada = partesDataFim.length === 3 ? `${partesDataFim[2]}/${partesDataFim[1]}/${partesDataFim[0]}` : dataFimStr;
        }
        
        const local = prog.igreja_nome || prog.local_evento || 'Não informado';
        const membrosCount = prog.membros_vinculados ? prog.membros_vinculados.length : 0;
        
        return `
            <div style="background: #f5f5f5; padding: 20px; margin-bottom: 15px; border-radius: 10px; border-left: 4px solid #757575; opacity: 0.85; transition: all 0.3s;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #757575; font-size: 18px; font-weight: bold; flex: 1;">${prog.titulo}</h4>
                    ${prog.codigo ? `<span style="background: #757575; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 10px;">${prog.codigo}</span>` : ''}
                </div>
                
                ${prog.descricao ? `<p style="color: #666; margin: 8px 0; font-size: 14px; line-height: 1.5;">${prog.descricao}</p>` : ''}
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 12px; font-size: 13px; color: #666;">
                    <div>
                        <strong style="color: #757575;">📅 Data:</strong> ${dataFormatada}
                        ${dataFimFormatada ? ` até ${dataFimFormatada}` : ''}
                    </div>
                    ${prog.hora_evento ? `<div><strong style="color: #757575;">🕐 Hora:</strong> ${prog.hora_evento}</div>` : ''}
                    <div><strong style="color: #757575;">📍 Local:</strong> ${local}</div>
                    ${membrosCount > 0 ? `<div><strong style="color: #757575;">👥 Membros:</strong> ${membrosCount} ${membrosCount === 1 ? 'membro' : 'membros'}</div>` : ''}
                </div>
                
                <div style="margin-top: 12px; display: flex; gap: 10px;">
                    <button onclick="mostrarDetalhesProgramacao(${prog.id})" class="btn btn-secondary" style="padding: 8px 16px; font-size: 13px; background: #757575; color: white; border: none; border-radius: 6px; cursor: pointer; transition: all 0.3s;">
                        Ver Detalhes
                    </button>
                </div>
                <!-- Botões de Confirmação de Presença -->
                <div id="botoesConfirmacao_${prog.id}" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
                    <!-- Botões serão carregados via JavaScript -->
                </div>
            </div>
        `;
    }).join('');
    
    // Carregar botões de confirmação para cada programação passada
    programacoesPassadas.forEach(prog => {
        carregarBotoesConfirmacao(prog);
    });
}

// Carregar programações do mês (APENAS aprovadas da tabela programacoes)
async function carregarProgramacoes() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const mes = String(mesAtualCalendario + 1).padStart(2, '0');
        const ano = String(anoAtualCalendario);
        
        // Obter valores dos filtros
        const filtroIgreja = document.getElementById('filtroIgrejaProgramacao')?.value || '';
        const filtroCodigo = document.getElementById('filtroCodigoProgramacao')?.value.trim() || '';
        const filtroTitulo = document.getElementById('filtroTituloProgramacao')?.value.trim() || '';
        
        // Construir URL com filtros - SEMPRE buscar apenas de /programacoes (aprovadas)
        let url = `${API_URL}/programacoes?mes=${mes}&ano=${ano}`;
        if (filtroIgreja) url += `&igreja_id=${filtroIgreja}`;
        if (filtroCodigo) url += `&codigo=${encodeURIComponent(filtroCodigo)}`;
        if (filtroTitulo) url += `&titulo=${encodeURIComponent(filtroTitulo)}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Garantir que estamos usando apenas programacoes aprovadas (não solicitações)
            // Filtrar qualquer item que possa ter vindo incorretamente
            const programacoesAprovadas = (data.programacoes || []).filter(p => {
                // Programações aprovadas não têm status 'pendente' (que seria de solicitações)
                // Aceitar programações com ou sem código (para compatibilidade com registros antigos)
                return !p.status || p.status !== 'pendente';
            });
            
            // Ordenar programações por data e hora (mais antigo primeiro)
            // Usar comparação de strings diretamente (data já vem como YYYY-MM-DD do SQLite)
            programacoesMes = programacoesAprovadas.sort((a, b) => {
                // Comparar data primeiro (string YYYY-MM-DD)
                const comparacaoData = a.data_evento.localeCompare(b.data_evento);
                if (comparacaoData !== 0) {
                    return comparacaoData;
                }
                // Se a data for igual, comparar hora
                const horaA = a.hora_evento || '00:00';
                const horaB = b.hora_evento || '00:00';
                return horaA.localeCompare(horaB);
            });
            
            console.log(`[Carregar Programações] ${programacoesMes.length} programações carregadas para ${mes}/${ano}`);
            programacoesMes.forEach(p => {
                console.log(`  - ${p.titulo} em ${p.data_evento}`);
            });
            
            // Atualizar lista de programações
            exibirProgramacoes();
            
            // Recarregar calendário para mostrar as programações
            await carregarCalendario();
            
            // Carregar botões de confirmação após um pequeno delay
            setTimeout(() => {
                programacoesMes.forEach(prog => {
                    carregarBotoesConfirmacao(prog);
                });
            }, 100);
        }
    } catch (error) {
        console.error('Erro ao carregar programações:', error);
    }
}

// Determinar status da programação baseado na data
function determinarStatusProgramacao(dataEventoStr) {
    if (!dataEventoStr) return 'futura';
    
    // Obter data atual no formato YYYY-MM-DD
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    
    // Obter data de amanhã
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`;
    
    // Garantir formato YYYY-MM-DD
    const dataFormatada = dataEventoStr.split('T')[0].split(' ')[0].trim();
    
    // Comparar strings diretamente
    if (dataFormatada < hojeStr) {
        return 'passada';
    } else if (dataFormatada === hojeStr) {
        return 'hoje';
    } else if (dataFormatada === amanhaStr) {
        return 'amanha';
    } else {
        return 'futura';
    }
}

// Exibir programações
function exibirProgramacoes() {
    const listaProgramacoes = document.getElementById('listaProgramacoes');
    const contadorProgramacoes = document.getElementById('contadorProgramacoes');
    if (!listaProgramacoes) return;
    
    // Obter data atual no formato YYYY-MM-DD
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    
    // Filtrar apenas programações futuras ou do dia atual (remover passadas)
    const programacoesFuturas = programacoesMes.filter(prog => {
        if (!prog.data_evento) return false;
        const dataEventoStr = prog.data_evento.split('T')[0].split(' ')[0].trim();
        
        // Se tiver data_fim_evento, verificar se ela já passou
        if (prog.data_fim_evento) {
            const dataFimStr = prog.data_fim_evento.split('T')[0].split(' ')[0].trim();
            // Manter se a data_fim_evento for >= hoje (ainda não passou completamente)
            return dataFimStr >= hojeStr;
        }
        
        // Manter se a data_evento for >= hoje
        return dataEventoStr >= hojeStr;
    });
    
    // Atualizar contador com programações futuras
    if (contadorProgramacoes) {
        contadorProgramacoes.textContent = `${programacoesFuturas.length} ${programacoesFuturas.length === 1 ? 'programação' : 'programações'}`;
    }
    
    if (programacoesFuturas.length === 0) {
        listaProgramacoes.innerHTML = '<p style="color: #666; padding: 20px; text-align: center; background: #f8f9fa; border-radius: 8px;">Nenhuma programação futura cadastrada para este mês.</p>';
        return;
    }
    
    // As programações já estão ordenadas por data (mais antigo primeiro) do carregarProgramacoes
    listaProgramacoes.innerHTML = programacoesFuturas.map(prog => {
        // Formatar data SEM usar new Date() para evitar problemas de fuso horário
        // A data já vem como string YYYY-MM-DD do backend
        const dataEventoStr = prog.data_evento ? prog.data_evento.split('T')[0].split(' ')[0] : '';
        const partesData = dataEventoStr.split('-');
        const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : dataEventoStr;
        
        let dataFimFormatada = '';
        if (prog.data_fim_evento) {
            const dataFimStr = prog.data_fim_evento.split('T')[0].split(' ')[0];
            const partesDataFim = dataFimStr.split('-');
            dataFimFormatada = partesDataFim.length === 3 ? `${partesDataFim[2]}/${partesDataFim[1]}/${partesDataFim[0]}` : dataFimStr;
        }
        
        // Determinar status da programação
        const status = determinarStatusProgramacao(dataEventoStr);
        
        // Definir cores e estilos baseado no status
        let borderColor = '#667eea'; // Azul padrão (futura)
        let backgroundColor = 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)';
        let opacity = '1';
        let badgeNotificacao = '';
        
        if (status === 'passada') {
            // Cinza opaco
            borderColor = '#9e9e9e';
            backgroundColor = 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)';
            opacity = '0.6';
        } else if (status === 'hoje') {
            // Vermelho claro com notificação vermelha "HOJE"
            borderColor = '#f44336';
            backgroundColor = 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)';
            opacity = '1';
            badgeNotificacao = '<span style="background: #f44336; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; box-shadow: 0 2px 4px rgba(244, 67, 54, 0.3);">HOJE</span>';
        } else if (status === 'amanha') {
            // Amarelo com notificação laranja "É AMANHÃ!"
            borderColor = '#ffc107';
            backgroundColor = 'linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%)';
            opacity = '1';
            badgeNotificacao = '<span style="background: #ff9800; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; box-shadow: 0 2px 4px rgba(255, 152, 0, 0.3);">É AMANHÃ!</span>';
        } else {
            // Azul (futura)
            borderColor = '#667eea';
            backgroundColor = 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)';
            opacity = '1';
        }
        
        const localExibicao = prog.igreja_nome || prog.local_evento || 'Não informado';
        
        // Escapar aspas para JSON
        const progJson = JSON.stringify(prog).replace(/"/g, '&quot;');
        
        return `
            <div style="background: ${backgroundColor}; padding: 18px; border-radius: 10px; margin-bottom: 15px; border-left: 5px solid ${borderColor}; box-shadow: 0 3px 8px rgba(0,0,0,0.1); opacity: ${opacity};">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
                            ${prog.codigo ? `<span style="background: ${status === 'passada' ? '#9e9e9e' : borderColor}; color: white; padding: 4px 10px; border-radius: 5px; font-size: 12px; font-weight: bold; font-family: monospace; opacity: ${opacity};">${prog.codigo}</span>` : ''}
                            <h4 style="margin: 0; color: ${status === 'passada' ? '#757575' : (status === 'hoje' ? '#c62828' : (status === 'amanha' ? '#f57c00' : '#667eea'))}; font-size: 18px; font-weight: bold;">${prog.titulo}</h4>
                            ${badgeNotificacao}
                        </div>
                        ${prog.descricao ? `<p style="margin: 8px 0; color: ${status === 'passada' ? '#9e9e9e' : '#666'}; font-size: 14px; line-height: 1.5;">${prog.descricao}</p>` : ''}
                        <div style="background: ${status === 'passada' ? '#e0e0e0' : '#f8f9fa'}; padding: 12px; border-radius: 6px; margin: 10px 0;">
                            <p style="margin: 5px 0; color: ${status === 'passada' ? '#9e9e9e' : '#666'}; font-size: 14px;">
                                📅 <strong>Data:</strong> ${dataFormatada}
                                ${dataFimFormatada ? ` até ${dataFimFormatada}` : ''}
                                ${prog.hora_evento ? ` | 🕐 <strong>Hora:</strong> ${prog.hora_evento}` : ''}
                                ${localExibicao !== 'Não informado' ? ` | 📍 <strong>Local:</strong> ${localExibicao}` : ''}
                            </p>
                        </div>
                        ${prog.membros_vinculados && prog.membros_vinculados.length > 0 ? `
                            <p style="margin: 5px 0; color: ${status === 'passada' ? '#9e9e9e' : '#666'}; font-size: 13px;">
                                👥 <strong>Membros vinculados:</strong> ${prog.membros_vinculados.length}
                                ${prog.membros_vinculados.some(m => m.hora_especifica) ? 
                                    ` | Horário específico: ${prog.membros_vinculados.filter(m => m.hora_especifica).map(m => m.hora_especifica).join(', ')}` 
                                    : ''}
                            </p>
                        ` : ''}
                        <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">
                            Criado por: ${prog.criado_por_nome || 'Sistema'}
                        </p>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; margin-left: 15px;">
                        <button class="btn btn-primary btn-small" onclick="mostrarDetalhesProgramacao(${prog.id})" style="padding: 8px 12px; font-size: 13px; white-space: nowrap;">
                            👁️ Ver Detalhes
                        </button>
                        ${currentUserId === 1 ? `
                            <button class="btn btn-danger btn-small" onclick="deletarProgramacao(${prog.id})" style="padding: 8px 12px; font-size: 13px;">
                                🗑️ Excluir
                            </button>
                        ` : ''}
                    </div>
                </div>
                <!-- Botões de Confirmação de Presença -->
                <div id="botoesConfirmacao_${prog.id}" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid ${status === 'passada' ? '#e0e0e0' : '#e8e8e8'};">
                    <!-- Botões serão carregados via JavaScript -->
                </div>
            </div>
        `;
    }).join('');
    
    // Carregar botões de confirmação para cada programação
    programacoesFuturas.forEach(prog => {
        carregarBotoesConfirmacao(prog);
    });
}

// Carregar botões de confirmação de presença
async function carregarBotoesConfirmacao(prog) {
    const container = document.getElementById(`botoesConfirmacao_${prog.id}`);
    if (!container) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Verificar se programação já terminou
        const hoje = new Date();
        const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        const dataFimStr = (prog.data_fim_evento || prog.data_evento).split('T')[0].split(' ')[0].trim();
        const programacaoTerminou = dataFimStr < hojeStr;
        
        // Verificar se é admin ou criador
        const isAdmin = currentUserId === 1;
        const isCriador = prog.criado_por === currentUserId;
        const podeGerenciar = isAdmin || isCriador;
        
        // Carregar minha confirmação
        let minhaConfirmacao = null;
        try {
            const resMinhaConfirmacao = await fetch(`${API_URL}/programacoes/${prog.id}/minha-confirmacao`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resMinhaConfirmacao.ok) {
                const dataMinhaConfirmacao = await resMinhaConfirmacao.json();
                minhaConfirmacao = dataMinhaConfirmacao.confirmacao;
            }
        } catch (error) {
            console.error('Erro ao carregar confirmação:', error);
        }
        
        // Determinar se botões devem estar desabilitados
        const botõesDesabilitados = programacaoTerminou && !podeGerenciar;
        
        let htmlBotoes = '';
        if (botõesDesabilitados) {
            htmlBotoes = `
                <div style="display: flex; gap: 8px;">
                    <button disabled style="flex: 1; padding: 8px 12px; background: #ccc; color: #666; border: none; border-radius: 6px; font-size: 12px; cursor: not-allowed;">
                        ✓ Confirmar Presença (Programação Finalizada)
                    </button>
                    <button disabled style="flex: 1; padding: 8px 12px; background: #ccc; color: #666; border: none; border-radius: 6px; font-size: 12px; cursor: not-allowed;">
                        ✗ Não Poderei Ir (Programação Finalizada)
                    </button>
                </div>
            `;
        } else {
            if (minhaConfirmacao?.status === 'presente') {
                htmlBotoes = `
                    <div style="display: flex; gap: 8px;">
                        <button disabled style="flex: 1; padding: 8px 12px; background: #28a745; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: not-allowed; opacity: 0.7;">
                            ✓ Presença Confirmada
                        </button>
                        <button onclick="cancelarPresenca(${prog.id})" style="flex: 1; padding: 8px 12px; background: #dc3545; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
                            ✗ Não Poderei Ir
                        </button>
                    </div>
                `;
            } else if (minhaConfirmacao?.status === 'ausente') {
                htmlBotoes = `
                    <div style="display: flex; gap: 8px;">
                        <button onclick="confirmarPresenca(${prog.id})" style="flex: 1; padding: 8px 12px; background: #28a745; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
                            ✓ Confirmar Presença
                        </button>
                        <button disabled style="flex: 1; padding: 8px 12px; background: #dc3545; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: not-allowed; opacity: 0.7;">
                            ✗ Ausência Registrada
                        </button>
                    </div>
                `;
            } else {
                htmlBotoes = `
                    <div style="display: flex; gap: 8px;">
                        <button onclick="confirmarPresenca(${prog.id})" style="flex: 1; padding: 8px 12px; background: #28a745; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: bold;">
                            ✓ Confirmar Presença
                        </button>
                        <button onclick="cancelarPresenca(${prog.id})" style="flex: 1; padding: 8px 12px; background: #dc3545; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: bold;">
                            ✗ Não Poderei Ir
                        </button>
                    </div>
                `;
            }
        }
        
        container.innerHTML = htmlBotoes;
    } catch (error) {
        console.error('Erro ao carregar botões de confirmação:', error);
    }
}

// Mostrar detalhes completos da programação
window.mostrarDetalhesProgramacao = async function(progId) {
    // Se progId for um número, buscar a programação
    let prog;
    if (typeof progId === 'number') {
        // Buscar em programacoesMes, programacoesPassadas, ou fazer uma busca
        prog = programacoesMes.find(p => p.id === progId);
        if (!prog) {
            // Tentar buscar nas programações passadas
            if (typeof programacoesPassadas !== 'undefined') {
                prog = programacoesPassadas.find(p => p.id === progId);
            }
        }
        if (!prog) {
            mostrarMensagem('Programação não encontrada', 'error');
            return;
        }
    } else {
        prog = progId;
    }
    
    // Carregar confirmações, anexos e status do usuário atual
    let confirmacoes = [];
    let minhaConfirmacao = null;
    let anexos = [];
    try {
        const token = localStorage.getItem('token');
        if (token) {
            // Carregar confirmações
            const resConfirmacoes = await fetch(`${API_URL}/programacoes/${prog.id}/confirmacoes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resConfirmacoes.ok) {
                const dataConfirmacoes = await resConfirmacoes.json();
                confirmacoes = dataConfirmacoes.confirmacoes || [];
            }
            
            // Carregar minha confirmação
            const resMinhaConfirmacao = await fetch(`${API_URL}/programacoes/${prog.id}/minha-confirmacao`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resMinhaConfirmacao.ok) {
                const dataMinhaConfirmacao = await resMinhaConfirmacao.json();
                minhaConfirmacao = dataMinhaConfirmacao.confirmacao;
            }
            
            // Carregar anexos
            const resAnexos = await fetch(`${API_URL}/programacoes/${prog.id}/anexos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resAnexos.ok) {
                const dataAnexos = await resAnexos.json();
                anexos = dataAnexos.anexos || [];
            }
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
    
    // Formatar data SEM usar new Date() para evitar problemas de fuso horário
    // A data já vem como string YYYY-MM-DD do backend
    const dataEventoStr = prog.data_evento ? prog.data_evento.split('T')[0].split(' ')[0] : '';
    const partesData = dataEventoStr.split('-');
    const dia = partesData.length === 3 ? partesData[2] : '';
    const mes = partesData.length === 3 ? partesData[1] : '';
    const ano = partesData.length === 3 ? partesData[0] : '';
    
    // Nomes dos meses e dias da semana em português
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    
    // Calcular dia da semana sem usar Date (para evitar fuso horário)
    // Usar algoritmo Zeller ou criar Date apenas para obter o dia da semana
    let diaSemana = '';
    if (partesData.length === 3) {
        // Criar Date apenas para obter o dia da semana, mas usar data local
        const dataParaDiaSemana = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        diaSemana = diasSemana[dataParaDiaSemana.getDay()];
    }
    
    const dataFormatada = partesData.length === 3 
        ? `${diaSemana}, ${dia} de ${meses[parseInt(mes) - 1]} de ${ano}`
        : dataEventoStr;
    
    let dataFimFormatada = '';
    if (prog.data_fim_evento) {
        const dataFimStr = prog.data_fim_evento.split('T')[0].split(' ')[0];
        const partesDataFim = dataFimStr.split('-');
        const diaFim = partesDataFim.length === 3 ? partesDataFim[2] : '';
        const mesFim = partesDataFim.length === 3 ? partesDataFim[1] : '';
        const anoFim = partesDataFim.length === 3 ? partesDataFim[0] : '';
        if (partesDataFim.length === 3) {
            const dataParaDiaSemanaFim = new Date(parseInt(anoFim), parseInt(mesFim) - 1, parseInt(diaFim));
            const diaSemanaFim = diasSemana[dataParaDiaSemanaFim.getDay()];
            dataFimFormatada = `${diaSemanaFim}, ${diaFim} de ${meses[parseInt(mesFim) - 1]} de ${anoFim}`;
        }
    }
    
    const localExibicao = prog.igreja_nome || prog.local_evento || 'Não informado';
    
    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'modalDetalhesProgramacao';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; max-width: 700px; width: 100%; max-height: 90vh; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative; display: flex; flex-direction: column; overflow: hidden;">
            <!-- Cabeçalho Fixo -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; color: white; position: relative; flex-shrink: 0; border-radius: 16px 16px 0 0; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                <button onclick="document.getElementById('modalDetalhesProgramacao').remove()" style="position: absolute; top: 20px; right: 20px; background: rgba(255, 255, 255, 0.2); color: white; border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 50%; width: 38px; height: 38px; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 10001; transition: all 0.3s; backdrop-filter: blur(10px);" onmouseover="this.style.background='rgba(255,255,255,0.3)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='scale(1)'">✕</button>
                <div style="display: flex; align-items: center; gap: 15px; padding-right: 50px;">
                    ${prog.codigo ? `<span style="background: rgba(255,255,255,0.25); color: white; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: bold; font-family: monospace; border: 1px solid rgba(255,255,255,0.4); backdrop-filter: blur(10px); box-shadow: 0 2px 8px rgba(0,0,0,0.1);">${prog.codigo}</span>` : ''}
                    <h2 style="margin: 0; font-size: 26px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.5px;">${prog.titulo}</h2>
                </div>
            </div>
            
            <!-- Conteúdo Rolável -->
            <div class="modal-content-scrollable" style="padding: 25px; overflow-y: auto; overflow-x: hidden; flex: 1; background: #f8f9fa; max-height: calc(90vh - 120px);">
                ${prog.descricao ? `
                    <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h3 style="margin: 0 0 12px 0; color: #667eea; font-size: 18px; display: flex; align-items: center;">
                            <span style="font-size: 22px; margin-right: 8px;">📄</span> Descrição Detalhada
                        </h3>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                            <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${prog.descricao}</p>
                        </div>
                    </div>
                ` : ''}
                
                <div style="background: white; padding: 18px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 12px 0; color: #667eea; font-size: 18px; display: flex; align-items: center;">
                        <span style="font-size: 22px; margin-right: 8px;">📅</span> Informações do Evento
                    </h3>
                    <div style="display: grid; gap: 10px;">
                        <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                            <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Data de Início</span>
                            <strong style="color: #333; font-size: 15px;">${dataFormatada}</strong>
                        </div>
                        ${dataFimFormatada ? `
                            <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                                <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Data de Fim</span>
                                <strong style="color: #333; font-size: 15px;">${dataFimFormatada}</strong>
                            </div>
                        ` : ''}
                        ${prog.hora_evento ? `
                            <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                                <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Hora</span>
                                <strong style="color: #333; font-size: 15px;">🕐 ${prog.hora_evento}</strong>
                            </div>
                        ` : ''}
                        <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                            <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Local</span>
                            <strong style="color: #333; font-size: 15px;">📍 ${localExibicao}</strong>
                        </div>
                    </div>
                </div>
                
                ${prog.membros_vinculados && prog.membros_vinculados.length > 0 ? `
                    <div style="background: white; padding: 18px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h3 style="margin: 0 0 12px 0; color: #1976d2; font-size: 18px; display: flex; align-items: center;">
                            <span style="font-size: 22px; margin-right: 8px;">👥</span> Membros Vinculados (${prog.membros_vinculados.length})
                        </h3>
                        <div style="display: grid; gap: 8px;">
                            ${prog.membros_vinculados.map(membro => `
                                <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #2196f3;">
                                    <strong style="color: #1976d2; font-size: 14px;">${membro.nome || membro.nome_completo || 'Membro'}</strong>
                                    ${membro.email ? `<br><span style="color: #666; font-size: 13px;">📧 ${membro.email}</span>` : ''}
                                    ${membro.telefone ? `<br><span style="color: #666; font-size: 13px;">📞 ${membro.telefone}</span>` : ''}
                                    ${membro.hora_especifica ? `<br><span style="color: #ff9800; font-size: 13px; font-weight: bold;">🕐 Horário específico: ${membro.hora_especifica}</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${prog.observacoes ? `
                    <div style="background: white; padding: 18px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h3 style="margin: 0 0 12px 0; color: #856404; font-size: 18px; display: flex; align-items: center;">
                            <span style="font-size: 22px; margin-right: 8px;">📝</span> Observações e Anotações
                        </h3>
                        <div style="background: #fffbf0; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; border: 1px solid #ffe082;">
                            <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${prog.observacoes}</p>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Seção de Confirmação de Presença (sem botões, apenas lista) -->
                <div style="background: white; padding: 18px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 15px 0; color: #28a745; font-size: 18px; display: flex; align-items: center; justify-content: space-between;">
                        <span style="display: flex; align-items: center;">
                            <span style="font-size: 22px; margin-right: 8px;">✅</span> Confirmação de Presença
                        </span>
                        ${(currentUserId === 1 || prog.criado_por === currentUserId) ? `
                            <button onclick="abrirModalGerenciarConfirmacoes(${prog.id})" style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
                                ⚙️ Gerenciar
                            </button>
                        ` : ''}
                    </h3>
                    
                    <!-- Lista de Confirmações -->
                    ${confirmacoes.length > 0 ? `
                        <div style="margin-top: 20px;">
                            <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px; display: flex; align-items: center;">
                                <span style="font-size: 18px; margin-right: 8px;">📋</span> Histórico de Confirmações
                            </h4>
                            
                            <!-- Presentes -->
                            ${confirmacoes.filter(c => c.status === 'presente').length > 0 ? `
                                <div style="margin-bottom: 15px;">
                                    <h5 style="margin: 0 0 8px 0; color: #28a745; font-size: 14px; font-weight: bold;">
                                        ✅ Presentes (${confirmacoes.filter(c => c.status === 'presente').length})
                                    </h5>
                                    <div style="display: grid; gap: 8px;">
                                        ${confirmacoes.filter(c => c.status === 'presente').map(conf => `
                                            <div style="padding: 10px; background: #d4edda; border-radius: 6px; border-left: 4px solid #28a745;">
                                                <strong style="color: #155724; font-size: 14px;">${conf.nome_completo || conf.nome || 'Usuário'}</strong>
                                                <span style="color: #666; font-size: 12px; margin-left: 8px;">
                                                    Confirmado em ${new Date(conf.criado_em).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Ausentes -->
                            ${confirmacoes.filter(c => c.status === 'ausente').length > 0 ? `
                                <div>
                                    <h5 style="margin: 0 0 8px 0; color: #dc3545; font-size: 14px; font-weight: bold;">
                                        ❌ Ausentes (${confirmacoes.filter(c => c.status === 'ausente').length})
                                    </h5>
                                    <div style="display: grid; gap: 8px;">
                                        ${confirmacoes.filter(c => c.status === 'ausente').map(conf => `
                                            <div style="padding: 10px; background: #f8d7da; border-radius: 6px; border-left: 4px solid #dc3545;">
                                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                                    <div style="flex: 1;">
                                                        <strong style="color: #721c24; font-size: 14px;">${conf.nome_completo || conf.nome || 'Usuário'}</strong>
                                                        <span style="color: #666; font-size: 12px; margin-left: 8px; display: block; margin-top: 4px;">
                                                            Registrado em ${new Date(conf.atualizado_em || conf.criado_em).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    ${conf.justificativa ? `
                                                        <button onclick="mostrarJustificativaAusencia(${prog.id}, ${conf.usuario_id})" 
                                                                style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 5px; font-size: 12px; cursor: pointer; margin-left: 10px; white-space: nowrap;">
                                                            📝 Ver Justificativa
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <p style="color: #666; font-size: 14px; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                            Nenhuma confirmação ainda. Seja o primeiro a confirmar!
                        </p>
                    `}
                </div>
                
                <!-- Seção de Anexos/Notas -->
                <div style="background: white; padding: 18px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 12px 0; color: #9c27b0; font-size: 18px; display: flex; align-items: center; justify-content: space-between;">
                        <span style="display: flex; align-items: center;">
                            <span style="font-size: 22px; margin-right: 8px;">📎</span> Anexos e Notas
                        </span>
                        ${(currentUserId === 1 || prog.criado_por === currentUserId) ? `
                            <button onclick="abrirModalAdicionarAnexo(${prog.id})" style="padding: 6px 12px; background: #9c27b0; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
                                ➕ Adicionar
                            </button>
                        ` : ''}
                    </h3>
                    ${anexos.length > 0 ? `
                        <div style="display: grid; gap: 10px; margin-top: 15px;">
                            ${anexos.map(anexo => `
                                <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #9c27b0;">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                        <div style="flex: 1;">
                                            ${(() => {
                                                if (anexo.tipo === 'foto') return '📷';
                                                if (anexo.tipo === 'nota') return '📝';
                                                if (anexo.arquivo_nome) {
                                                    const ext = anexo.arquivo_nome.split('.').pop().toLowerCase();
                                                    if (ext === 'pdf') return '📄';
                                                    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'];
                                                    if (imageExts.includes(ext)) return '📷';
                                                }
                                                return '📄';
                                            })()}
                                            <strong style="color: #7b1fa2; font-size: 14px; margin-left: 5px;">${anexo.titulo || (anexo.tipo === 'nota' ? 'Nota' : anexo.arquivo_nome || 'Anexo')}</strong>
                                            ${anexo.conteudo ? `
                                                <div style="margin-top: 8px;">
                                                    <div id="conteudoAnexoPreview_${anexo.id}" style="padding: 15px; background: white; border-radius: 8px; font-size: 14px; color: #2c3e50; white-space: pre-wrap; max-height: 150px; overflow-y: auto; border: 1px solid #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.7; letter-spacing: 0.1px;">
                                                        ${anexo.conteudo.length > 500 ? anexo.conteudo.substring(0, 500) + '...' : anexo.conteudo}
                                                    </div>
                                                    ${anexo.conteudo.length > 500 ? `
                                                        <button onclick="mostrarConteudoCompletoAnexo(${prog.id}, ${anexo.id})" 
                                                                style="margin-top: 8px; padding: 8px 14px; background: #9c27b0; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(156, 39, 176, 0.2);"
                                                                onmouseover="this.style.background='#7b1fa2'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(156, 39, 176, 0.3)'"
                                                                onmouseout="this.style.background='#9c27b0'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(156, 39, 176, 0.2)'">
                                                            📖 ${anexo.titulo || 'Ver Conteúdo Completo'} (${anexo.conteudo.length} caracteres)
                                                        </button>
                                                    ` : `
                                                        <div style="margin-top: 5px; font-size: 11px; color: #666;">
                                                            ${anexo.conteudo.length} caracteres
                                                        </div>
                                                    `}
                                                </div>
                                            ` : ''}
                                            ${anexo.arquivo_nome ? (() => {
                                                const ext = anexo.arquivo_nome.split('.').pop().toLowerCase();
                                                const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'];
                                                const isImage = imageExts.includes(ext);
                                                const isPdf = ext === 'pdf';
                                                const canPreview = isImage || isPdf;
                                                
                                                if (canPreview) {
                                                    return `
                                                        <div style="margin-top: 12px;">
                                                            ${isImage ? `
                                                                <div style="margin-bottom: 10px;" id="imagemContainer_${anexo.id}">
                                                                    <div style="padding: 40px; background: #f8f9fa; border-radius: 8px; text-align: center; color: #666;">
                                                                        <p>Carregando imagem...</p>
                                                                    </div>
                                                                </div>
                                                            ` : isPdf ? `
                                                                <div style="margin-bottom: 10px; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 2px solid #e0e0e0; text-align: center;">
                                                                    <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                                                                    <div style="font-size: 13px; color: #666; margin-bottom: 10px;">${anexo.arquivo_nome}</div>
                                                                </div>
                                                            ` : ''}
                                                            <button onclick="abrirVisualizadorFoto(${prog.id}, ${anexo.id}, '${(anexo.titulo || anexo.arquivo_nome || (isPdf ? 'PDF' : 'Arquivo')).replace(/'/g, "\\'")}')" 
                                                                    style="padding: 8px 14px; background: #9c27b0; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(156, 39, 176, 0.2); margin-right: 8px;"
                                                                    onmouseover="this.style.background='#7b1fa2'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(156, 39, 176, 0.3)'"
                                                                    onmouseout="this.style.background='#9c27b0'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(156, 39, 176, 0.2)'">
                                                                ${isPdf ? '📄 Visualizar PDF' : '🖼️ Visualizar'}
                                                            </button>
                                                            <a href="${API_URL}/programacoes/${prog.id}/anexos/${anexo.id}/arquivo?download=true" 
                                                               download="${anexo.arquivo_nome}"
                                                               style="padding: 8px 14px; background: #28a745; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s; box-shadow: 0 2px 4px rgba(40, 167, 69, 0.2);"
                                                               onmouseover="this.style.background='#218838'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(40, 167, 69, 0.3)'"
                                                               onmouseout="this.style.background='#28a745'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(40, 167, 69, 0.2)'">
                                                                📥 Baixar
                                                            </a>
                                                        </div>
                                                    `;
                                                }
                                                return `
                                                    <div style="margin-top: 8px;">
                                                        <a href="${API_URL}/programacoes/${prog.id}/anexos/${anexo.id}/arquivo?download=true" target="_blank" style="color: #9c27b0; text-decoration: none; font-size: 13px;">
                                                            📥 Baixar: ${anexo.arquivo_nome}
                                                        </a>
                                                    </div>
                                                `;
                                            })() : ''}
                                            <div style="margin-top: 6px; font-size: 11px; color: #666;">
                                                Por: ${anexo.nome_completo || anexo.nome || 'Usuário'} em ${new Date(anexo.criado_em).toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                        ${(currentUserId === 1 || prog.criado_por === currentUserId || anexo.usuario_id === currentUserId) ? `
                                            <button onclick="deletarAnexo(${prog.id}, ${anexo.id})" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; margin-left: 10px;">
                                                🗑️
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p style="color: #666; font-size: 14px; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; margin-top: 15px;">
                            Nenhum anexo ou nota ainda.
                        </p>
                    `}
                </div>
                
                <div style="background: white; padding: 18px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 12px 0; color: #1976d2; font-size: 18px; display: flex; align-items: center;">
                        <span style="font-size: 22px; margin-right: 8px;">👤</span> Informações do Criador
                    </h3>
                    <div style="display: grid; gap: 10px;">
                        <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #2196f3;">
                            <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Nome</span>
                            <strong style="color: #1976d2; font-size: 15px;">${prog.criado_por_nome_completo || prog.criado_por_nome || 'Sistema'}</strong>
                            ${prog.criado_por_nome_completo && prog.criado_por_nome ? `<span style="color: #666; font-size: 13px; margin-left: 8px;">(${prog.criado_por_nome})</span>` : ''}
                        </div>
                        ${prog.criado_por_id ? `
                            <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #2196f3;">
                                <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">ID do Cadastro</span>
                                <strong style="color: #1976d2; font-size: 15px;">#${prog.criado_por_id}</strong>
                            </div>
                        ` : ''}
                        ${prog.criado_por_ocupacao ? `
                            <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #2196f3;">
                                <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Ocupação</span>
                                <strong style="color: #1976d2; font-size: 15px;">${prog.criado_por_ocupacao}</strong>
                            </div>
                        ` : ''}
                        ${prog.criado_em ? `
                            <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #2196f3;">
                                <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Data de Criação</span>
                                <strong style="color: #1976d2; font-size: 15px;">${new Date(prog.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button onclick="document.getElementById('modalDetalhesProgramacao').remove()" class="btn btn-secondary" style="flex: 1; padding: 12px;">
                        Fechar
                    </button>
                    ${currentUserId === 1 ? `
                        <button onclick="deletarProgramacao(${prog.id}); document.getElementById('modalDetalhesProgramacao').remove();" class="btn btn-danger" style="flex: 1; padding: 12px;">
                            🗑️ Excluir Programação
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Carregar imagens após renderizar o modal
    setTimeout(() => {
        anexos.forEach(anexo => {
            if (anexo.arquivo_nome) {
                const ext = anexo.arquivo_nome.split('.').pop().toLowerCase();
                const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'];
                if (imageExts.includes(ext)) {
                    const titulo = anexo.titulo || anexo.arquivo_nome || 'Foto';
                    carregarImagemAutenticada(prog.id, anexo.id, `imagemContainer_${anexo.id}`, titulo);
                }
            }
        });
    }, 200);
};

// Confirmar presença em uma programação
window.confirmarPresenca = async function(programacaoId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarMensagem('Você precisa estar logado para confirmar presença', 'error');
            return;
        }
        
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/confirmar-presenca`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            mostrarMensagem('Presença confirmada com sucesso!', 'success');
            // Recarregar botões de confirmação
            const prog = programacoesMes.find(p => p.id === programacaoId) || programacoesPassadas?.find(p => p.id === programacaoId);
            if (prog) {
                await carregarBotoesConfirmacao(prog);
            }
            // Atualizar modal se estiver aberto
            const modal = document.getElementById('modalDetalhesProgramacao');
            if (modal) {
                const progId = programacaoId;
                modal.remove();
                setTimeout(() => {
                    mostrarDetalhesProgramacao(progId);
                }, 300);
            }
        } else {
            const data = await response.json();
            mostrarMensagem(data.erro || 'Erro ao confirmar presença', 'error');
        }
    } catch (error) {
        console.error('Erro ao confirmar presença:', error);
        mostrarMensagem('Erro ao confirmar presença', 'error');
    }
};

// Cancelar presença (mostrar modal para justificativa)
window.cancelarPresenca = function(programacaoId) {
    // Criar modal para justificativa
    const modal = document.createElement('div');
    modal.id = 'modalJustificativaAusencia';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 11000; display: flex; align-items: center; justify-content: center; padding: 20px;';
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; max-width: 500px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;">
            <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 20px; color: white; border-radius: 16px 16px 0 0;">
                <h3 style="margin: 0; font-size: 20px; font-weight: bold;">❌ Registrar Ausência</h3>
            </div>
            <div style="padding: 25px;">
                <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">
                    Por favor, informe o motivo da sua ausência (opcional):
                </p>
                <textarea id="justificativaAusencia" 
                    placeholder="Ex: Estarei viajando, tenho um compromisso médico, etc..." 
                    style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 100px; margin-bottom: 20px;"></textarea>
                <div style="display: flex; gap: 10px;">
                    <button onclick="document.getElementById('modalJustificativaAusencia').remove()" 
                            class="btn btn-secondary" 
                            style="flex: 1; padding: 12px;">
                        Cancelar
                    </button>
                    <button onclick="enviarCancelamentoPresenca(${programacaoId})" 
                            class="btn btn-danger" 
                            style="flex: 1; padding: 12px;">
                        Confirmar Ausência
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    // Focar no textarea
    setTimeout(() => {
        document.getElementById('justificativaAusencia')?.focus();
    }, 100);
};

// Enviar cancelamento de presença
window.enviarCancelamentoPresenca = async function(programacaoId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarMensagem('Você precisa estar logado para registrar ausência', 'error');
            return;
        }
        
        const justificativa = document.getElementById('justificativaAusencia')?.value || '';
        
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/cancelar-presenca`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ justificativa: justificativa.trim() })
        });
        
        if (response.ok) {
            mostrarMensagem('Ausência registrada com sucesso!', 'success');
            // Fechar modal de justificativa
            const modalJustificativa = document.getElementById('modalJustificativaAusencia');
            if (modalJustificativa) {
                modalJustificativa.remove();
            }
            // Recarregar botões de confirmação
            const prog = programacoesMes.find(p => p.id === programacaoId) || programacoesPassadas?.find(p => p.id === programacaoId);
            if (prog) {
                await carregarBotoesConfirmacao(prog);
            }
            // Atualizar modal se estiver aberto
            const modalDetalhes = document.getElementById('modalDetalhesProgramacao');
            if (modalDetalhes) {
                const progId = programacaoId;
                modalDetalhes.remove();
                setTimeout(() => {
                    mostrarDetalhesProgramacao(progId);
                }, 300);
            }
        } else {
            const data = await response.json();
            mostrarMensagem(data.erro || 'Erro ao registrar ausência', 'error');
        }
    } catch (error) {
        console.error('Erro ao cancelar presença:', error);
        mostrarMensagem('Erro ao registrar ausência', 'error');
    }
};

// Mostrar justificativa de ausência
window.mostrarJustificativaAusencia = async function(programacaoId, usuarioId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarMensagem('Erro ao carregar justificativa', 'error');
            return;
        }
        
        // Buscar confirmações para encontrar a justificativa
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/confirmacoes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            mostrarMensagem('Erro ao carregar justificativa', 'error');
            return;
        }
        
        const data = await response.json();
        const confirmacao = data.confirmacoes?.find(c => c.usuario_id === usuarioId && c.status === 'ausente');
        
        if (!confirmacao) {
            mostrarMensagem('Justificativa não encontrada', 'error');
            return;
        }
        
        const nome = confirmacao.nome_completo || confirmacao.nome || 'Usuário';
        const justificativa = confirmacao.justificativa || 'Nenhuma justificativa fornecida.';
        
        // Criar modal
        const modal = document.createElement('div');
        modal.id = 'modalVerJustificativa';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 11000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        
        // Escapar HTML para segurança
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; max-width: 500px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;">
                <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 20px; color: white; border-radius: 16px 16px 0 0;">
                    <h3 style="margin: 0; font-size: 20px; font-weight: bold;">📝 Justificativa de Ausência</h3>
                </div>
                <div style="padding: 25px;">
                    <div style="margin-bottom: 15px;">
                        <strong style="color: #333; font-size: 14px; display: block; margin-bottom: 5px;">Pessoa:</strong>
                        <span style="color: #666; font-size: 16px;">${escapeHtml(nome)}</span>
                    </div>
                    <div>
                        <strong style="color: #333; font-size: 14px; display: block; margin-bottom: 10px;">Justificativa:</strong>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #dc3545; white-space: pre-wrap; color: #333; font-size: 14px; line-height: 1.6;">
                            ${escapeHtml(justificativa)}
                        </div>
                    </div>
                    <button onclick="document.getElementById('modalVerJustificativa').remove()" 
                            class="btn btn-secondary" 
                            style="width: 100%; padding: 12px; margin-top: 20px;">
                        Fechar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Erro ao mostrar justificativa:', error);
        mostrarMensagem('Erro ao carregar justificativa', 'error');
    }
};

// Abrir modal para adicionar anexo
window.abrirModalAdicionarAnexo = function(programacaoId) {
    const modal = document.createElement('div');
    modal.id = 'modalAdicionarAnexo';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 11000; display: flex; align-items: center; justify-content: center; padding: 20px;';
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; max-width: 600px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;">
            <div style="background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%); padding: 20px; color: white; border-radius: 16px 16px 0 0;">
                <h3 style="margin: 0; font-size: 20px; font-weight: bold;">📎 Adicionar Anexo/Nota</h3>
            </div>
            <div style="padding: 25px;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Tipo:</label>
                    <select id="tipoAnexo" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                        <option value="nota">📝 Nota</option>
                        <option value="foto">📷 Foto</option>
                        <option value="arquivo">📄 Arquivo</option>
                    </select>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Título (opcional):</label>
                    <input type="text" id="tituloAnexo" placeholder="Título do anexo..." style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                </div>
                <div id="containerConteudo" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Conteúdo/Nota (máx. 10.000 caracteres):</label>
                    <textarea id="conteudoAnexo" placeholder="Digite sua nota aqui..." rows="8" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical;"></textarea>
                    <div style="margin-top: 5px; font-size: 12px; color: #666; text-align: right;">
                        <span id="contadorCaracteres">0</span>/10.000 caracteres
                    </div>
                </div>
                <div id="containerArquivo" style="margin-bottom: 15px; display: none;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #333;">Arquivo (máx. 5MB):</label>
                    <input type="file" id="arquivoAnexo" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px;">
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="document.getElementById('modalAdicionarAnexo').remove()" class="btn btn-secondary" style="flex: 1; padding: 12px;">
                        Cancelar
                    </button>
                    <button onclick="enviarAnexo(${programacaoId})" class="btn btn-primary" style="flex: 1; padding: 12px; background: #9c27b0;">
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Contador de caracteres
    const conteudoAnexo = document.getElementById('conteudoAnexo');
    const contadorCaracteres = document.getElementById('contadorCaracteres');
    const tipoAnexo = document.getElementById('tipoAnexo');
    const containerConteudo = document.getElementById('containerConteudo');
    const containerArquivo = document.getElementById('containerArquivo');
    
    if (conteudoAnexo && contadorCaracteres) {
        conteudoAnexo.addEventListener('input', (e) => {
            let valor = e.target.value;
            // Limitar a 10.000 caracteres
            if (valor.length > 10000) {
                valor = valor.substring(0, 10000);
                e.target.value = valor;
                mostrarMensagem('Limite de 10.000 caracteres atingido', 'warning');
            }
            const tamanho = valor.length;
            contadorCaracteres.textContent = tamanho;
            // Mudar cor se próximo do limite
            if (tamanho > 9500) {
                contadorCaracteres.style.color = '#dc3545';
                contadorCaracteres.style.fontWeight = 'bold';
            } else if (tamanho > 8000) {
                contadorCaracteres.style.color = '#ff9800';
                contadorCaracteres.style.fontWeight = 'normal';
            } else {
                contadorCaracteres.style.color = '#666';
                contadorCaracteres.style.fontWeight = 'normal';
            }
        });
        
        // Também validar ao colar (paste)
        conteudoAnexo.addEventListener('paste', (e) => {
            setTimeout(() => {
                let valor = e.target.value;
                if (valor.length > 10000) {
                    valor = valor.substring(0, 10000);
                    e.target.value = valor;
                    mostrarMensagem('Limite de 10.000 caracteres atingido. Texto colado foi truncado.', 'warning');
                    contadorCaracteres.textContent = valor.length;
                }
            }, 10);
        });
    }
    
    if (tipoAnexo) {
        tipoAnexo.addEventListener('change', () => {
            if (tipoAnexo.value === 'nota') {
                containerConteudo.style.display = 'block';
                containerArquivo.style.display = 'none';
            } else {
                containerConteudo.style.display = 'none';
                containerArquivo.style.display = 'block';
            }
        });
    }
};

// Enviar anexo
window.enviarAnexo = async function(programacaoId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarMensagem('Você precisa estar logado', 'error');
            return;
        }
        
        const tipo = document.getElementById('tipoAnexo')?.value || 'nota';
        const titulo = document.getElementById('tituloAnexo')?.value || '';
        const conteudoElement = document.getElementById('conteudoAnexo');
        const conteudo = conteudoElement ? conteudoElement.value : ''; // NÃO usar trim() para preservar todo o conteúdo
        const arquivoInput = document.getElementById('arquivoAnexo');
        
        // Validar
        if (tipo === 'nota' && conteudo.trim().length === 0) {
            mostrarMensagem('Por favor, digite uma nota', 'error');
            return;
        }
        
        if ((tipo === 'foto' || tipo === 'arquivo') && (!arquivoInput || !arquivoInput.files || !arquivoInput.files[0])) {
            mostrarMensagem('Por favor, selecione um arquivo', 'error');
            return;
        }
        
        // Verificar tamanho do conteúdo (contar todos os caracteres, incluindo espaços e quebras de linha)
        if (conteudo.length > 10000) {
            mostrarMensagem(`Conteúdo muito longo. Máximo de 10.000 caracteres. (Atual: ${conteudo.length})`, 'error');
            return;
        }
        
        console.log(`[Enviar Anexo] Tipo: ${tipo}, Tamanho do conteúdo: ${conteudo.length} caracteres`);
        
        let arquivoNome = null;
        let arquivoTipo = null;
        let arquivoDados = null;
        
        if (arquivoInput && arquivoInput.files && arquivoInput.files[0]) {
            const file = arquivoInput.files[0];
            arquivoNome = file.name;
            arquivoTipo = file.type;
            
            // Ler arquivo como base64
            const reader = new FileReader();
            arquivoDados = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result.split(',')[1]); // Remove data:type;base64, prefix
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        
        // Preparar dados para envio
        const dadosEnvio = {
            tipo,
            titulo: titulo.trim() || null,
            conteudo: conteudo || null, // NÃO usar trim() para preservar todo o conteúdo
            arquivo_nome: arquivoNome,
            arquivo_tipo: arquivoTipo,
            arquivo_dados: arquivoDados
        };
        
        // Preparar JSON para envio
        const jsonString = JSON.stringify(dadosEnvio);
        console.log(`[Enviar Anexo] Preparando envio: Tipo=${tipo}, Tamanho do conteúdo=${conteudo.length} caracteres, Tamanho do JSON=${jsonString.length} bytes`);
        
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/anexos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: jsonString
        });
        
        if (response.ok) {
            mostrarMensagem('Anexo adicionado com sucesso!', 'success');
            const modal = document.getElementById('modalAdicionarAnexo');
            if (modal) modal.remove();
            
            // Recarregar modal de detalhes
            const modalDetalhes = document.getElementById('modalDetalhesProgramacao');
            if (modalDetalhes) {
                const progId = programacaoId;
                modalDetalhes.remove();
                setTimeout(() => {
                    mostrarDetalhesProgramacao(progId);
                }, 300);
            }
        } else {
            const data = await response.json();
            mostrarMensagem(data.erro || 'Erro ao adicionar anexo', 'error');
        }
    } catch (error) {
        console.error('Erro ao enviar anexo:', error);
        mostrarMensagem('Erro ao adicionar anexo', 'error');
    }
};

// Deletar anexo
window.deletarAnexo = async function(programacaoId, anexoId) {
    if (!confirm('Tem certeza que deseja deletar este anexo?')) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarMensagem('Você precisa estar logado', 'error');
            return;
        }
        
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/anexos/${anexoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            mostrarMensagem('Anexo deletado com sucesso!', 'success');
            
            // Recarregar modal de detalhes
            const modalDetalhes = document.getElementById('modalDetalhesProgramacao');
            if (modalDetalhes) {
                const progId = programacaoId;
                modalDetalhes.remove();
                setTimeout(() => {
                    mostrarDetalhesProgramacao(progId);
                }, 300);
            }
        } else {
            const data = await response.json();
            mostrarMensagem(data.erro || 'Erro ao deletar anexo', 'error');
        }
    } catch (error) {
        console.error('Erro ao deletar anexo:', error);
        mostrarMensagem('Erro ao deletar anexo', 'error');
    }
};

// Abrir modal para gerenciar confirmações (admin/criador)
window.abrirModalGerenciarConfirmacoes = async function(programacaoId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Carregar confirmações e usuários
        const [resConfirmacoes, resUsuarios] = await Promise.all([
            fetch(`${API_URL}/programacoes/${programacaoId}/confirmacoes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_URL}/usuarios/lista-basica`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        let confirmacoes = [];
        let usuarios = [];
        
        if (resConfirmacoes.ok) {
            const dataConfirmacoes = await resConfirmacoes.json();
            confirmacoes = dataConfirmacoes.confirmacoes || [];
        }
        
        if (resUsuarios.ok) {
            const dataUsuarios = await resUsuarios.json();
            usuarios = dataUsuarios.usuarios || [];
        }
        
        const modal = document.createElement('div');
        modal.id = 'modalGerenciarConfirmacoes';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 11000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; max-width: 700px; width: 100%; max-height: 90vh; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative; display: flex; flex-direction: column; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; border-radius: 16px 16px 0 0;">
                    <h3 style="margin: 0; font-size: 20px; font-weight: bold;">⚙️ Gerenciar Confirmações</h3>
                </div>
                <div style="padding: 25px; overflow-y: auto; flex: 1;">
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #333;">Adicionar Confirmação:</h4>
                        <div style="margin-bottom: 10px; position: relative;">
                            <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #666; font-weight: bold;">Pesquisar usuário (nome ou ID):</label>
                            <input type="text" id="pesquisaUsuario" placeholder="Digite nome ou ID do usuário..." style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; margin-bottom: 10px;">
                            <div id="resultadosPesquisa" style="position: absolute; top: 100%; left: 0; z-index: 10001; max-height: 250px; overflow-y: auto; border: 2px solid #667eea; border-radius: 8px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: none; width: 100%; margin-top: 5px;">
                                <!-- Resultados da pesquisa aparecerão aqui -->
                            </div>
                            <input type="hidden" id="usuarioAdicionar" value="">
                            <div id="usuarioSelecionado" style="display: none; padding: 10px; background: #e8f5e9; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #28a745;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: bold; color: #2e7d32;" id="nomeUsuarioSelecionado"></span>
                                    <button onclick="limparUsuarioSelecionado()" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer;">✕ Remover</button>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: flex-end;">
                            <div style="width: 150px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #666; font-weight: bold;">Status:</label>
                                <select id="statusAdicionar" style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 13px;">
                                    <option value="presente">✓ Presente</option>
                                    <option value="ausente">✗ Ausente</option>
                                </select>
                            </div>
                            <button onclick="adicionarConfirmacao(${programacaoId})" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; white-space: nowrap;">
                                ➕ Adicionar
                            </button>
                        </div>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #333;">Confirmações Existentes:</h4>
                        <div style="display: grid; gap: 8px; max-height: 400px; overflow-y: auto;">
                            ${confirmacoes.map(conf => `
                                <div style="padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid ${conf.status === 'presente' ? '#28a745' : '#dc3545'}; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <strong>${conf.nome_completo || conf.nome || 'Usuário'}</strong>
                                        <span style="margin-left: 10px; padding: 2px 8px; background: ${conf.status === 'presente' ? '#28a745' : '#dc3545'}; color: white; border-radius: 12px; font-size: 11px;">
                                            ${conf.status === 'presente' ? '✓ Presente' : '✗ Ausente'}
                                        </span>
                                    </div>
                                    <button onclick="removerConfirmacao(${programacaoId}, ${conf.usuario_id})" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer;">
                                        🗑️ Remover
                                    </button>
                                </div>
                            `).join('')}
                            ${confirmacoes.length === 0 ? '<p style="text-align: center; color: #666; padding: 20px;">Nenhuma confirmação</p>' : ''}
                        </div>
                    </div>
                </div>
                <div style="padding: 20px; border-top: 1px solid #e0e0e0;">
                    <button onclick="document.getElementById('modalGerenciarConfirmacoes').remove()" class="btn btn-secondary" style="width: 100%; padding: 12px;">
                        Fechar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Configurar pesquisa de usuários
        const pesquisaUsuario = document.getElementById('pesquisaUsuario');
        const resultadosPesquisa = document.getElementById('resultadosPesquisa');
        const usuarioAdicionar = document.getElementById('usuarioAdicionar');
        const usuarioSelecionado = document.getElementById('usuarioSelecionado');
        const nomeUsuarioSelecionado = document.getElementById('nomeUsuarioSelecionado');
        
        // Armazenar lista de usuários globalmente para este modal
        window.usuariosListaGerenciar = usuarios;
        
        if (pesquisaUsuario) {
            pesquisaUsuario.addEventListener('input', (e) => {
                const termo = e.target.value.trim().toLowerCase();
                
                if (termo.length === 0) {
                    resultadosPesquisa.style.display = 'none';
                    return;
                }
                
                // Filtrar usuários por nome ou ID
                const resultados = usuarios.filter(u => {
                    const nomeCompleto = (u.nome_completo || '').toLowerCase();
                    const nome = (u.nome || '').toLowerCase();
                    const id = String(u.id);
                    return nomeCompleto.includes(termo) || nome.includes(termo) || id.includes(termo);
                });
                
                if (resultados.length === 0) {
                    resultadosPesquisa.innerHTML = '<div style="padding: 15px; text-align: center; color: #666; font-size: 13px;">Nenhum usuário encontrado</div>';
                    resultadosPesquisa.style.display = 'block';
                } else {
                    resultadosPesquisa.innerHTML = resultados.map(u => `
                        <div onclick="selecionarUsuarioGerenciar(${u.id}, '${(u.nome_completo || u.nome || 'Usuário').replace(/'/g, "\\'")}')" 
                             style="padding: 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; transition: background 0.2s;"
                             onmouseover="this.style.background='#e3f2fd'; this.style.borderLeft='3px solid #667eea'" 
                             onmouseout="this.style.background='white'; this.style.borderLeft='none'">
                            <div style="font-weight: bold; color: #333; font-size: 14px;">${u.nome_completo || u.nome || 'Usuário'}</div>
                            <div style="font-size: 12px; color: #666; margin-top: 3px;">
                                <span style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">ID: ${u.id}</span>
                            </div>
                        </div>
                    `).join('');
                    resultadosPesquisa.style.display = 'block';
                }
            });
            
            // Fechar resultados ao clicar fora
            document.addEventListener('click', (e) => {
                if (!pesquisaUsuario.contains(e.target) && !resultadosPesquisa.contains(e.target)) {
                    resultadosPesquisa.style.display = 'none';
                }
            });
        }
    } catch (error) {
        console.error('Erro ao abrir modal de gerenciar confirmações:', error);
        mostrarMensagem('Erro ao carregar dados', 'error');
    }
};

// Selecionar usuário na pesquisa
window.selecionarUsuarioGerenciar = function(usuarioId, nomeUsuario) {
    const usuarioAdicionar = document.getElementById('usuarioAdicionar');
    const pesquisaUsuario = document.getElementById('pesquisaUsuario');
    const resultadosPesquisa = document.getElementById('resultadosPesquisa');
    const usuarioSelecionado = document.getElementById('usuarioSelecionado');
    const nomeUsuarioSelecionado = document.getElementById('nomeUsuarioSelecionado');
    
    if (usuarioAdicionar) usuarioAdicionar.value = usuarioId;
    if (nomeUsuarioSelecionado) nomeUsuarioSelecionado.textContent = nomeUsuario;
    if (usuarioSelecionado) usuarioSelecionado.style.display = 'block';
    if (pesquisaUsuario) pesquisaUsuario.value = '';
    if (resultadosPesquisa) resultadosPesquisa.style.display = 'none';
};

// Limpar seleção de usuário
window.limparUsuarioSelecionado = function() {
    const usuarioAdicionar = document.getElementById('usuarioAdicionar');
    const usuarioSelecionado = document.getElementById('usuarioSelecionado');
    const pesquisaUsuario = document.getElementById('pesquisaUsuario');
    
    if (usuarioAdicionar) usuarioAdicionar.value = '';
    if (usuarioSelecionado) usuarioSelecionado.style.display = 'none';
    if (pesquisaUsuario) pesquisaUsuario.value = '';
};

// Mostrar conteúdo completo do anexo (buscar do backend)
window.mostrarConteudoCompletoAnexo = async function(programacaoId, anexoId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarMensagem('Erro ao carregar conteúdo', 'error');
            return;
        }
        
        // Buscar anexos para obter o conteúdo completo
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/anexos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            mostrarMensagem('Erro ao carregar conteúdo', 'error');
            return;
        }
        
        const data = await response.json();
        const anexo = data.anexos?.find(a => a.id === anexoId);
        
        if (!anexo || !anexo.conteudo) {
            mostrarMensagem('Conteúdo não encontrado', 'error');
            return;
        }
        
        const conteudo = anexo.conteudo;
        
        // Criar modal
        const modal = document.createElement('div');
        modal.id = 'modalConteudoCompleto';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 11000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        
        // Escapar HTML para segurança
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        const tituloAnexo = anexo.titulo || 'Conteúdo';
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; max-width: 900px; width: 100%; max-height: 90vh; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative; display: flex; flex-direction: column; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%); padding: 24px; color: white; border-radius: 16px 16px 0 0;">
                    <h3 style="margin: 0; font-size: 22px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; letter-spacing: -0.3px;">
                        📖 ${escapeHtml(tituloAnexo)}
                    </h3>
                </div>
                <div style="padding: 30px; overflow-y: auto; flex: 1; background: #fafafa;">
                    <div style="background: white; padding: 25px; border-radius: 12px; border: 1px solid #e8e8e8; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                        <div style="font-size: 13px; color: #666; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0;">
                            <span style="font-weight: 500;">Total de caracteres: <strong style="color: #9c27b0;">${conteudo.length}</strong></span>
                            ${anexo.tipo === 'nota' ? '<span style="background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500;">📝 Nota</span>' : ''}
                        </div>
                        <div style="background: #fafafa; padding: 30px; border-radius: 8px; font-size: 15px; color: #2c3e50; white-space: pre-wrap; word-wrap: break-word; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.8; max-height: 60vh; overflow-y: auto; border: 1px solid #e8e8e8; letter-spacing: 0.2px;">
                            ${escapeHtml(conteudo)}
                        </div>
                    </div>
                </div>
                <div style="padding: 20px; border-top: 1px solid #e0e0e0; background: #fafafa;">
                    <button onclick="document.getElementById('modalConteudoCompleto').remove()" class="btn btn-secondary" style="width: 100%; padding: 14px; background: #6c757d; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.2s;"
                            onmouseover="this.style.background='#5a6268'"
                            onmouseout="this.style.background='#6c757d'">
                        Fechar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Erro ao mostrar conteúdo completo:', error);
        mostrarMensagem('Erro ao carregar conteúdo', 'error');
    }
};

// Visualizador de fotos
window.abrirVisualizadorFoto = async function(programacaoId, anexoId, tituloFoto) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarMensagem('Erro ao carregar foto', 'error');
            return;
        }
        
        // Buscar todos os anexos para navegação entre fotos
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/anexos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            mostrarMensagem('Erro ao carregar foto', 'error');
            return;
        }
        
        const data = await response.json();
        // Filtrar anexos que são imagens ou PDFs
        const todasFotos = data.anexos?.filter(a => {
            if (a.tipo === 'foto') return true;
            if (a.tipo === 'arquivo' && a.arquivo_nome) {
                const ext = a.arquivo_nome.split('.').pop().toLowerCase();
                const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'];
                return imageExts.includes(ext) || ext === 'pdf';
            }
            return false;
        }) || [];
        const fotoAtualIndex = todasFotos.findIndex(f => f.id === anexoId);
        const fotoAtual = todasFotos[fotoAtualIndex];
        
        if (!fotoAtual) {
            mostrarMensagem('Arquivo não encontrado', 'error');
            return;
        }
        
        // Determinar se é PDF ou imagem
        const arquivoNome = fotoAtual.arquivo_nome || '';
        const extensao = arquivoNome.split('.').pop().toLowerCase();
        const isPdf = extensao === 'pdf';
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'].includes(extensao);
        
        const arquivoUrl = `${API_URL}/programacoes/${programacaoId}/anexos/${anexoId}/arquivo`;
        
        // Criar modal visualizador
        const modal = document.createElement('div');
        modal.id = 'modalVisualizadorFoto';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 12000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;';
        modal.onclick = (e) => {
            if (e.target === modal || e.target.classList.contains('fechar-visualizador')) {
                modal.remove();
            }
        };
        
        // Função para navegar entre fotos
        const navegarFoto = (direcao) => {
            if (todasFotos.length <= 1) return;
            const novoIndex = direcao === 'prev' 
                ? (fotoAtualIndex - 1 + todasFotos.length) % todasFotos.length
                : (fotoAtualIndex + 1) % todasFotos.length;
            const novaFoto = todasFotos[novoIndex];
            modal.remove();
            abrirVisualizadorFoto(programacaoId, novaFoto.id, novaFoto.titulo || novaFoto.arquivo_nome || 'Foto');
        };
        
        // Escapar HTML para segurança
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        modal.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; max-width: 1400px;">
                <!-- Header -->
                <div style="position: absolute; top: 0; left: 0; right: 0; padding: 20px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%); z-index: 10;">
                    <h3 style="color: white; font-size: 20px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        ${isPdf ? '📄' : isImage ? '📷' : '📎'} ${escapeHtml(tituloFoto)}
                    </h3>
                    <div style="display: flex; gap: 10px;">
                        <span style="color: white; font-size: 14px; background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 20px; font-weight: 500;">
                            ${fotoAtualIndex + 1} / ${todasFotos.length}
                        </span>
                        <button onclick="document.getElementById('modalVisualizadorFoto').remove()" 
                                class="fechar-visualizador"
                                style="padding: 8px 16px; background: rgba(255,255,255,0.2); color: white; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px);"
                                onmouseover="this.style.background='rgba(255,255,255,0.3)'; this.style.borderColor='rgba(255,255,255,0.5)'"
                                onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.borderColor='rgba(255,255,255,0.3)'">
                            ✕ Fechar
                        </button>
                    </div>
                </div>
                
                <!-- Botões de navegação (se houver múltiplas fotos) -->
                ${todasFotos.length > 1 ? `
                    <button onclick="navegarFotoVisualizador('prev')" 
                            id="btnPrevFoto"
                            style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); padding: 15px 20px; background: rgba(255,255,255,0.2); color: white; border: 2px solid rgba(255,255,255,0.3); border-radius: 12px; font-size: 24px; font-weight: bold; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px); z-index: 10;"
                            onmouseover="this.style.background='rgba(255,255,255,0.3)'; this.style.transform='translateY(-50%) scale(1.1)'"
                            onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='translateY(-50%) scale(1)'">
                        ‹
                    </button>
                    <button onclick="navegarFotoVisualizador('next')" 
                            id="btnNextFoto"
                            style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); padding: 15px 20px; background: rgba(255,255,255,0.2); color: white; border: 2px solid rgba(255,255,255,0.3); border-radius: 12px; font-size: 24px; font-weight: bold; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px); z-index: 10;"
                            onmouseover="this.style.background='rgba(255,255,255,0.3)'; this.style.transform='translateY(-50%) scale(1.1)'"
                            onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='translateY(-50%) scale(1)'">
                        ›
                    </button>
                ` : ''}
                
                <!-- Área de visualização (imagem ou PDF) -->
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; padding: 80px 20px 100px; overflow: auto;">
                    ${isPdf ? `
                        <div id="pdfVisualizadorContainer" style="width: 100%; height: 100%; min-height: 600px; display: flex; align-items: center; justify-content: center;">
                            <div style="padding: 40px; text-align: center; color: white;">
                                <p style="font-size: 18px;">Carregando PDF...</p>
                            </div>
                        </div>
                    ` : isImage ? `
                        <div id="fotoVisualizadorContainer" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                            <div style="padding: 40px; text-align: center; color: white;">
                                <p style="font-size: 18px;">Carregando imagem...</p>
                            </div>
                        </div>
                    ` : `
                        <div style="padding: 40px; text-align: center; color: white;">
                            <p style="font-size: 18px; margin-bottom: 20px;">Formato não suportado para visualização</p>
                            <a href="${arquivoUrl}?download=true" 
                               download="${arquivoNome}"
                               style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-block;">
                                📥 Baixar Arquivo
                            </a>
                        </div>
                    `}
                </div>
                
                <!-- Footer com botões de ação -->
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 20px; display: flex; justify-content: center; gap: 15px; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%); z-index: 10;">
                    ${isImage && !isPdf ? `
                        <button onclick="toggleZoomFoto()" 
                                style="padding: 12px 20px; background: rgba(255,255,255,0.2); color: white; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px);"
                                onmouseover="this.style.background='rgba(255,255,255,0.3)'; this.style.borderColor='rgba(255,255,255,0.5)'"
                                onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.borderColor='rgba(255,255,255,0.3)'">
                            🔍 Zoom
                        </button>
                    ` : ''}
                    <a href="${arquivoUrl}?download=true" 
                       download="${fotoAtual.arquivo_nome || 'arquivo'}"
                       onclick="event.stopPropagation()"
                       style="padding: 12px 20px; background: #28a745; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s; box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);"
                       onmouseover="this.style.background='#218838'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(40, 167, 69, 0.4)'"
                       onmouseout="this.style.background='#28a745'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 8px rgba(40, 167, 69, 0.3)'">
                        📥 Baixar ${isPdf ? 'PDF' : isImage ? 'Imagem' : 'Arquivo'}
                    </a>
                    ${fotoAtual.conteudo ? `
                        <button onclick="mostrarInfoFoto(${programacaoId}, ${anexoId})" 
                                style="padding: 12px 20px; background: rgba(156, 39, 176, 0.8); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px);"
                                onmouseover="this.style.background='rgba(123, 31, 162, 0.9)'; this.style.transform='translateY(-2px)'"
                                onmouseout="this.style.background='rgba(156, 39, 176, 0.8)'; this.style.transform='translateY(0)'">
                            ℹ️ Informações
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Carregar imagem ou PDF após renderizar
        if (isImage) {
            setTimeout(() => {
                carregarImagemVisualizador(programacaoId, anexoId, 'fotoVisualizadorContainer', tituloFoto);
            }, 100);
        } else if (isPdf) {
            setTimeout(() => {
                carregarPdfVisualizador(programacaoId, anexoId, 'pdfVisualizadorContainer');
            }, 100);
        }
        
        // Armazenar dados para navegação
        window.fotoVisualizadorData = {
            programacaoId,
            todasFotos,
            fotoAtualIndex
        };
        
        // Adicionar eventos de teclado
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleKeyDown);
            } else if (e.key === 'ArrowLeft' && todasFotos.length > 1) {
                navegarFoto('prev');
            } else if (e.key === 'ArrowRight' && todasFotos.length > 1) {
                navegarFoto('next');
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        
        // Limpar evento ao fechar
        const observer = new MutationObserver((mutations) => {
            if (!document.getElementById('modalVisualizadorFoto')) {
                document.removeEventListener('keydown', handleKeyDown);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true });
        
    } catch (error) {
        console.error('Erro ao abrir visualizador de foto:', error);
        mostrarMensagem('Erro ao carregar foto', 'error');
    }
};

// Navegar entre fotos no visualizador
window.navegarFotoVisualizador = function(direcao) {
    const data = window.fotoVisualizadorData;
    if (!data || data.todasFotos.length <= 1) return;
    
    const novoIndex = direcao === 'prev' 
        ? (data.fotoAtualIndex - 1 + data.todasFotos.length) % data.todasFotos.length
        : (data.fotoAtualIndex + 1) % data.todasFotos.length;
    const novaFoto = data.todasFotos[novoIndex];
    
    const modal = document.getElementById('modalVisualizadorFoto');
    if (modal) modal.remove();
    
    abrirVisualizadorFoto(data.programacaoId, novaFoto.id, novaFoto.titulo || novaFoto.arquivo_nome || 'Foto');
};

// Toggle zoom da foto
window.toggleZoomFoto = function() {
    const img = document.getElementById('fotoVisualizador');
    if (!img) return;
    
    if (img.style.transform === 'scale(2)') {
        img.style.transform = 'scale(1)';
        img.style.cursor = 'zoom-in';
    } else {
        img.style.transform = 'scale(2)';
        img.style.cursor = 'zoom-out';
    }
};

// Mostrar informações da foto
window.mostrarInfoFoto = async function(programacaoId, anexoId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarMensagem('Erro ao carregar informações', 'error');
            return;
        }
        
        // Buscar anexo para obter o conteúdo
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/anexos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            mostrarMensagem('Erro ao carregar informações', 'error');
            return;
        }
        
        const data = await response.json();
        const anexo = data.anexos?.find(a => a.id === anexoId);
        
        if (!anexo || !anexo.conteudo) {
            mostrarMensagem('Informações não encontradas', 'error');
            return;
        }
        
        const conteudo = anexo.conteudo;
        
        const modal = document.createElement('div');
        modal.id = 'modalInfoFoto';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 13000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; max-width: 600px; width: 100%; max-height: 80vh; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative; display: flex; flex-direction: column; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%); padding: 20px; color: white; border-radius: 16px 16px 0 0;">
                    <h3 style="margin: 0; font-size: 20px; font-weight: 600;">ℹ️ Informações da Foto</h3>
                </div>
                <div style="padding: 25px; overflow-y: auto; flex: 1;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; font-size: 14px; color: #2c3e50; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.8;">
                        ${escapeHtml(conteudo)}
                    </div>
                </div>
                <div style="padding: 20px; border-top: 1px solid #e0e0e0;">
                    <button onclick="document.getElementById('modalInfoFoto').remove()" class="btn btn-secondary" style="width: 100%; padding: 12px;">
                        Fechar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Erro ao mostrar informações da foto:', error);
        mostrarMensagem('Erro ao carregar informações', 'error');
    }
};

// Carregar imagem com autenticação
window.carregarImagemAutenticada = async function(programacaoId, anexoId, containerId, titulo) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = '<div style="padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center; color: #666;"><p>Erro: Não autenticado</p></div>';
            return;
        }
        
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/anexos/${anexoId}/arquivo`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar imagem');
        }
        
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        container.innerHTML = `
            <img src="${imageUrl}" 
                 alt="${escapeHtml(titulo)}"
                 style="max-width: 100%; max-height: 200px; border-radius: 8px; border: 2px solid #e0e0e0; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                 onclick="abrirVisualizadorFoto(${programacaoId}, ${anexoId}, '${titulo.replace(/'/g, "\\'")}')"
                 onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
                 onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'"
                 loading="lazy">
        `;
    } catch (error) {
        console.error('Erro ao carregar imagem:', error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center; color: #666;">
                    <p>Erro ao carregar imagem</p>
                    <button onclick="abrirVisualizadorFoto(${programacaoId}, ${anexoId}, '${titulo.replace(/'/g, "\\'")}')" 
                            style="padding: 8px 14px; background: #9c27b0; color: white; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; margin-top: 10px;">
                        Tentar Visualizar
                    </button>
                </div>
            `;
        }
    }
};

// Carregar imagem no visualizador com autenticação
window.carregarImagemVisualizador = async function(programacaoId, anexoId, containerId, titulo) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: white;"><p style="font-size: 18px;">Erro: Não autenticado</p></div>';
            return;
        }
        
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/anexos/${anexoId}/arquivo`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar imagem');
        }
        
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        container.innerHTML = `
            <img id="fotoVisualizador" 
                 src="${imageUrl}" 
                 alt="${escapeHtml(titulo)}"
                 style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); cursor: zoom-in; transition: transform 0.3s;"
                 onclick="toggleZoomFoto()">
        `;
    } catch (error) {
        console.error('Erro ao carregar imagem no visualizador:', error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: white;">
                    <p style="font-size: 18px;">Erro ao carregar imagem</p>
                    <button onclick="document.getElementById('modalVisualizadorFoto').remove()" 
                            style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin-top: 20px;">
                        Fechar
                    </button>
                </div>
            `;
        }
    }
};

// Carregar PDF no visualizador com autenticação
window.carregarPdfVisualizador = async function(programacaoId, anexoId, containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: white;"><p style="font-size: 18px;">Erro: Não autenticado</p></div>';
            return;
        }
        
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/anexos/${anexoId}/arquivo`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar PDF');
        }
        
        const blob = await response.blob();
        const pdfUrl = URL.createObjectURL(blob);
        
        container.innerHTML = `
            <iframe id="arquivoVisualizador" 
                    src="${pdfUrl}" 
                    style="width: 100%; height: 100%; min-height: 600px; border: none; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); background: white;"
                    type="application/pdf">
            </iframe>
        `;
    } catch (error) {
        console.error('Erro ao carregar PDF no visualizador:', error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: white;">
                    <p style="font-size: 18px;">Erro ao carregar PDF</p>
                    <button onclick="document.getElementById('modalVisualizadorFoto').remove()" 
                            style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; margin-top: 20px;">
                        Fechar
                    </button>
                </div>
            `;
        }
    }
};

// Adicionar confirmação (admin/criador)
window.adicionarConfirmacao = async function(programacaoId) {
    const usuarioId = document.getElementById('usuarioAdicionar')?.value;
    const status = document.getElementById('statusAdicionar')?.value;
    
    if (!usuarioId || usuarioId === '') {
        mostrarMensagem('Por favor, pesquise e selecione um usuário', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/confirmacoes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario_id: parseInt(usuarioId), status })
        });
        
        if (response.ok) {
            mostrarMensagem('Confirmação adicionada com sucesso!', 'success');
            
            // Limpar campos
            limparUsuarioSelecionado();
            const pesquisaUsuario = document.getElementById('pesquisaUsuario');
            if (pesquisaUsuario) pesquisaUsuario.value = '';
            
            // Recarregar modal de gerenciar confirmações
            const modalGerenciar = document.getElementById('modalGerenciarConfirmacoes');
            if (modalGerenciar) {
                const progId = programacaoId;
                modalGerenciar.remove();
                setTimeout(() => {
                    abrirModalGerenciarConfirmacoes(progId);
                }, 300);
            }
            
            // Recarregar modal de detalhes se estiver aberto
            const modalDetalhes = document.getElementById('modalDetalhesProgramacao');
            if (modalDetalhes) {
                const progId = programacaoId;
                modalDetalhes.remove();
                setTimeout(() => {
                    mostrarDetalhesProgramacao(progId);
                }, 300);
            }
        } else {
            const data = await response.json();
            mostrarMensagem(data.erro || 'Erro ao adicionar confirmação', 'error');
        }
    } catch (error) {
        console.error('Erro ao adicionar confirmação:', error);
        mostrarMensagem('Erro ao adicionar confirmação', 'error');
    }
};

// Remover confirmação (admin/criador)
window.removerConfirmacao = async function(programacaoId, usuarioId) {
    if (!confirm('Tem certeza que deseja remover esta confirmação?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/programacoes/${programacaoId}/confirmacoes/${usuarioId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            mostrarMensagem('Confirmação removida com sucesso!', 'success');
            const modal = document.getElementById('modalGerenciarConfirmacoes');
            if (modal) modal.remove();
            
            // Recarregar modal de detalhes
            const modalDetalhes = document.getElementById('modalDetalhesProgramacao');
            if (modalDetalhes) {
                const progId = programacaoId;
                modalDetalhes.remove();
                setTimeout(() => {
                    mostrarDetalhesProgramacao(progId);
                }, 300);
            }
        } else {
            const data = await response.json();
            mostrarMensagem(data.erro || 'Erro ao remover confirmação', 'error');
        }
    } catch (error) {
        console.error('Erro ao remover confirmação:', error);
        mostrarMensagem('Erro ao remover confirmação', 'error');
    }
};

// Carregar aniversariantes
async function carregarAniversariantes() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const mes = String(mesAtualCalendario + 1);
        
        const response = await fetch(`${API_URL}/aniversariantes?mes=${mes}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            aniversariantesMes = data.aniversariantes || [];
            exibirAniversariantes();
        }
    } catch (error) {
        console.error('Erro ao carregar aniversariantes:', error);
    }
}

// Exibir aniversariantes
function exibirAniversariantes() {
    const listaAniversariantes = document.getElementById('listaAniversariantes');
    if (!listaAniversariantes) return;
    
    if (aniversariantesMes.length === 0) {
        listaAniversariantes.innerHTML = '<p style="color: #666;">Nenhum aniversariante neste mês.</p>';
        return;
    }
    
    listaAniversariantes.innerHTML = aniversariantesMes.map(aniv => {
        const dataNasc = new Date(aniv.data_nascimento);
        const dia = dataNasc.getDate();
        const mesNome = dataNasc.toLocaleDateString('pt-BR', { month: 'long' });
        
        return `
            <div style="padding: 8px; margin: 5px 0; background: white; border-radius: 5px;">
                <strong>${aniv.nome || aniv.nome_completo || 'Aniversariante'}</strong> - 
                ${dia} de ${mesNome}
                ${aniv.telefone ? ` | 📞 ${aniv.telefone}` : ''}
            </div>
        `;
    }).join('');
}

// Exibir aniversariantes na aba de Programações Passadas
function exibirAniversariantesPassadas() {
    const listaAniversariantesPassadas = document.getElementById('listaAniversariantesPassadas');
    if (!listaAniversariantesPassadas) return;
    
    if (aniversariantesMes.length === 0) {
        listaAniversariantesPassadas.innerHTML = '<p style="color: #666; padding: 10px; background: white; border-radius: 5px;">Nenhum aniversariante neste mês.</p>';
        return;
    }
    
    listaAniversariantesPassadas.innerHTML = aniversariantesMes.map(aniv => {
        const dataNasc = new Date(aniv.data_nascimento);
        const dia = dataNasc.getDate();
        const mesNome = dataNasc.toLocaleDateString('pt-BR', { month: 'long' });
        
        return `
            <div style="padding: 10px; margin: 8px 0; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <strong style="color: #856404;">${aniv.nome || aniv.nome_completo || 'Aniversariante'}</strong> - 
                <span style="color: #666;">${dia} de ${mesNome}</span>
                ${aniv.telefone ? ` | <span style="color: #666;">📞 ${aniv.telefone}</span>` : ''}
            </div>
        `;
    }).join('');
}

// Verificar conflitos antes de salvar programação
// Verifica APENAS por data, independente de igreja, hora, título, etc.
async function verificarConflitoProgramacao(data_evento) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        const url = `${API_URL}/programacoes/verificar-conflito?data_evento=${encodeURIComponent(data_evento)}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.programacoes || [];
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao verificar conflito:', error);
        return null;
    }
}

// Mostrar modal de conflito de programação
function mostrarModalConflito(programacoesExistentes, data_evento, callbackContinuar) {
    // Formatar data para exibição
    const partesData = data_evento.split('-');
    const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : data_evento;
    
    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'modalConflitoProgramacao';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px;';
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; max-width: 600px; width: 100%; max-height: 90vh; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative; overflow: hidden;">
            <!-- Cabeçalho -->
            <div style="background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); padding: 20px; color: white; position: relative;">
                <h3 style="margin: 0; font-size: 20px; font-weight: bold; display: flex; align-items: center;">
                    <span style="font-size: 24px; margin-right: 10px;">⚠️</span> Programação Já Existe
                </h3>
                <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.95;">
                    Já existe ${programacoesExistentes.length} ${programacoesExistentes.length === 1 ? 'programação' : 'programações'} cadastrada${programacoesExistentes.length === 1 ? '' : 's'} para o dia <strong>${dataFormatada}</strong>
                </p>
            </div>
            
            <!-- Conteúdo -->
            <div style="padding: 20px; max-height: calc(90vh - 200px); overflow-y: auto;">
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                        <strong>⚠️ Atenção:</strong> Já existe ${programacoesExistentes.length} ${programacoesExistentes.length === 1 ? 'programação cadastrada' : 'programações cadastradas'} neste dia. Ao continuar, você criará uma nova programação no mesmo dia. Verifique se não há conflito de horários ou recursos.
                    </p>
                </div>
                
                <h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px; font-weight: bold;">
                    📋 Programações Existentes:
                </h4>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${programacoesExistentes.map(prog => {
                        const horaExibicao = prog.hora_evento || 'Não informado';
                        const localExibicao = prog.igreja_nome || prog.local_evento || 'Não informado';
                        return `
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; border-left: 4px solid #667eea; border: 1px solid #e0e0e0;">
                                <div style="display: flex; align-items: start; gap: 10px; margin-bottom: 8px;">
                                    ${prog.codigo ? `<span style="background: #667eea; color: white; padding: 4px 8px; border-radius: 5px; font-size: 11px; font-weight: bold; font-family: monospace;">${prog.codigo}</span>` : ''}
                                    <h5 style="margin: 0; color: #667eea; font-size: 16px; font-weight: bold; flex: 1;">${prog.titulo}</h5>
                                </div>
                                ${prog.descricao ? `<p style="margin: 5px 0; color: #666; font-size: 13px; line-height: 1.4;">${prog.descricao}</p>` : ''}
                                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 10px; font-size: 13px; color: #666;">
                                    <span>🕐 <strong>Hora:</strong> ${horaExibicao}</span>
                                    <span>📍 <strong>Local:</strong> ${localExibicao}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- Botões -->
            <div style="padding: 20px; border-top: 1px solid #e0e0e0; background: #f8f9fa; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="btnCancelarConflito" class="btn btn-secondary" style="padding: 12px 24px; font-size: 14px; border-radius: 8px; cursor: pointer; border: none; background: #6c757d; color: white;">
                    ❌ Cancelar
                </button>
                <button id="btnContinuarConflito" class="btn btn-primary" style="padding: 12px 24px; font-size: 14px; border-radius: 8px; cursor: pointer; border: none; background: #667eea; color: white; font-weight: bold;">
                    ✅ Continuar Mesmo Assim
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fechar ao clicar fora
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    // Botão cancelar
    document.getElementById('btnCancelarConflito').onclick = () => {
        modal.remove();
    };
    
    // Botão continuar
    document.getElementById('btnContinuarConflito').onclick = () => {
        modal.remove();
        if (callbackContinuar) {
            callbackContinuar();
        }
    };
}

// Salvar programação ou solicitação
async function salvarProgramacao() {
    const titulo = document.getElementById('programacaoTitulo')?.value.trim();
    const descricao = document.getElementById('programacaoDescricao')?.value.trim();
        // Coletar data do formulário
        // Input type="date" retorna no formato YYYY-MM-DD (sem hora)
        // Usar diretamente sem conversões para evitar problemas de fuso horário
        const data_evento = document.getElementById('programacaoData')?.value;
        const data_fim_evento = document.getElementById('programacaoDataFim')?.value;
        
        // Validar que a data foi preenchida
        if (!data_evento) {
            mostrarMensagem('Data do evento é obrigatória', 'error');
            return;
        }
        
        // Log para debug
        console.log('[Salvar Programação] Data coletada do formulário:', { data_evento, data_fim_evento });
    const hora_evento = document.getElementById('programacaoHora')?.value;
    const igreja_id = document.getElementById('programacaoLocal')?.value;
    const local_evento = document.getElementById('programacaoLocalTexto')?.value.trim();
    const observacoes = document.getElementById('programacaoObservacoes')?.value.trim();
    const ativarVinculo = document.getElementById('ativarVinculoMembros')?.checked;
    const ativarHorario = document.getElementById('programacaoHorarioVinculo')?.checked;
    const hora_vinculo = document.getElementById('programacaoHoraVinculo')?.value;
    
    if (!titulo || !data_evento) {
        mostrarMensagem('Título e data são obrigatórios', 'error');
        return;
    }
    
    // Verificar conflitos antes de salvar (verifica APENAS por data)
    const programacoesExistentes = await verificarConflitoProgramacao(data_evento);
    
    if (programacoesExistentes && programacoesExistentes.length > 0) {
        // Mostrar modal de conflito e aguardar decisão do usuário
        mostrarModalConflito(programacoesExistentes, data_evento, () => {
            // Callback: continuar com o salvamento
            processarSalvamentoProgramacao(titulo, descricao, data_evento, data_fim_evento, hora_evento, igreja_id, local_evento, observacoes, ativarVinculo, ativarHorario, hora_vinculo);
        });
        return;
    }
    
    // Se não há conflitos, salvar diretamente
    processarSalvamentoProgramacao(titulo, descricao, data_evento, data_fim_evento, hora_evento, igreja_id, local_evento, observacoes, ativarVinculo, ativarHorario, hora_vinculo);
}

// Processar salvamento da programação (separado para reutilizar após confirmação de conflito)
async function processarSalvamentoProgramacao(titulo, descricao, data_evento, data_fim_evento, hora_evento, igreja_id, local_evento, observacoes, ativarVinculo, ativarHorario, hora_vinculo) {
    // Coletar membros vinculados se ativado
    let membros_vinculados = [];
    if (ativarVinculo) {
        const checkboxes = document.querySelectorAll('#listaMembrosVinculo input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            const usuarioId = checkbox.value;
            membros_vinculados.push({
                usuario_id: usuarioId,
                hora_especifica: ativarHorario && hora_vinculo ? hora_vinculo : null
            });
        });
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            mostrarMensagem('Sessão expirada. Faça login novamente.', 'error');
            return;
        }
        
        const bodyData = {
            titulo,
            descricao,
            data_evento,
            data_fim_evento: data_fim_evento || null,
            hora_evento,
            local_evento: igreja_id ? null : local_evento, // Se igreja selecionada, não usar local texto
            igreja_id: igreja_id || null,
            observacoes: observacoes || null,
            membros_vinculados: membros_vinculados.length > 0 ? membros_vinculados : null
        };
        
        const endpoint = currentUserId === 1 ? '/programacoes' : '/solicitacoes-eventos';
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bodyData)
        });
        
        const data = await response.json();
        
                if (response.ok) {
                    mostrarMensagem(data.mensagem || 'Salvo com sucesso!', 'success');
                    const modalCriarProgramacao = document.getElementById('modalCriarProgramacao');
                    if (modalCriarProgramacao) modalCriarProgramacao.style.display = 'none';
                    if (formProgramacaoElement) formProgramacaoElement.reset();
                    const ativarVinculoMembros = document.getElementById('ativarVinculoMembros');
                    const opcoesVinculoMembros = document.getElementById('opcoesVinculoMembros');
                    if (ativarVinculoMembros) ativarVinculoMembros.checked = false;
                    if (opcoesVinculoMembros) opcoesVinculoMembros.style.display = 'none';
                    const programacaoHorarioVinculo = document.getElementById('programacaoHorarioVinculo');
                    const horarioVinculoContainer = document.getElementById('horarioVinculoContainer');
                    if (programacaoHorarioVinculo) programacaoHorarioVinculo.checked = false;
                    if (horarioVinculoContainer) horarioVinculoContainer.style.display = 'none';
                    await carregarProgramacoes();
                    await carregarCalendario();
                    if (currentUserId === 1) {
                        await carregarSolicitacoes();
                    } else {
                        await carregarMinhasSolicitacoes();
                    }
                } else {
                    mostrarMensagem(data.erro || 'Erro ao salvar', 'error');
                }
    } catch (error) {
        console.error('Erro ao salvar programação:', error);
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Deletar programação (admin)
window.deletarProgramacao = async function(id) {
    if (!confirm('Tem certeza que deseja deletar esta programação?')) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`${API_URL}/programacoes/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensagem(data.mensagem || 'Programação deletada com sucesso!', 'success');
            await carregarProgramacoes();
            await carregarCalendario();
        } else {
            mostrarMensagem(data.erro || 'Erro ao deletar', 'error');
        }
    } catch (error) {
        console.error('Erro ao deletar programação:', error);
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Carregar solicitações (admin)
// Carregar solicitações pendentes (APENAS admin - todas as solicitações pendentes)
async function carregarSolicitacoes() {
    if (currentUserId !== 1) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // SEMPRE buscar apenas solicitações pendentes (não aprovadas)
        const response = await fetch(`${API_URL}/solicitacoes-eventos?status=pendente`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Garantir que estamos usando apenas solicitações pendentes
            // Filtrar qualquer item que possa ter status diferente de 'pendente'
            const solicitacoesPendentes = (data.solicitacoes || []).filter(s => {
                return s.status === 'pendente' && !s.codigo; // Solicitações não têm código
            });
            exibirSolicitacoes(solicitacoesPendentes);
        }
    } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
    }
}

// Carregar minhas solicitações (usuários comuns - todas as suas solicitações)
async function carregarMinhasSolicitacoes() {
    if (currentUserId === 1) return; // Admin não usa esta função
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Buscar todas as solicitações do usuário (pendentes, aprovadas, rejeitadas)
        const response = await fetch(`${API_URL}/solicitacoes-eventos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const minhasSolicitacoes = data.solicitacoes || [];
            exibirMinhasSolicitacoes(minhasSolicitacoes);
        }
    } catch (error) {
        console.error('Erro ao carregar minhas solicitações:', error);
    }
}

// Exibir solicitações
function exibirSolicitacoes(solicitacoes) {
    const listaSolicitacoes = document.getElementById('listaSolicitacoes');
    const tabContentSolicitacoes = document.getElementById('tabContentSolicitacoesPendentes');
    const contadorSolicitacoes = document.getElementById('contadorSolicitacoes');
    
    if (!listaSolicitacoes) return;
    
    // Atualizar contador
    if (contadorSolicitacoes) {
        contadorSolicitacoes.textContent = `${solicitacoes.length} ${solicitacoes.length === 1 ? 'solicitação' : 'solicitações'}`;
    }
    
    // Sempre mostrar a aba de solicitações se for admin (mesmo que esteja vazia)
    // A aba só é visível para admin de qualquer forma
    
    if (solicitacoes.length === 0) {
        listaSolicitacoes.innerHTML = '<p style="color: #666; padding: 20px; text-align: center; background: #f8f9fa; border-radius: 8px;">Nenhuma solicitação pendente no momento.</p>';
        return;
    }
    
    listaSolicitacoes.innerHTML = solicitacoes.map(sol => {
        // Formatar data SEM usar new Date() para evitar problemas de fuso horário
        const dataEventoStr = sol.data_evento ? sol.data_evento.split('T')[0].split(' ')[0] : '';
        const partesData = dataEventoStr.split('-');
        const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : dataEventoStr;
        
        let dataFimFormatada = '';
        if (sol.data_fim_evento) {
            const dataFimStr = sol.data_fim_evento.split('T')[0].split(' ')[0];
            const partesDataFim = dataFimStr.split('-');
            dataFimFormatada = partesDataFim.length === 3 ? `${partesDataFim[2]}/${partesDataFim[1]}/${partesDataFim[0]}` : dataFimStr;
        }
        
        const nomeCompleto = sol.solicitado_por_nome_completo || sol.solicitado_por_nome || 'Usuário';
        const nomeExibicao = sol.solicitado_por_nome_completo ? `${sol.solicitado_por_nome_completo} (${sol.solicitado_por_nome || ''})` : (sol.solicitado_por_nome || 'Usuário');
        // Usar nome da igreja se disponível, senão usar local_evento, senão mostrar ID da igreja
        const localExibicao = sol.igreja_nome || (sol.local_evento || (sol.igreja_id ? `Igreja ID: ${sol.igreja_id}` : 'Não informado'));
        
        return `
            <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); padding: 25px; border-radius: 12px; margin-bottom: 20px; border: 2px solid #ffc107; box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3), 0 2px 4px rgba(0,0,0,0.1); position: relative; overflow: hidden;">
                <!-- Barra lateral amarela destacada -->
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: linear-gradient(180deg, #ffc107 0%, #ff9800 100%);"></div>
                
                <!-- Header com título e status -->
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; padding-left: 15px;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 8px 0; color: #667eea; font-size: 22px; font-weight: bold;">${sol.titulo}</h4>
                        ${sol.descricao ? `<p style="margin: 0; color: #666; font-size: 15px; line-height: 1.4;">${sol.descricao}</p>` : ''}
                    </div>
                    <span style="background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(255, 193, 7, 0.4); white-space: nowrap; margin-left: 15px;">⏳ PENDENTE</span>
                </div>
                
                <!-- Informações do Evento -->
                <div style="background: white; padding: 18px; border-radius: 10px; margin: 15px 0; border: 1px solid #e0e0e0; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
                    <h5 style="margin: 0 0 12px 0; color: #667eea; font-size: 16px; font-weight: bold; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 8px;">📅</span> Informações do Evento
                    </h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                        <div style="padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Data de Início</span>
                            <strong style="color: #333; font-size: 14px;">${dataFormatada}</strong>
                        </div>
                        ${dataFimFormatada ? `
                            <div style="padding: 10px; background: #f8f9fa; border-radius: 6px;">
                                <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Data de Fim</span>
                                <strong style="color: #333; font-size: 14px;">${dataFimFormatada}</strong>
                            </div>
                        ` : ''}
                        ${sol.hora_evento ? `
                            <div style="padding: 10px; background: #f8f9fa; border-radius: 6px;">
                                <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Hora</span>
                                <strong style="color: #333; font-size: 14px;">🕐 ${sol.hora_evento}</strong>
                            </div>
                        ` : ''}
                        <div style="padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Local</span>
                            <strong style="color: #333; font-size: 14px;">📍 ${localExibicao}</strong>
                        </div>
                    </div>
                </div>
                
                <!-- Informações do Solicitante -->
                <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 18px; border-radius: 10px; margin: 15px 0; border: 2px solid #2196f3; box-shadow: 0 2px 6px rgba(33, 150, 243, 0.2);">
                    <h5 style="margin: 0 0 12px 0; color: #1976d2; font-size: 16px; font-weight: bold; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 8px;">👤</span> Informações do Solicitante
                    </h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                        <div style="padding: 10px; background: white; border-radius: 6px; border-left: 3px solid #2196f3;">
                            <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Nome Completo</span>
                            <strong style="color: #1976d2; font-size: 14px;">${nomeExibicao}</strong>
                        </div>
                        <div style="padding: 10px; background: white; border-radius: 6px; border-left: 3px solid #2196f3;">
                            <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">ID do Cadastro</span>
                            <strong style="color: #1976d2; font-size: 14px;">#${sol.solicitado_por_id || sol.solicitado_por || 'N/A'}</strong>
                        </div>
                        ${sol.solicitado_por_email ? `
                            <div style="padding: 10px; background: white; border-radius: 6px; border-left: 3px solid #2196f3;">
                                <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Email</span>
                                <strong style="color: #1976d2; font-size: 14px;">${sol.solicitado_por_email}</strong>
                            </div>
                        ` : ''}
                        ${sol.solicitado_por_telefone ? `
                            <div style="padding: 10px; background: white; border-radius: 6px; border-left: 3px solid #2196f3;">
                                <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Telefone</span>
                                <strong style="color: #1976d2; font-size: 14px;">${sol.solicitado_por_telefone}</strong>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${sol.observacoes ? `
                    <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffe082 100%); padding: 18px; border-radius: 10px; margin: 15px 0; border: 2px solid #ffc107; box-shadow: 0 2px 6px rgba(255, 193, 7, 0.2);">
                        <h5 style="margin: 0 0 12px 0; color: #856404; font-size: 16px; font-weight: bold; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">📝</span> Observações do Solicitante
                        </h5>
                        <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                            <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${sol.observacoes}</p>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Botões de Ação -->
                <div style="display: flex; gap: 15px; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                    <button class="btn btn-primary btn-small" onclick="aprovarSolicitacao(${sol.id})" style="flex: 1; padding: 14px; font-size: 15px; font-weight: bold; border-radius: 8px; box-shadow: 0 3px 8px rgba(102, 126, 234, 0.3);">
                        ✅ Aprovar Solicitação
                    </button>
                    <button class="btn btn-danger btn-small" onclick="rejeitarSolicitacao(${sol.id})" style="flex: 1; padding: 14px; font-size: 15px; font-weight: bold; border-radius: 8px; box-shadow: 0 3px 8px rgba(220, 53, 69, 0.3);">
                        ❌ Rejeitar Solicitação
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Aprovar solicitação (admin)
window.aprovarSolicitacao = async function(id) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`${API_URL}/solicitacoes-eventos/${id}/aprovar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({})
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensagem(data.mensagem || 'Solicitação aprovada com sucesso!', 'success');
                    await carregarSolicitacoes();
                    await carregarProgramacoes();
                    await carregarCalendario();
                    // Recarregar minhas solicitações se não for admin
                    if (currentUserId !== 1) {
                        await carregarMinhasSolicitacoes();
                    }
                } else {
                    mostrarMensagem(data.erro || 'Erro ao aprovar', 'error');
                }
    } catch (error) {
        console.error('Erro ao aprovar solicitação:', error);
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Rejeitar solicitação (admin)
window.rejeitarSolicitacao = async function(id) {
    const observacoes = prompt('Motivo da rejeição (opcional):');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`${API_URL}/solicitacoes-eventos/${id}/rejeitar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ observacoes: observacoes || null })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarMensagem(data.mensagem || 'Solicitação rejeitada', 'success');
            await carregarSolicitacoes();
            // Recarregar minhas solicitações se não for admin
            if (currentUserId !== 1) {
                await carregarMinhasSolicitacoes();
            }
        } else {
            mostrarMensagem(data.erro || 'Erro ao rejeitar', 'error');
        }
    } catch (error) {
        console.error('Erro ao rejeitar solicitação:', error);
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Exibir minhas solicitações (usuários comuns)
function exibirMinhasSolicitacoes(solicitacoes) {
    const listaMinhasSolicitacoes = document.getElementById('listaMinhasSolicitacoes');
    const contadorMinhasSolicitacoes = document.getElementById('contadorMinhasSolicitacoes');
    
    if (!listaMinhasSolicitacoes) return;
    
    // Atualizar contador
    if (contadorMinhasSolicitacoes) {
        contadorMinhasSolicitacoes.textContent = `${solicitacoes.length} ${solicitacoes.length === 1 ? 'solicitação' : 'solicitações'}`;
    }
    
    if (solicitacoes.length === 0) {
        listaMinhasSolicitacoes.innerHTML = '<p style="color: #666; padding: 20px; text-align: center; background: #f8f9fa; border-radius: 8px;">Você ainda não criou nenhuma solicitação de programação.</p>';
        return;
    }
    
    // Ordenar: pendentes primeiro, depois aprovadas, depois rejeitadas
    solicitacoes.sort((a, b) => {
        const ordemStatus = { 'pendente': 1, 'aprovado': 2, 'rejeitado': 3 };
        return (ordemStatus[a.status] || 99) - (ordemStatus[b.status] || 99);
    });
    
    listaMinhasSolicitacoes.innerHTML = solicitacoes.map(sol => {
        // Formatar data SEM usar new Date() para evitar problemas de fuso horário
        const dataEventoStr = sol.data_evento ? sol.data_evento.split('T')[0].split(' ')[0] : '';
        const partesData = dataEventoStr.split('-');
        const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : dataEventoStr;
        
        let dataFimFormatada = '';
        if (sol.data_fim_evento) {
            const dataFimStr = sol.data_fim_evento.split('T')[0].split(' ')[0];
            const partesDataFim = dataFimStr.split('-');
            dataFimFormatada = partesDataFim.length === 3 ? `${partesDataFim[2]}/${partesDataFim[1]}/${partesDataFim[0]}` : dataFimStr;
        }
        
        const localExibicao = sol.igreja_nome || (sol.local_evento || (sol.igreja_id ? `Igreja ID: ${sol.igreja_id}` : 'Não informado'));
        
        // Definir cores e ícones baseado no status
        let statusBadge = '';
        let borderColor = '';
        let barraColor = '';
        let statusTexto = '';
        
        if (sol.status === 'pendente') {
            statusBadge = 'background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); color: white;';
            borderColor = '#ffc107';
            barraColor = 'linear-gradient(180deg, #ffc107 0%, #ff9800 100%)';
            statusTexto = '⏳ PENDENTE - Aguardando aprovação do administrador';
        } else if (sol.status === 'aprovado') {
            statusBadge = 'background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white;';
            borderColor = '#4caf50';
            barraColor = 'linear-gradient(180deg, #4caf50 0%, #45a049 100%)';
            statusTexto = '✅ APROVADA - Sua programação foi aprovada e está no calendário!';
        } else if (sol.status === 'rejeitado') {
            statusBadge = 'background: linear-gradient(135deg, #f44336 0%, #da190b 100%); color: white;';
            borderColor = '#f44336';
            barraColor = 'linear-gradient(180deg, #f44336 0%, #da190b 100%)';
            statusTexto = '❌ REJEITADA - Sua solicitação foi rejeitada pelo administrador';
        }
        
        return `
            <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); padding: 25px; border-radius: 12px; margin-bottom: 20px; border: 2px solid ${borderColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.1); position: relative; overflow: hidden;">
                <!-- Barra lateral colorida baseada no status -->
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: ${barraColor};"></div>
                
                <!-- Header com título e status -->
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; padding-left: 15px;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 8px 0; color: #667eea; font-size: 22px; font-weight: bold;">${sol.titulo}</h4>
                        ${sol.descricao ? `<p style="margin: 0; color: #666; font-size: 15px; line-height: 1.4;">${sol.descricao}</p>` : ''}
                    </div>
                    <span style="${statusBadge} padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); white-space: nowrap; margin-left: 15px;">${statusTexto}</span>
                </div>
                
                <!-- Informações do Evento -->
                <div style="background: white; padding: 18px; border-radius: 10px; margin: 15px 0; border: 1px solid #e0e0e0; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
                    <h5 style="margin: 0 0 12px 0; color: #667eea; font-size: 16px; font-weight: bold; display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 8px;">📅</span> Informações do Evento
                    </h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                        <div style="padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Data de Início</span>
                            <strong style="color: #333; font-size: 14px;">${dataFormatada}</strong>
                        </div>
                        ${dataFimFormatada ? `
                            <div style="padding: 10px; background: #f8f9fa; border-radius: 6px;">
                                <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Data de Fim</span>
                                <strong style="color: #333; font-size: 14px;">${dataFimFormatada}</strong>
                            </div>
                        ` : ''}
                        ${sol.hora_evento ? `
                            <div style="padding: 10px; background: #f8f9fa; border-radius: 6px;">
                                <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Hora</span>
                                <strong style="color: #333; font-size: 14px;">🕐 ${sol.hora_evento}</strong>
                            </div>
                        ` : ''}
                        <div style="padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <span style="color: #999; font-size: 12px; display: block; margin-bottom: 4px;">Local</span>
                            <strong style="color: #333; font-size: 14px;">📍 ${localExibicao}</strong>
                        </div>
                    </div>
                </div>
                
                ${sol.observacoes ? `
                    <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffe082 100%); padding: 18px; border-radius: 10px; margin: 15px 0; border: 2px solid #ffc107; box-shadow: 0 2px 6px rgba(255, 193, 7, 0.2);">
                        <h5 style="margin: 0 0 12px 0; color: #856404; font-size: 16px; font-weight: bold; display: flex; align-items: center;">
                            <span style="font-size: 20px; margin-right: 8px;">📝</span> Suas Observações
                        </h5>
                        <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                            <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${sol.observacoes}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Adicionar listener ao botão de logout se existir
if (logoutBtn) {
    logoutBtn.addEventListener('click', fazerLogout);
} else {
    // Se não existir, usar delegação de eventos
    document.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'menuLogout' || e.target.closest('#menuLogout'))) {
            e.preventDefault();
            fazerLogout();
        }
    });
}

// Verificar token e carregar perfil
async function verificarToken(token) {
    try {
        await restaurarSecaoSalva();
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('secaoAtual');
    }
}

// Carregar perfil completo
async function carregarPerfilCompleto() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            fazerLogout();
            return;
        }
        
        // Garantir que formulários de login estejam escondidos
        esconderFormulariosLogin();

        // Adicionar timestamp para evitar cache e garantir dados atualizados do servidor
        const timestamp = new Date().getTime();
        const response = await fetch(`${API_URL}/perfil?t=${timestamp}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            cache: 'no-store' // Forçar busca sem cache - sempre busca dados atualizados
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Dados do perfil recebidos do servidor (oficial):', {
                id: data.usuario.id,
                ocupacao_nome: data.usuario.ocupacao_nome,
                igreja_nome: data.usuario.igreja_nome,
                igreja_id: data.usuario.igreja_id
            });
            
            // Se perfil não está completo, mostrar formulário
            if (!data.usuario.perfil_completo) {
                mostrarFormularioPerfilCompleto(data.usuario, data.relacionamentos || []);
            } else {
                mostrarPerfilCompleto(data);
            }
        } else {
            if (response.status === 401) {
                fazerLogout();
            } else {
                localStorage.removeItem('token');
            }
        }
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        localStorage.removeItem('token');
    }
}

// Mostrar formulário de perfil completo
function mostrarFormularioPerfilCompleto(usuario, relacionamentos = []) {
    esconderFormulariosLogin();
    
    // Esconder TODAS as outras seções primeiro
    if (inicioSection) inicioSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
    if (configSection) configSection.style.display = 'none';
    
    // Garantir que o sidebar esteja visível
    garantirSidebarVisivel();
    
    // Configurar itens do menu baseado no ID do usuário
    configurarItensMenu(usuario.id);
    
    perfilCompletoForm.style.display = 'block';
    pageTitle.textContent = 'Complete seu Perfil';
    
    // Atualizar menu ativo
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    const menuPerfil = document.querySelector('[data-section="perfil"]');
    if (menuPerfil) {
        menuPerfil.classList.add('active');
    }
    
    // Mostrar relacionamentos no formulário
    mostrarRelacionamentos(relacionamentos, usuario.estado_civil);

    // Carregar ocupações e igrejas
    carregarOcupacoesEIgrejasPerfil(usuario.ocupacao_id, usuario.igreja_id);

    // Preencher campos se já tiver dados
    document.getElementById('nomeCompleto').value = usuario.nome_completo || '';
    
    // Aplicar máscara no CPF e tornar readonly se já tiver CPF
    const cpfInput = document.getElementById('cpf');
    if (usuario.cpf) {
        let cpf = usuario.cpf.replace(/\D/g, '');
        cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
        cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
        cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        cpfInput.value = cpf;
        cpfInput.readOnly = true;
        cpfInput.style.backgroundColor = '#f5f5f5';
        cpfInput.style.cursor = 'not-allowed';
    } else {
        cpfInput.readOnly = false;
        cpfInput.style.backgroundColor = 'white';
        cpfInput.style.cursor = 'text';
    }
    
    document.getElementById('endereco').value = usuario.endereco || '';
    
    // Aplicar máscara no CEP
    if (usuario.cep) {
        let cep = usuario.cep.replace(/\D/g, '');
        cep = cep.replace(/(\d{5})(\d)/, '$1-$2');
        document.getElementById('cep').value = cep;
    }
    
    // Aplicar máscara no telefone
    if (usuario.telefone) {
        let telefone = usuario.telefone.replace(/\D/g, '');
        if (telefone.length <= 10) {
            telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
            telefone = telefone.replace(/(\d{4})(\d)/, '$1-$2');
        } else {
            telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
            telefone = telefone.replace(/(\d{5})(\d)/, '$1-$2');
        }
        document.getElementById('telefone').value = telefone;
    }
    
    document.getElementById('estadoCivil').value = usuario.estado_civil || '';

    // Preencher dados de filhos se existirem
    const filhos = relacionamentos.filter(r => r.tipo === 'filho');
    if (filhos.length > 0) {
        document.getElementById('temFilhos').value = 'sim';
        document.getElementById('quantidadeFilhosGroup').style.display = 'block';
        document.getElementById('quantidadeFilhos').value = filhos.length;
        criarCamposFilhos(filhos.length);
        document.getElementById('camposFilhos').style.display = 'block';
        
        // Preencher dados dos filhos
        filhos.forEach((filho, index) => {
            const i = index + 1;
            if (document.getElementById(`filhoNome${i}`)) {
                document.getElementById(`filhoNome${i}`).value = filho.nome_completo || filho.nome || '';
                // Salvar ID se existir (para vincular existente)
                if (filho.relacionado_id) {
                    document.getElementById(`filhoId${i}`).value = filho.relacionado_id;
                }
                if (filho.cpf) {
                    let cpf = filho.cpf.replace(/\D/g, '');
                    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
                    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
                    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    document.getElementById(`filhoCpf${i}`).value = cpf;
                }
                document.getElementById(`filhoEmail${i}`).value = filho.email || '';
                if (filho.telefone) {
                    let telefone = filho.telefone.replace(/\D/g, '');
                    if (telefone.length <= 10) {
                        telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
                        telefone = telefone.replace(/(\d{4})(\d)/, '$1-$2');
                    } else {
                        telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
                        telefone = telefone.replace(/(\d{5})(\d)/, '$1-$2');
                    }
                    document.getElementById(`filhoTelefone${i}`).value = telefone;
                }
            }
        });
    } else {
        document.getElementById('temFilhos').value = '';
        document.getElementById('quantidadeFilhosGroup').style.display = 'none';
        document.getElementById('camposFilhos').style.display = 'none';
    }
}

// Mostrar perfil completo
function mostrarPerfilCompleto(data) {
    const usuario = data.usuario;
    const relacionamentos = data.relacionamentos || [];
    currentUserId = usuario.id;
    
    // Esconder formulários de login/registro
    esconderFormulariosLogin();
    
    // Esconder TODAS as outras seções primeiro
    if (inicioSection) inicioSection.style.display = 'none';
    if (perfilCompletoForm) perfilCompletoForm.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
    if (configSection) configSection.style.display = 'none';
    
    // Garantir que o sidebar esteja visível
    garantirSidebarVisivel();
    
    // Mostrar menu e perfil
    if (sidebarMenu) sidebarMenu.style.display = 'block';
    if (profileSection) profileSection.style.display = 'block';
    const container = document.querySelector('.container');
    if (container) container.classList.add('with-sidebar');
    if (pageTitle) pageTitle.textContent = 'Meu Perfil';

    // Configurar itens do menu baseado no ID do usuário
    configurarItensMenu(usuario.id);

    // Atualizar menu ativo
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector('[data-section="perfil"]').classList.add('active');

    // A ocupação e igreja vêm DIRETAMENTE do cadastro oficial (mesma fonte da administração)
    // Estes dados são extraídos da mesma tabela oficial (igreja_membros)
    console.log('[Frontend] Exibindo perfil com dados oficiais do cadastro (recebidos do servidor):', {
        id: usuario.id,
        ocupacao_id: usuario.ocupacao_id,
        ocupacao_nome: usuario.ocupacao_nome,
        igreja_id: usuario.igreja_id,
        igreja_nome: usuario.igreja_nome,
        igreja_funcao: usuario.igreja_funcao,
        dados_completos: usuario
    });
    
    // Passar ocupacao_nome que vem do backend (do SQL)
    exibirDadosPerfil(usuario, relacionamentos, usuario.ocupacao_nome);
}

// Função auxiliar para buscar ocupação
async function buscarEExibirOcupacao(ocupacaoId) {
    if (!ocupacaoId) return 'Não informado';
    
    try {
        const ocupResponse = await fetch(`${API_URL}/ocupacoes`);
        const ocupData = await ocupResponse.json();
        if (ocupData.ocupacoes) {
            const ocupacao = ocupData.ocupacoes.find(o => o.id === ocupacaoId);
            if (ocupacao) {
                return ocupacao.nome;
            }
        }
    } catch (error) {
        console.error('Erro ao buscar ocupação:', error);
    }
    return 'Não informado';
}

// Função auxiliar para exibir dados do perfil
// Esta função recebe dados diretamente do SQL via backend
function exibirDadosPerfil(usuario, relacionamentos, ocupacaoNome) {
    const userInfo = document.getElementById('userInfo');
    
    // DEBUG: Log dos dados recebidos
    console.log('[Frontend] Dados recebidos para exibir perfil:', {
        id: usuario.id,
        ocupacao_id: usuario.ocupacao_id,
        ocupacao_nome: usuario.ocupacao_nome,
        igreja_id: usuario.igreja_id,
        igreja_nome: usuario.igreja_nome,
        igreja_funcao: usuario.igreja_funcao,
        ocupacaoNome_parametro: ocupacaoNome
    });
    
    // Usar ocupacao_nome do backend (vem diretamente do SQL)
    // Verificar se é string válida (não null, não undefined, não vazio)
    let ocupacaoExibir = 'Não informado';
    if (usuario.ocupacao_nome && typeof usuario.ocupacao_nome === 'string' && usuario.ocupacao_nome.trim() !== '') {
        ocupacaoExibir = usuario.ocupacao_nome;
    } else if (ocupacaoNome && typeof ocupacaoNome === 'string' && ocupacaoNome.trim() !== '') {
        ocupacaoExibir = ocupacaoNome;
    }
    
    // Usar igreja_nome do backend (vem diretamente do SQL via LEFT JOIN)
    // Verificar se é string válida (não null, não undefined, não vazio)
    let igrejaNome = 'Não vinculada';
    if (usuario.igreja_nome && typeof usuario.igreja_nome === 'string' && usuario.igreja_nome.trim() !== '') {
        igrejaNome = usuario.igreja_nome;
    }
    
    const igrejaFuncao = usuario.igreja_funcao ? ` (${usuario.igreja_funcao})` : '';
    
    console.log('[Frontend] Valores que serão exibidos:', {
        ocupacaoExibir,
        igrejaNome,
        igrejaFuncao
    });
    
    userInfo.innerHTML = `
        <h2 style="margin-bottom: 20px; color: #667eea;">Meu Perfil</h2>
        <p style="color: #999; font-size: 12px; margin-bottom: 15px; opacity: 0.6;">
            <strong style="color: #999;">ID de Cadastro:</strong> <span style="color: #bbb;">${usuario.id}</span>
        </p>
        <p><strong>Ocupação:</strong> ${ocupacaoExibir}</p>
        <p><strong>Igreja:</strong> ${igrejaNome}${igrejaFuncao}</p>
        <p><strong>Nome:</strong> ${usuario.nome}</p>
        <p><strong>Nome Completo:</strong> ${usuario.nome_completo || 'Não informado'}</p>
        <p><strong>Email:</strong> ${usuario.email}</p>
        <p><strong>CPF:</strong> ${usuario.cpf || 'Não informado'}</p>
        <p><strong>Telefone:</strong> ${usuario.telefone || 'Não informado'}</p>
        <p><strong>Endereço:</strong> ${usuario.endereco || 'Não informado'}</p>
        <p><strong>CEP:</strong> ${usuario.cep || 'Não informado'}</p>
        <p><strong>Estado Civil:</strong> ${formatarEstadoCivil(usuario.estado_civil) || 'Não informado'}</p>
    `;

    // Não mostrar relacionamentos na visualização do perfil, apenas no formulário de edição
    // mostrarRelacionamentos(relacionamentos, usuario.estado_civil);
    
    // Configurar navegação do menu
    configurarNavegacaoMenu();
}

// Mostrar relacionamentos no formulário de edição
function mostrarRelacionamentos(relacionamentos, estadoCivil) {
    const conjuge = relacionamentos.find(r => r.tipo === 'conjuge');
    const filhos = relacionamentos.filter(r => r.tipo === 'filho');

    // Cônjuge - só mostrar se estado civil for "casado"
    const conjugeSection = document.getElementById('conjugeSection');
    const conjugeInfo = document.getElementById('conjugeInfo');
    const buscarConjuge = document.getElementById('buscarConjuge');
    const btnAdicionarConjuge = document.getElementById('btnAdicionarConjuge');

    if (conjugeSection) {
        if (estadoCivil === 'casado') {
            conjugeSection.style.display = 'block';
            if (conjuge) {
                if (conjugeInfo) {
                    conjugeInfo.innerHTML = `
                        <p><strong>Nome:</strong> ${conjuge.nome_completo || conjuge.nome}</p>
                        <p><strong>Email:</strong> ${conjuge.email}</p>
                        <p><strong>CPF:</strong> ${conjuge.cpf || 'Não informado'}</p>
                    `;
                }
                if (btnAdicionarConjuge) btnAdicionarConjuge.style.display = 'none';
                if (buscarConjuge) buscarConjuge.style.display = 'none';
            } else {
                if (conjugeInfo) conjugeInfo.innerHTML = '<p style="color: #999;">Nenhum cônjuge vinculado</p>';
                if (btnAdicionarConjuge) btnAdicionarConjuge.style.display = 'block';
                if (buscarConjuge) buscarConjuge.style.display = 'none';
            }
        } else {
            // Ocultar seção de cônjuge se não for casado
            conjugeSection.style.display = 'none';
        }
    }

    // Filhos - só mostrar se tiver filhos cadastrados
    const filhosSection = document.getElementById('filhosSection');
    const filhosList = document.getElementById('filhosList');
    const buscarFilho = document.getElementById('buscarFilho');
    const btnAdicionarFilho = document.getElementById('btnAdicionarFilho');

    if (filhosSection) {
        if (filhos.length > 0) {
            // Mostrar seção de filhos se tiver filhos cadastrados
            filhosSection.style.display = 'block';
            if (filhosList) {
                filhosList.innerHTML = filhos.map(filho => `
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                        <p><strong>Nome:</strong> ${filho.nome_completo || filho.nome}</p>
                        <p><strong>Email:</strong> ${filho.email}</p>
                        <p><strong>CPF:</strong> ${filho.cpf || 'Não informado'}</p>
                    </div>
                `).join('');
            }
            if (btnAdicionarFilho) btnAdicionarFilho.style.display = 'block';
            if (buscarFilho) buscarFilho.style.display = 'none';
        } else {
            // Ocultar seção de filhos completamente se não tiver filhos
            filhosSection.style.display = 'none';
        }
    }
    
    // Event listeners para buscar e vincular (só se as seções estiverem visíveis)
    if (btnAdicionarConjuge && estadoCivil === 'casado') {
        btnAdicionarConjuge.onclick = () => {
            buscarConjuge.style.display = 'block';
            btnAdicionarConjuge.style.display = 'none';
            // Resetar para CPF por padrão
            const tipoBusca = document.getElementById('tipoBuscaConjuge');
            const buscarCpf = document.getElementById('buscarConjugeCpf');
            const buscarId = document.getElementById('buscarConjugeId');
            if (tipoBusca) tipoBusca.value = 'cpf';
            if (buscarCpf) {
                buscarCpf.style.display = 'block';
                buscarCpf.required = true;
            }
            if (buscarId) {
                buscarId.style.display = 'none';
                buscarId.value = '';
                buscarId.required = false;
            }
        };
    }

    if (btnAdicionarFilho && filhos.length > 0) {
        btnAdicionarFilho.onclick = () => {
            buscarFilho.style.display = 'block';
            btnAdicionarFilho.style.display = 'none';
        };
    }

    // Botões de cancelar busca
    const cancelarBuscarConjuge = document.getElementById('cancelarBuscarConjuge');
    const cancelarBuscarFilho = document.getElementById('cancelarBuscarFilho');
    
    if (cancelarBuscarConjuge) {
        cancelarBuscarConjuge.onclick = () => {
            buscarConjuge.style.display = 'none';
            btnAdicionarConjuge.style.display = 'block';
            const cpfInput = document.getElementById('buscarConjugeCpf');
            const idInput = document.getElementById('buscarConjugeId');
            if (cpfInput) cpfInput.value = '';
            if (idInput) idInput.value = '';
            document.getElementById('resultadoBuscaConjuge').innerHTML = '';
        };
    }

    if (cancelarBuscarFilho) {
        cancelarBuscarFilho.onclick = () => {
            buscarFilho.style.display = 'none';
            btnAdicionarFilho.style.display = 'block';
            document.getElementById('buscarFilhoCpf').value = '';
            document.getElementById('resultadoBuscaFilho').innerHTML = '';
        };
    }

    document.getElementById('btnBuscarConjuge').onclick = () => buscarEAdicionarRelacionamento('conjuge');
    document.getElementById('btnBuscarFilho').onclick = () => buscarEAdicionarRelacionamento('filho');
}

// Buscar e adicionar relacionamento
async function buscarEAdicionarRelacionamento(tipo) {
    const resultadoId = tipo === 'conjuge' ? 'resultadoBuscaConjuge' : 'resultadoBuscaFilho';
    const resultadoDiv = document.getElementById(resultadoId);
    
    let url = '';
    
    if (tipo === 'conjuge') {
        const tipoBuscaSelect = document.getElementById('tipoBuscaConjuge');
        const tipoBusca = tipoBuscaSelect ? tipoBuscaSelect.value : 'cpf';
        
        if (tipoBusca === 'id') {
            const idInput = document.getElementById('buscarConjugeId');
            if (!idInput) {
                mostrarMensagem('Campo de ID não encontrado', 'error');
                return;
            }
            
            // Verificar se o campo está visível
            if (idInput.style.display === 'none' || window.getComputedStyle(idInput).display === 'none') {
                mostrarMensagem('Campo de ID não está visível. Selecione "ID do Cadastro" no dropdown.', 'error');
                return;
            }
            
            const id = idInput.value.trim();
            console.log('Tipo de busca:', tipoBusca, 'ID digitado:', id, 'Campo visível:', window.getComputedStyle(idInput).display); // Debug
            
            if (!id || id === '' || id === '0') {
                mostrarMensagem('Informe o ID para buscar', 'error');
                return;
            }
            
            const idNumero = parseInt(id);
            if (isNaN(idNumero) || idNumero <= 0) {
                mostrarMensagem('ID deve ser um número válido maior que zero', 'error');
                return;
            }
            
            url = `${API_URL}/usuarios/buscar?id=${idNumero}`;
            console.log('URL de busca:', url); // Debug
        } else {
            const cpfInput = document.getElementById('buscarConjugeCpf');
            const cpf = cpfInput ? cpfInput.value.replace(/\D/g, '') : '';
            if (!cpf) {
                mostrarMensagem('Informe o CPF para buscar', 'error');
                return;
            }
            url = `${API_URL}/usuarios/buscar?cpf=${encodeURIComponent(cpf)}`;
        }
    } else {
        const cpfInput = document.getElementById('buscarFilhoCpf');
        const cpf = cpfInput ? cpfInput.value.replace(/\D/g, '') : '';
        if (!cpf) {
            mostrarMensagem('Informe o CPF para buscar', 'error');
            return;
        }
        url = `${API_URL}/usuarios/buscar?cpf=${cpf}`;
    }

    try {
        const token = localStorage.getItem('token');
        console.log('Buscando com URL:', url); // Debug
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('Resposta da busca:', data); // Debug

        if (response.ok) {
            resultadoDiv.innerHTML = `
                <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <p><strong>ID:</strong> ${data.usuario.id}</p>
                    <p><strong>Nome:</strong> ${data.usuario.nome_completo || data.usuario.nome}</p>
                    <p><strong>Email:</strong> ${data.usuario.email}</p>
                    <p><strong>CPF:</strong> ${data.usuario.cpf || 'Não informado'}</p>
                    <button class="btn btn-primary" onclick="vincularRelacionamento(${data.usuario.id}, '${tipo}')" style="width: 100%; margin-top: 10px;">
                        Vincular ${tipo === 'conjuge' ? 'Cônjuge' : 'Filho'}
                    </button>
                </div>
            `;
        } else {
            resultadoDiv.innerHTML = `<p style="color: red;">${data.erro || 'Usuário não encontrado'}</p>`;
            mostrarMensagem(data.erro || 'Usuário não encontrado', 'error');
        }
    } catch (error) {
        console.error('Erro na busca:', error);
        mostrarMensagem('Erro ao buscar usuário: ' + error.message, 'error');
    }
}

// Buscar filho por ID (para campos dinâmicos)
window.buscarFilhoPorId = async function(index) {
    const idInput = document.getElementById(`filhoBuscarId${index}`);
    const id = idInput.value;

    if (!id) {
        mostrarMensagem('Informe o ID para buscar', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/usuarios/buscar?id=${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Preencher campos automaticamente
            document.getElementById(`filhoNome${index}`).value = data.usuario.nome_completo || data.usuario.nome || '';
            document.getElementById(`filhoId${index}`).value = data.usuario.id;
            
            if (data.usuario.cpf) {
                let cpf = data.usuario.cpf.replace(/\D/g, '');
                cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
                cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
                cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                document.getElementById(`filhoCpf${index}`).value = cpf;
            }
            
            document.getElementById(`filhoEmail${index}`).value = data.usuario.email || '';
            
            if (data.usuario.telefone) {
                let telefone = data.usuario.telefone.replace(/\D/g, '');
                if (telefone.length <= 10) {
                    telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
                    telefone = telefone.replace(/(\d{4})(\d)/, '$1-$2');
                } else {
                    telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
                    telefone = telefone.replace(/(\d{5})(\d)/, '$1-$2');
                }
                document.getElementById(`filhoTelefone${index}`).value = telefone;
            }
            
            mostrarMensagem('Dados carregados com sucesso!', 'success');
        } else {
            mostrarMensagem(data.erro || 'Usuário não encontrado', 'error');
        }
    } catch (error) {
        mostrarMensagem('Erro ao buscar usuário', 'error');
    }
};

// Vincular relacionamento (função global para onclick)
window.vincularRelacionamento = async function(relacionadoId, tipo) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/relacionamentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ tipo, relacionado_id: relacionadoId })
        });

        const data = await response.json();

        if (response.ok) {
            mostrarMensagem('Relacionamento vinculado com sucesso!', 'success');
            await carregarPerfilCompleto();
        } else {
            mostrarMensagem(data.erro || 'Erro ao vincular relacionamento', 'error');
        }
    } catch (error) {
        mostrarMensagem('Erro ao conectar com o servidor', 'error');
    }
}

// Formatar estado civil
function formatarEstadoCivil(estado) {
    const estados = {
        'solteiro': 'Solteiro(a)',
        'casado': 'Casado(a)',
        'viuvo': 'Viúvo(a)',
        'divorciado': 'Divorciado(a)'
    };
    return estados[estado] || estado;
}

// Mostrar mensagem
function mostrarMensagem(texto, tipo) {
    const msgDiv = document.getElementById('message');
    if (msgDiv) {
        msgDiv.textContent = texto;
        msgDiv.className = `message ${tipo}`;
        msgDiv.style.display = 'block';
        // Scroll para a mensagem
        msgDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => limparMensagem(), 5000);
    } else {
        // Fallback: usar alert se o elemento não existir
        alert(texto);
    }
}

// Limpar mensagem
function limparMensagem() {
    const msgDiv = document.getElementById('message');
    if (msgDiv) {
        msgDiv.textContent = '';
        msgDiv.className = 'message';
    }
}

// Event listener para "Tem filhos?"
document.addEventListener('DOMContentLoaded', () => {
    const temFilhosSelect = document.getElementById('temFilhos');
    const quantidadeFilhosGroup = document.getElementById('quantidadeFilhosGroup');
    const camposFilhos = document.getElementById('camposFilhos');
    const quantidadeFilhosInput = document.getElementById('quantidadeFilhos');

    if (temFilhosSelect) {
        temFilhosSelect.addEventListener('change', (e) => {
            if (e.target.value === 'sim') {
                quantidadeFilhosGroup.style.display = 'block';
                quantidadeFilhosInput.required = true;
            } else {
                if (quantidadeFilhosGroup) quantidadeFilhosGroup.style.display = 'none';
                if (camposFilhos) camposFilhos.style.display = 'none';
                if (quantidadeFilhosInput) {
                    quantidadeFilhosInput.required = false;
                    quantidadeFilhosInput.value = '';
                }
                const listaFilhos = document.getElementById('listaFilhos');
                if (listaFilhos) listaFilhos.innerHTML = '';
                // Remover required de todos os campos de filhos ocultos
                for (let i = 1; i <= 10; i++) {
                    const filhoNome = document.getElementById(`filhoNome${i}`);
                    const filhoCpf = document.getElementById(`filhoCpf${i}`);
                    if (filhoNome) filhoNome.required = false;
                    if (filhoCpf) filhoCpf.required = false;
                }
            }
        });
    }

    // Event listener para quantidade de filhos (select)
    if (quantidadeFilhosInput) {
        quantidadeFilhosInput.addEventListener('change', (e) => {
            const quantidade = parseInt(e.target.value);
            if (quantidade > 0 && quantidade <= 10) {
                criarCamposFilhos(quantidade);
                if (camposFilhos) camposFilhos.style.display = 'block';
                // Adicionar required apenas aos campos visíveis
                for (let i = 1; i <= quantidade; i++) {
                    const filhoNome = document.getElementById(`filhoNome${i}`);
                    const filhoCpf = document.getElementById(`filhoCpf${i}`);
                    if (filhoNome) filhoNome.required = true;
                    if (filhoCpf) filhoCpf.required = true;
                }
                // Remover required dos campos que não serão usados
                for (let i = quantidade + 1; i <= 10; i++) {
                    const filhoNome = document.getElementById(`filhoNome${i}`);
                    const filhoCpf = document.getElementById(`filhoCpf${i}`);
                    if (filhoNome) filhoNome.required = false;
                    if (filhoCpf) filhoCpf.required = false;
                }
            } else if (!quantidade) {
                if (camposFilhos) camposFilhos.style.display = 'none';
                const listaFilhos = document.getElementById('listaFilhos');
                if (listaFilhos) listaFilhos.innerHTML = '';
                // Remover required de todos os campos
                for (let i = 1; i <= 10; i++) {
                    const filhoNome = document.getElementById(`filhoNome${i}`);
                    const filhoCpf = document.getElementById(`filhoCpf${i}`);
                    if (filhoNome) filhoNome.required = false;
                    if (filhoCpf) filhoCpf.required = false;
                }
            }
        });
    }

    // Event listener para tipo de busca do cônjuge
    const tipoBuscaConjuge = document.getElementById('tipoBuscaConjuge');
    if (tipoBuscaConjuge) {
        tipoBuscaConjuge.addEventListener('change', (e) => {
            const buscarCpf = document.getElementById('buscarConjugeCpf');
            const buscarId = document.getElementById('buscarConjugeId');
            
            if (e.target.value === 'id') {
                if (buscarCpf) {
                    buscarCpf.style.display = 'none';
                    buscarCpf.value = '';
                    buscarCpf.required = false;
                }
                if (buscarId) {
                    buscarId.style.display = 'block';
                    buscarId.required = true;
                }
            } else {
                if (buscarCpf) {
                    buscarCpf.style.display = 'block';
                    buscarCpf.required = true;
                }
                if (buscarId) {
                    buscarId.style.display = 'none';
                    buscarId.value = '';
                    buscarId.required = false;
                }
            }
        });
    }
});

// Função para criar campos dinâmicos de filhos
function criarCamposFilhos(quantidade) {
    const listaFilhos = document.getElementById('listaFilhos');
    if (!listaFilhos) return;
    listaFilhos.innerHTML = '';
    
    // Remover required de todos os campos antigos antes de criar novos
    for (let i = 1; i <= 10; i++) {
        const filhoNome = document.getElementById(`filhoNome${i}`);
        const filhoCpf = document.getElementById(`filhoCpf${i}`);
        if (filhoNome) filhoNome.required = false;
        if (filhoCpf) filhoCpf.required = false;
    }

    for (let i = 1; i <= quantidade; i++) {
        const filhoDiv = document.createElement('div');
        filhoDiv.className = 'form-group';
        filhoDiv.style.background = '#f8f9fa';
        filhoDiv.style.padding = '20px';
        filhoDiv.style.borderRadius = '8px';
        filhoDiv.style.marginBottom = '15px';
        filhoDiv.style.border = '2px solid #e0e0e0';
        
        filhoDiv.innerHTML = `
            <h4 style="color: #667eea; margin-bottom: 15px; font-size: 16px;">Filho ${i}</h4>
            <div style="background: #e7f3ff; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Buscar cadastro existente por ID:</label>
                <div style="display: flex; gap: 5px;">
                    <input type="number" id="filhoBuscarId${i}" placeholder="ID do cadastro" style="flex: 1; padding: 8px; border: 2px solid #e0e0e0; border-radius: 5px;">
                    <button type="button" class="btn btn-primary" onclick="buscarFilhoPorId(${i})" style="width: auto; padding: 8px 15px;">Buscar</button>
                </div>
            </div>
            <div class="form-group">
                <label for="filhoNome${i}">Nome Completo *:</label>
                <input type="text" id="filhoNome${i}" class="filho-nome">
            </div>
            <div class="form-group">
                <label for="filhoCpf${i}">CPF *:</label>
                <input type="text" id="filhoCpf${i}" class="filho-cpf" placeholder="000.000.000-00">
            </div>
            <div class="form-group">
                <label for="filhoEmail${i}">Email:</label>
                <input type="email" id="filhoEmail${i}" class="filho-email">
            </div>
            <div class="form-group">
                <label for="filhoTelefone${i}">Telefone:</label>
                <input type="text" id="filhoTelefone${i}" class="filho-telefone" placeholder="(00) 00000-0000">
            </div>
            <input type="hidden" id="filhoId${i}" class="filho-id">
        `;
        
        listaFilhos.appendChild(filhoDiv);

        // Aplicar máscaras
        const cpfInput = document.getElementById(`filhoCpf${i}`);
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                e.target.value = value;
            }
        });

        const telefoneInput = document.getElementById(`filhoTelefone${i}`);
        telefoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                if (value.length <= 10) {
                    value = value.replace(/(\d{2})(\d)/, '($1) $2');
                    value = value.replace(/(\d{4})(\d)/, '$1-$2');
                } else {
                    value = value.replace(/(\d{2})(\d)/, '($1) $2');
                    value = value.replace(/(\d{5})(\d)/, '$1-$2');
                }
                e.target.value = value;
            }
        });
    }
}

// Máscaras de input
document.addEventListener('DOMContentLoaded', () => {
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                e.target.value = value;
            }
        });
    }

    const cepInput = document.getElementById('cep');
    if (cepInput) {
        cepInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 8) {
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
                e.target.value = value;
            }
        });
    }

    const telefoneInput = document.getElementById('telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                if (value.length <= 10) {
                    value = value.replace(/(\d{2})(\d)/, '($1) $2');
                    value = value.replace(/(\d{4})(\d)/, '$1-$2');
                } else {
                    value = value.replace(/(\d{2})(\d)/, '($1) $2');
                    value = value.replace(/(\d{5})(\d)/, '$1-$2');
                }
                e.target.value = value;
            }
        });
    }
});
