// =================================================================
// ARQUIVO JAVASCRIPT INTEGRADO - (dashboard.js)
// Gerencia a exibição de denúncias tanto no dashboard completo
// quanto em visualizações resumidas (ex: página inicial).
// =================================================================

// --- 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBLHKrtSiLBCoXKZr7O6sQYSfG1_0GhC3M",
    authDomain: "piteste-188ec.firebaseapp.com",
    databaseURL: "https://piteste-188ec-default-rtdb.firebaseio.com",
    projectId: "piteste-188ec",
    storageBucket: "piteste-188ec.firebasestorage.app",
    messagingSenderId: "619288038856",
    appId: "1:619288038856:web:0c21cac9811028defac4fd",
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database(); // Referência global para o banco de dados

// --- 2. VARIÁVEIS GLOBAIS ---
let todasAsDenuncias = []; // Armazena todas as denúncias carregadas para o dashboard completo

// --- 3. FUNÇÕES AUXILIARES ---

/**
 * Formata uma string de timestamp (ISO 8601) para o formato "dd/mm/aaaa HH:MM".
 * @param {string} timestampString - O timestamp a ser formatado.
 * @returns {string} A data e hora formatadas.
 */
function formatarTimestamp(timestampString) {
    if (!timestampString) return "Data não informada";
    const dt = new Date(timestampString);
    const dia = String(dt.getDate()).padStart(2, '0');
    const mes = String(dt.getMonth() + 1).padStart(2, '0');
    const ano = dt.getFullYear();
    const hora = String(dt.getHours()).padStart(2, '0');
    const minutos = String(dt.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${minutos}`;
}

// --- 4. LÓGICA DO MODAL DE DETALHES (Comum a todas as visualizações) ---

const modal = document.getElementById("modalDetalhes");
if (modal) {
    const fecharBtn = modal.querySelector(".fechar");
    fecharBtn.onclick = () => modal.style.display = "none";
    window.onclick = event => {
        if (event.target == modal) modal.style.display = "none";
    };
}

/**
 * Exibe os detalhes de uma denúncia em um modal.
 * @param {object} denuncia - O objeto da denúncia com todos os seus dados.
 */
function mostrarDetalhes(denuncia) {
    if (!modal) {
        console.error("Elemento do modal #modalDetalhes não encontrado!");
        return;
    }
    document.getElementById('det-data').innerText = formatarTimestamp(denuncia.timestamp);
    document.getElementById('det-nome').innerText = denuncia.nome || "Não informado";
    document.getElementById('det-telefone').innerText = denuncia.telefone || "Não informado";
    document.getElementById('det-local').innerText = denuncia.local || "Não informado";
    document.getElementById('det-descricao').innerText = denuncia.descricao || "Sem descrição";

    const finalidadeContainer = document.getElementById("finalidade-container");
    const finalidadeInput = document.getElementById("finalidade-texto");
    finalidadeInput.value = denuncia.finalidade || "";
    finalidadeContainer.style.display = "none";

    // Configuração dos botões de ação
    document.querySelector('.iniciar').onclick = () => atualizarStatus(denuncia.id, 'em_analise');
    document.querySelector('.contato').onclick = () => window.location.href = `tel:${denuncia.telefone || ''}`;
    document.querySelector('.finalizar').onclick = () => {
        finalidadeContainer.style.display = 'block';
        
        // Remove o botão antigo para evitar duplicatas
        const botaoSalvarExistente = document.getElementById("botao-salvar-final");
        if (botaoSalvarExistente) botaoSalvarExistente.remove();

        const botaoSalvar = document.createElement('button');
        botaoSalvar.innerText = "Salvar Finalização";
        botaoSalvar.className = "salvar-finalizacao";
        botaoSalvar.id = "botao-salvar-final";
        finalidadeContainer.appendChild(botaoSalvar);

        botaoSalvar.onclick = () => {
            const finalidade = finalidadeInput.value.trim();
            if (finalidade === "") {
                alert("Informe a finalidade antes de finalizar.");
                return;
            }
            atualizarStatus(denuncia.id, 'finalizado', finalidade);
        };
    };

    modal.style.display = "block";
}

/**
 * Atualiza o status e a finalidade (opcional) de uma denúncia no Firebase.
 * @param {string} id - O ID da denúncia a ser atualizada.
 * @param {string} novoStatus - O novo status ('em_analise' ou 'finalizado').
 * @param {string} [finalidade=""] - A descrição da finalização (opcional).
 */
async function atualizarStatus(id, novoStatus, finalidade = "") {
    console.log(`Atualizando status para: ${novoStatus} no ID: ${id}`);
    const updates = {};
    updates[`/denuncias/${id}/status`] = novoStatus;

    if (finalidade) {
        updates[`/denuncias/${id}/finalidade`] = finalidade;
    }

    try {
        await db.ref().update(updates);
        console.log("Status atualizado com sucesso no Firebase!");
        if (modal) modal.style.display = "none";
        
        // Recarrega os dados na página para refletir a mudança
        if (document.querySelector('.dashboard-grid')) {
            carregarDadosDoDashboardCompleto();
        }
        if (document.querySelector('.dashboard-right')) {
            exibirDenunciasRecentesNoDashboard();
        }
    } catch (error) {
        console.error("Erro ao atualizar status no Firebase:", error);
        alert("Erro ao atualizar status!");
    }
}


// --- 5. LÓGICA PARA O DASHBOARD COMPLETO ---
// (Usado na página com filtros, busca e todas as denúncias)

/**
 * Carrega TODAS as denúncias do Firebase para o dashboard completo.
 */
function carregarDadosDoDashboardCompleto() {
    const denunciasRef = db.ref('denuncias');
    
    denunciasRef.once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                document.querySelector('.dashboard-grid').innerHTML = '<p>Nenhuma denúncia encontrada.</p>';
                return;
            }
            const dadosDoFirebase = snapshot.val();
            const denunciasArray = Object.keys(dadosDoFirebase).map(key => ({
                id: key, ...dadosDoFirebase[key]
            }));
            
            // Ordena do mais recente para o mais antigo
            todasAsDenuncias = denunciasArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            exibirDenunciasNoGrid(todasAsDenuncias);
            configurarControlesDeFiltro();
        })
        .catch(error => console.error("Erro ao carregar dados do dashboard:", error));
}

/**
 * Exibe uma lista de denúncias no container do dashboard completo.
 * @param {Array} listaDeDenuncias - O array de denúncias a ser exibido.
 */
function exibirDenunciasNoGrid(listaDeDenuncias) {
    const container = document.querySelector('.dashboard-grid');
    container.innerHTML = '';

    if (listaDeDenuncias.length === 0) {
        container.innerHTML = "<p style='text-align:center;'>Nenhum resultado encontrado para os filtros aplicados.</p>";
        return;
    }

    listaDeDenuncias.forEach(denuncia => {
        let corClasse = '';
        switch (denuncia.status) {
            case 'nao_iniciado': corClasse = 'red'; break;
            case 'em_analise': corClasse = 'yellow'; break;
            case 'finalizado': corClasse = 'green'; break;
        }

        const card = document.createElement('div');
        card.className = `denuncia ${corClasse}`;
        card.onclick = () => mostrarDetalhes(denuncia);
        card.innerHTML = `
          <header>
            <span class="usuario-info">USUÁRIO: ${denuncia.nome || 'Anônimo'}</span>
            <span class="meta">${formatarTimestamp(denuncia.timestamp)}</span>
          </header>
          <p>
            <strong>OCORRÊNCIA:</strong> ${denuncia.ocorrencia || 'Não informada'}<br>
            <strong>ONDE OCORREU:</strong> ${denuncia.local || 'Não informado'}
          </p>`;
        container.appendChild(card);
    });
}

/**
 * Configura os listeners de evento para os campos de filtro e pesquisa.
 */
function configurarControlesDeFiltro() {
    const campoPesquisa = document.getElementById('campoPesquisa');
    const filtroStatus = document.getElementById('filtroStatus');
    
    campoPesquisa.addEventListener('input', aplicarFiltros);
    filtroStatus.addEventListener('change', aplicarFiltros);
}

/**
 * Filtra as denúncias com base nos controles da UI e as re-exibe.
 */
function aplicarFiltros() {
    const termoPesquisa = document.getElementById('campoPesquisa').value.toLowerCase().trim();
    const statusSelecionado = document.getElementById('filtroStatus').value;

    let denunciasFiltradas = todasAsDenuncias;

    // 1. Filtra por status
    if (statusSelecionado !== 'todos') {
        denunciasFiltradas = denunciasFiltradas.filter(d => d.status === statusSelecionado);
    }

    // 2. Filtra pelo termo de pesquisa
    if (termoPesquisa !== '') {
        denunciasFiltradas = denunciasFiltradas.filter(denuncia => 
            (denuncia.nome && denuncia.nome.toLowerCase().includes(termoPesquisa)) ||
            (denuncia.ocorrencia && denuncia.ocorrencia.toLowerCase().includes(termoPesquisa)) ||
            (denuncia.local && denuncia.local.toLowerCase().includes(termoPesquisa))
        );
    }
    
    exibirDenunciasNoGrid(denunciasFiltradas);
}


// --- 6. LÓGICA PARA VISUALIZAÇÃO RESUMIDA ---
// (Ex: Um widget na página inicial com as 10 últimas denúncias)

/**
 * Busca as 10 denúncias mais recentes do Firebase e as exibe em um container específico.
 */
function exibirDenunciasRecentesNoDashboard() {
    const container = document.querySelector('.dashboard-right');
    if (!container) {
        console.error('Container para denúncias recentes (.dashboard-right) não foi encontrado!');
        return;
    }

    container.innerHTML = '<p style="color: white; text-align: center;">Carregando...</p>';
    const denunciasRef = db.ref('denuncias');

    // Query para buscar os 10 mais recentes
    denunciasRef.orderByChild('timestamp').limitToLast(10).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                container.innerHTML = '<p style="color: white; text-align: center;">Nenhuma denúncia encontrada.</p>';
                return;
            }

            container.innerHTML = '';
            
            const denunciasArray = [];
            snapshot.forEach(childSnapshot => {
                denunciasArray.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });

            // Inverte para mostrar o mais recente no topo
            denunciasArray.reverse();

            denunciasArray.forEach(denuncia => {
                let corClasse = '';
                switch (denuncia.status) {
                    case 'nao_iniciado': corClasse = 'red'; break;
                    case 'em_analise': corClasse = 'yellow'; break;
                    case 'finalizado': corClasse = 'green'; break;
                }
                
                const card = document.createElement('div');
                card.className = `denuncia ${corClasse}`; // Usando a mesma classe para consistência
                card.onclick = () => mostrarDetalhes(denuncia); // Reutilizando a função do modal

                // Usando uma estrutura de card similar ao dashboard completo
                card.innerHTML = `
                  <header>
                    <span class="usuario-info">USUÁRIO: ${denuncia.nome || 'Anônimo'}</span>
                    <span class="meta-resumo">${formatarTimestamp(denuncia.timestamp)}</span>
                  </header>
                  <p class="resumo">
                    <strong>OCORRÊNCIA:</strong> ${denuncia.ocorrencia?.substring(0, 80) || 'Não informada'}...
                  </p>
                `;
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error("Erro ao buscar denúncias recentes:", error);
            container.innerHTML = `<p style="color: #ffcccc; text-align: center;">Erro ao carregar denúncias.</p>`;
        });
}


// --- 7. INICIALIZAÇÃO DA PÁGINA ---
// Executa a função correta dependendo dos elementos presentes na página.

document.addEventListener('DOMContentLoaded', () => {
    // Se for a página do dashboard completo, carrega tudo.
    if (document.querySelector('.dashboard-grid') && document.getElementById('campoPesquisa')) {
        console.log("Modo Dashboard Completo detectado. Carregando todos os dados.");
        carregarDadosDoDashboardCompleto();
    }
    // Se for a página com o widget de denúncias recentes, carrega só as últimas 10.
    else if (document.querySelector('.dashboard-right')) {
        console.log("Modo Dashboard Resumido detectado. Carregando recentes.");
        exibirDenunciasRecentesNoDashboard();
    }
});