// =================================================================
// ARQUIVO: functions/relatorioeEstatisticas.js (VERSÃO COM NOME DE USUÁRIO)
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
firebase.initializeApp(firebaseConfig);

// --- DEFINIÇÕES GLOBAIS DO FIREBASE ---
const db = firebase.database();
const auth = firebase.auth(); // <-- ADICIONADO PARA A FUNÇÃO DE NOME

// =================================================================
// --- FUNÇÃO PARA BUSCAR O NOME DO USUÁRIO (ADICIONADA) ---
// =================================================================
function buscarNomeDoUsuario() {
console.log("Iniciando buscarNomeDoUsuario..."); 

// 1. Encontra o elemento no HTML onde o nome será exibido
// (ASSUMINDO que seu HTML tem <span id="nome-usuario-logado">)
const spanNomeUsuario = document.getElementById('nome-usuario-logado');

if (!spanNomeUsuario) {
console.error("ERRO: O span 'nome-usuario-logado' não foi encontrado no HTML desta página!");
return;
}

// 2. Pede ao Firebase para verificar o status do login
auth.onAuthStateChanged(user => {
console.log("Auth state mudou."); 

if (user) {
// 3. Se um usuário for encontrado...
console.log("Usuário detectado:", user.uid); 

// LÓGICA DE FALLBACK: 
const nome = user.displayName || user.email || "USUÁRIO"; 

// 4. Atualiza o texto no HTML
spanNomeUsuario.innerText = `${nome.toUpperCase()} - ADM`;
console.log(`Nome do usuário atualizado para: ${spanNomeUsuario.innerText}`);
} else {
// 5. Se nenhum usuário estiver logado
console.log("Nenhum usuário está logado."); 
}
});
}

// =================================================================
// --- LÓGICA DOS GRÁFICOS (Seu código original) ---
// =================================================================
let meuGraficoBarras;
let meuGraficoPizza;

function escutarEAtualizarGraficos() {
// const db = firebase.database(); // Removido pois 'db' agora é global
const denunciasRef = db.ref('denuncias');

denunciasRef.on('value', (snapshot) => {
if (!snapshot.exists()) {
console.log("Nenhuma denúncia encontrada no Firebase.");
if(meuGraficoBarras) meuGraficoBarras.destroy();
if(meuGraficoPizza) meuGraficoPizza.destroy();
return;
}

const denuncias = snapshot.val();

// Processamento para Gráfico de Barras (por tipo_ocorrencia)
const contagemPorOcorrencia = {};
console.log("--- INICIANDO LEITURA DAS OCORRÊNCIAS ---");
for (const key in denuncias) {
const ocorrencia = denuncias[key].tipo_ocorrencia || "Não especificado";

// !!!!! LINHA DE DEBUG !!!!!
console.log(`Lendo denúncia ID ${key}: O valor de 'tipo_ocorrencia' é:`, denuncias[key].tipo_ocorrencia);

contagemPorOcorrencia[ocorrencia] = (contagemPorOcorrencia[ocorrencia] || 0) + 1;
}
console.log("--- FIM DA LEITURA ---");
console.log("Contagem final para o gráfico:", contagemPorOcorrencia);


const labelsOcorrencia = Object.keys(contagemPorOcorrencia);
const dataOcorrencia = Object.values(contagemPorOcorrencia);
desenharOuAtualizarGraficoBarras(labelsOcorrencia, dataOcorrencia);

// Processamento para Gráfico de Pizza (Status)
const contagemPorStatus = { 'nova': 0, 'vizualizado': 0, 'resolvido': 0 };
const outrosStatus = {};
for (const key in denuncias) {
const status = denuncias[key].status;
if (status in contagemPorStatus) {
contagemPorStatus[status]++;
} else if (status) {
outrosStatus[status] = (outrosStatus[status] || 0) + 1;
}
}
const dadosFinaisStatus = { ...contagemPorStatus, ...outrosStatus };
const labelsStatus = Object.keys(dadosFinaisStatus);
const dataStatus = Object.values(dadosFinaisStatus);
const mapaDeCores = {
'nova': 'rgba(255, 99, 132, 0.7)',
'vizualizado': 'rgba(255, 206, 86, 0.7)',
'resolvido': 'rgba(75, 192, 192, 0.7)',
};
const coresDoGrafico = labelsStatus.map(label => mapaDeCores[label] || 'rgba(150, 150, 150, 0.7)');
if (labelsStatus.length > 0) {
desenharOuAtualizarGraficoPizza(labelsStatus, dataStatus, coresDoGrafico);
}
});
}

// ... (o resto das funções `desenharOuAtualizarGraficoBarras` e `desenharOuAtualizarGraficoPizza` continua igual) ...

function desenharOuAtualizarGraficoBarras(labels, data) {
const ctx = document.getElementById('graficoDenuncias').getContext('2d');
if (meuGraficoBarras) {
meuGraficoBarras.destroy();
}
meuGraficoBarras = new Chart(ctx, {
type: 'bar',
data: {
labels: labels,
datasets: [{
label: 'Quantidade de Denúncias por Ocorrência',
data: data,
backgroundColor: 'rgba(54, 162, 235, 0.5)',
borderColor: 'rgba(54, 162, 235, 1)',
borderWidth: 1
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
scales: {
y: {
beginAtZero: true,
ticks: { stepSize: 1, precision: 0 }
}
}
}
});
}

function desenharOuAtualizarGraficoPizza(labels, data, cores) {
const ctx = document.getElementById('graficoStatus').getContext('2d');
if (meuGraficoPizza) {
meuGraficoPizza.destroy();
}
meuGraficoPizza = new Chart(ctx, {
type: 'pie',
data: {
labels: labels,
datasets: [{
label: 'Status das Denúncias',
data: data,
backgroundColor: cores,
hoverOffset: 4
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
plugins: {
legend: { position: 'top' }
}
}
});
}

// =================================================================
// --- INICIALIZAÇÃO (MODIFICADO) ---
// =================================================================
// Chama as duas funções quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
console.log("DOM Carregado. Iniciando gráficos e busca de nome...");
escutarEAtualizarGraficos(); // Chama sua função de gráficos
buscarNomeDoUsuario();       // Chama a função de buscar o nome
});