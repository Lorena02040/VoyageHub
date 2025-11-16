// =================================================================
// ARQUIVO: assets/js/registro.js (CORRIGIDO, ALINHADO E COM NOME)
// =================================================================

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
apiKey: "AIzaSyBLHKrtSiLBCoXKZr7O6sQYSfG1_0GhC3M",
authDomain: "piteste-188ec.firebaseapp.com",
databaseURL: "https://piteste-188ec-default-rtdb.firebaseio.com",
projectId: "piteste-188ec",
storageBucket: "piteste-188ec.appspot.com",
messagingSenderId: "619288038856",
appId: "1:619288038856:web:0c21cac9811028defac4fd",
};

// Evita erro de reinicialização se o Firebase já estiver inicializado
if (!firebase.apps.length) {
firebase.initializeApp(firebaseConfig);
}

// --- SERVIÇOS GLOBAIS DO FIREBASE (MODIFICADO) ---
const db = firebase.database();
const auth = firebase.auth(); // <-- ADICIONADO

// --- VARIÁVEIS GLOBAIS ---
let denunciasNovas = [];

// =================================================================
// --- FUNÇÃO PARA BUSCAR O NOME DO USUÁRIO (ADICIONADA) ---
// =================================================================
function buscarNomeDoUsuario() {
console.log("Iniciando buscarNomeDoUsuario..."); 
// Assumindo que seu HTML tem <span id="nome-usuario-logado">
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

// --- FUNÇÃO AUXILIAR DE FORMATAÇÃO ---
function formatarTimestamp(timestamp) {
if (!timestamp) return "Data não informada";
const dt = new Date(timestamp);
const dia = String(dt.getDate()).padStart(2, '0');
const mes = String(dt.getMonth() + 1).padStart(2, '0');
const ano = dt.getFullYear();
const hora = String(dt.getHours()).padStart(2, '0');
const minutos = String(dt.getMinutes()).padStart(2, '0');
return `${dia}/${mes}/${ano} ${hora}:${minutos}`;
}

// --- LÓGICA PRINCIPAL ---
function carregarRegistros() {
// const db = firebase.database(); // Movido para global
const denunciasRef = db.ref('denuncias');

denunciasRef.once('value')
.then(snapshot => {
if (!snapshot.exists()) {
document.querySelector('.dashboard-grid').innerHTML = '<p>Nenhuma denúncia encontrada.</p>';
return;
}

const dadosDoFirebase = snapshot.val();
const denunciasArray = Object.keys(dadosDoFirebase).map(key => ({
id: key,
...dadosDoFirebase[key]
}));

// Filtrar apenas as novas
denunciasNovas = denunciasArray.filter(d => d.status === 'nova');
denunciasNovas.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

exibirRegistros(denunciasNovas);
configurarPesquisaRegistro();
})
.catch(error => console.error("Erro ao carregar denúncias novas:", error));
}

// --- EXIBIÇÃO DOS REGISTROS ---
function exibirRegistros(listaDeDenuncias) {
const container = document.querySelector('.dashboard-grid');
container.innerHTML = '';

if (listaDeDenuncias.length === 0) {
container.innerHTML = "<p style='text-align:center;'>Nenhuma denúncia nova encontrada.</p>";
return;
}

listaDeDenuncias.forEach(denuncia => {
const dataCompletaFormatada = formatarTimestamp(denuncia.timestamp);

const card = document.createElement('div');
card.className = 'denuncia red';
card.onclick = () => mostrarDetalhes(denuncia);

// ✅ Estrutura HTML corrigida com espaçamento entre nome e data
card.innerHTML = `
<div class="topo">
<span class="usuario-info">USUÁRIO: ${denuncia.nome_usuario || 'Anônimo'}</span>
<span class="meta">${dataCompletaFormatada}</span>
</div>
<p>
<strong>OCORRÊNCIA:</strong> ${denuncia.tipo_ocorrencia || 'Não informada'}<br>
<strong>ONDE OCORREU:</strong> ${denuncia.onde_ocorreu || 'Não informado'}
</p>
`;

container.appendChild(card);
});
}

// --- FUNÇÃO DE PESQUISA ---
function configurarPesquisaRegistro() {
const campoPesquisa = document.getElementById('pesquisaRegistro');
if (!campoPesquisa) return;

campoPesquisa.addEventListener('input', () => {
const termoPesquisa = campoPesquisa.value.toLowerCase().trim();
const denunciasFiltradas = denunciasNovas.filter(denuncia => 
(denuncia.nome_usuario && denuncia.nome_usuario.toLowerCase().includes(termoPesquisa)) ||
(denuncia.tipo_ocorrencia && denuncia.tipo_ocorrencia.toLowerCase().includes(termoPesquisa)) ||
(denuncia.onde_ocorreu && denuncia.onde_ocorreu.toLowerCase().includes(termoPesquisa))
);
exibirRegistros(denunciasFiltradas);
});
}

// --- MODAL DETALHES ---
const modal = document.getElementById("modalDetalhes");
const fecharBtn = document.querySelector(".fechar");
if (fecharBtn) {
fecharBtn.onclick = () => modal.style.display = "none";
}
window.onclick = event => { if (event.target == modal) modal.style.display = "none"; };

function mostrarDetalhes(denuncia) {
document.getElementById('det-nome').innerText = denuncia.nome_usuario || "Não informado";
document.getElementById('det-telefone').innerText = denuncia.telefone_contato || "Não informado";
document.getElementById('det-data').innerText = formatarTimestamp(denuncia.timestamp);
document.getElementById('det-local').innerText = denuncia.onde_ocorreu || "Não informado";
document.getElementById('det-descricao').innerText = denuncia.descricao || "Sem descrição";

const anexoContainer = document.getElementById('anexo-container');
const imagemAnexo = document.getElementById('det-imagem-anexo');
if (anexoContainer && imagemAnexo) {
if (denuncia.imageUrl) {
imagemAnexo.src = denuncia.imageUrl;
anexoContainer.style.display = 'block';
} else {
anexoContainer.style.display = 'none';
}
}

const finalidadeDisplay = document.getElementById('finalidade-display');
const finalidadeTextoDisplay = document.getElementById('det-finalidade');
if (finalidadeDisplay && finalidadeTextoDisplay) {
if (denuncia.finalidade) {
finalidadeTextoDisplay.innerText = denuncia.finalidade;
finalidadeDisplay.style.display = 'block';
} else {
finalidadeDisplay.style.display = 'none';
}
}

const botaoContato = document.querySelector('.contato');
if (botaoContato) {
botaoContato.onclick = () => {
if (denuncia.telefone_contato) {
window.location.href = `tel:${denuncia.telefone_contato}`;
} else {
alert("Não há telefone cadastrado para este usuário.");
}
};
}

modal.style.display = "block";
}

// --- INICIALIZAÇÃO (MODIFICADO) ---
// Agora chama as duas funções
document.addEventListener('DOMContentLoaded', () => {
carregarRegistros();
buscarNomeDoUsuario(); // <-- ADICIONADO
});