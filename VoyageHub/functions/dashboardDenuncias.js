// =================================================================
// ARQUIVO COMPLETO: functions/dashboardDenuncias.js (COM NOME DE USUÁRIO)
// =================================================================

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBLHKrtSiLBCoXKZr7O6sQYSfG1_0GhC3M",
    authDomain: "piteste-188ec.firebaseapp.com",
    databaseURL: "https://piteste-188ec-default-rtdb.firebaseio.com",
    projectId: "piteste-188ec",
    storageBucket: "piteste-188ec.firebasestorage.app",
    messagingSenderId: "619288038856",
    appId: "1:619288038856:web:0c21cac9811028defac4fd",
};
firebase.initializeApp(firebaseConfig);

// --- SERVIÇOS GLOBAIS DO FIREBASE ---
const db = firebase.database();
const auth = firebase.auth();

// --- VARIÁVEIS GLOBAIS ---
let todasAsDenuncias = [];

// =================================================================
// --- FUNÇÃO PARA BUSCAR O NOME DO USUÁRIO (ADICIONADA) ---
// =================================================================
function buscarNomeDoUsuario() {
    console.log("Iniciando buscarNomeDoUsuario..."); 
    const spanNomeUsuario = document.getElementById('nome-usuario-logado');

    if (!spanNomeUsuario) {
        console.error("ERRO: O span 'nome-usuario-logado' não foi encontrado!");
        return;
    }

    auth.onAuthStateChanged(user => {
        console.log("Auth state mudou."); 
        if (user) {
            console.log("Usuário detectado:", user.uid); 
            const nome = user.displayName || user.email || "USUÁRIO"; 
            spanNomeUsuario.innerText = `${nome.toUpperCase()} - ADM`;
            console.log(`Nome do usuário atualizado para: ${spanNomeUsuario.innerText}`);
        } else {
            console.log("Nenhum usuário está logado."); 
            // Opcional: Redirecionar se não estiver logado
            // window.location.href = 'login.html';
        }
    });
}

// --- FUNÇÕES AUXILIARES ---
function formatarTimestamp(timestamp) {
    if (!timestamp) return "Data não informada";
    const dt = new Date(timestamp);
    if (isNaN(dt.getTime())) return "Data inválida";
    const dia = String(dt.getDate()).padStart(2, '0');
    const mes = String(dt.getMonth() + 1).padStart(2, '0');
    const ano = dt.getFullYear();
    const hora = String(dt.getHours()).padStart(2, '0');
    const minutos = String(dt.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${minutos}`;
}

// --- LÓGICA PRINCIPAL ---
function carregarDadosDoDashboard() {
    // const db = firebase.database(); // Removido, usando o 'db' global
    const denunciasRef = db.ref('denuncias');
    
    denunciasRef.once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                document.querySelector('dashboard-grid').innerHTML = '<p>Nenhuma denúncia encontrada.</p>';
                return;
            }
            const dadosDoFirebase = snapshot.val();
            const denunciasArray = Object.keys(dadosDoFirebase).map(key => ({ id: key, ...dadosDoFirebase[key] }));
            
            // Ordena as denúncias pela data de criação (timestamp), da mais nova para a mais antiga
            todasAsDenuncias = denunciasArray.sort((a, b) => (a.timestamp && b.timestamp) ? b.timestamp - a.timestamp : 0);
            
            exibirDenuncias(todasAsDenuncias);
            configurarControles();
        })
        .catch(error => console.error("Erro ao carregar dados do Firebase:", error));
}

function exibirDenuncias(listaDeDenuncias) {
    const container = document.querySelector('.dashboard-grid');
    container.innerHTML = '';

    if (listaDeDenuncias.length === 0) {
        container.innerHTML = "<p style='text-align:center;'>Nenhum resultado encontrado.</p>";
        return;
    }

    listaDeDenuncias.forEach(denuncia => {
        let corClasse = '';
        switch (denuncia.status) {
            case 'nova':
                corClasse = 'red';
                break;
            case 'vizualizado':
                corClasse = 'yellow';
                break;
            case 'resolvido':
                corClasse = 'green';
                break;
            default:
                corClasse = 'grey'; 
        }

        const dataFormatada = formatarTimestamp(denuncia.timestamp);
        const card = document.createElement('div');
        card.className = `denuncia ${corClasse}`;
        card.onclick = () => mostrarDetalhes(denuncia);
        
        card.innerHTML = `
          <header>
            <span class="usuario-info">USUÁRIO: ${denuncia.nome_usuario || 'Anônimo'}</span>
            <span class="meta">${dataFormatada}</span>
          </header>
          <p>
            <strong>OCORRÊNCIA:</strong> ${denuncia.tipo_ocorrencia || 'Não informada'}<br>
            <strong>ONDE OCORREU:</strong> ${denuncia.onde_ocorreu || 'Não informado'}
          </p>`;
        container.appendChild(card);
    });
}

function configurarControles() {
    document.getElementById('campoPesquisa')?.addEventListener('input', aplicarFiltros);
    document.getElementById('filtroStatus')?.addEventListener('change', aplicarFiltros);
}

function aplicarFiltros() {
    const termoPesquisa = document.getElementById('campoPesquisa').value.toLowerCase().trim();
    const statusSelecionado = document.getElementById('filtroStatus').value;

    let denunciasFiltradas = todasAsDenuncias;

    if (statusSelecionado !== 'todos') {
        // CORREÇÃO: Os valores no <select> são 'nao_iniciado', 'em_analise', 'finalizado'
        // O banco de dados usa 'nova', 'vizualizado', 'resolvido'
        // Precisamos "traduzir"
        let statusBanco;
        switch (statusSelecionado) {
            case 'nao_iniciado': statusBanco = 'nova'; break;
            case 'em_analise': statusBanco = 'vizualizado'; break;
            case 'finalizado': statusBanco = 'resolvido'; break;
            default: statusBanco = statusSelecionado;
        }
        denunciasFiltradas = denunciasFiltradas.filter(d => d.status === statusBanco);
    }

    if (termoPesquisa !== '') {
        denunciasFiltradas = denunciasFiltradas.filter(denuncia => 
            (denuncia.nome_usuario || '').toLowerCase().includes(termoPesquisa) ||
            (denuncia.tipo_ocorrencia || '').toLowerCase().includes(termoPesquisa) ||
            (denuncia.onde_ocorreu || '').toLowerCase().includes(termoPesquisa)
        );
    }
    
    exibirDenuncias(denunciasFiltradas);
}

// --- LÓGICA DO MODAL ---
const modal = document.getElementById("modalDetalhes");
const fecharBtn = document.querySelector(".fechar");
fecharBtn.onclick = () => modal.style.display = "none";
window.onclick = event => { if (event.target == modal) modal.style.display = "none"; };

function mostrarDetalhes(denuncia) {
    document.getElementById('det-nome').innerText = denuncia.nome_usuario || "Não informado";
    document.getElementById('det-telefone').innerText = denuncia.telefone_contato || "Não informado";
    document.getElementById('det-data').innerText = formatarTimestamp(denuncia.timestamp);
    document.getElementById('det-local').innerText = denuncia.onde_ocorreu || "Não informado";
    document.getElementById('det-descricao').innerText = denuncia.descricao || "Sem descrição";

    const finalidadeContainer = document.getElementById("finalidade-container");
    const finalidadeInput = document.getElementById("finalidade-texto");
    finalidadeInput.value = denuncia.finalidade || "";
    finalidadeContainer.style.display = "none";

    document.querySelector('.iniciar').onclick = () => atualizarStatus(denuncia.id, 'vizualizado');
    document.querySelector('.contato').onclick = () => {
        if (denuncia.telefone_contato) window.location.href = `tel:${denuncia.telefone_contato}`;
        else alert("Este usuário não forneceu um número de telefone.");
    };
    document.querySelector('.finalizar').onclick = () => {
        finalidadeContainer.style.display = 'block';
        
        let botaoSalvar = document.getElementById("botao-salvar-final");
        if (botaoSalvar) botaoSalvar.remove(); 

        botaoSalvar = document.createElement('button');
        botaoSalvar.innerText = "Salvar Finalização";
        botaoSalvar.className = "salvar-finalizacao";
        botaoSalvar.id = "botao-salvar-final";
        finalidadeContainer.appendChild(botaoSalvar);
        
        botaoSalvar.onclick = () => {
            const finalidade = finalidadeInput.value.trim();
            if (finalidade === "") { alert("Informe a finalização antes de salvar."); return; }
            atualizarStatus(denuncia.id, 'resolvido', finalidade);
        };
    };

    modal.style.display = "block";
}

async function atualizarStatus(id, novoStatus, finalidade = "") {
    // const db = firebase.database(); // Removido, usando o 'db' global
    const updates = {};
    updates[`/denuncias/${id}/status`] = novoStatus;
    updates[`/denuncias/${id}/timestampAtualizacao`] = Date.now();
    
    if (finalidade) {
        updates[`/denuncias/${id}/finalidade`] = finalidade;
    }

    try {
        await db.ref().update(updates);
        modal.style.display = "none";
        carregarDadosDoDashboard(); // Recarrega os dados para refletir a mudança
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
    }
}

// --- INICIALIZAÇÃO (MODIFICADO) ---
// Agora chama as duas funções quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosDoDashboard();
    buscarNomeDoUsuario();
});