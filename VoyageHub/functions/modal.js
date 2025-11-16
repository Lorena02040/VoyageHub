// Gerencia abertura do modal e ações dos botões

const modal = document.getElementById("modalDetalhes");
const fecharBtn = document.querySelector(".fechar");

fecharBtn.onclick = () => modal.style.display = "none";
window.onclick = event => { if(event.target == modal) modal.style.display = "none"; };

function mostrarDetalhes(denuncia) {
    document.getElementById('det-nome').innerText = denuncia.nome || "Não informado";
    document.getElementById('det-telefone').innerText = denuncia.telefone || "Não informado";
    document.getElementById('det-data').innerText = denuncia.data || denuncia.timestamp || "Não informado";
    document.getElementById('det-local').innerText = denuncia.local || "Não informado";
    document.getElementById('det-descricao').innerText = denuncia.descricao || "Sem descrição";

    const finalidadeContainer = document.getElementById("finalidade-container");
    const finalidadeInput = document.getElementById("finalidade-texto");
    finalidadeInput.value = denuncia.finalidade || "";
    finalidadeContainer.style.display = "none";

    document.querySelector('.iniciar').onclick = () => atualizarStatus(denuncia.id, 'em_analise');
    document.querySelector('.contato').onclick = () => window.location.href = `tel:${denuncia.telefone || ''}`;
    document.querySelector('.finalizar').onclick = () => {
        finalidadeContainer.style.display = 'block';

        const botaoSalvarExistente = document.getElementById("botao-salvar-final");
        if(botaoSalvarExistente) botaoSalvarExistente.remove();

        const botaoSalvar = document.createElement('button');
        botaoSalvar.innerText = "Salvar Finalização";
        botaoSalvar.className = "salvar-finalizacao"; // Adicionando uma classe para estilização
        botaoSalvar.id = "botao-salvar-final";

        finalidadeContainer.appendChild(botaoSalvar);

        botaoSalvar.onclick = () => {
            const finalidade = finalidadeInput.value.trim();
            if(finalidade === "") {
                alert("Informe a finalidade do caso antes de finalizar.");
                return;
            }
            atualizarStatus(denuncia.id, 'finalizado', finalidade);
            finalidadeContainer.style.display = 'none';
        };
    };

    modal.style.display = "block";
}

// ATENÇÃO: Esta função depende de um arquivo 'atualizarstatus.php' no seu servidor.
async function atualizarStatus(id, novoStatus, finalidade="") {
    // Esta parte do código assume que você está atualizando o status via um servidor PHP.
    // Se você quiser atualizar diretamente no Firebase, a lógica aqui seria diferente.
    alert(`Status seria atualizado para: ${novoStatus}\nIsso requer um backend (PHP) para funcionar.`);
    // O código original que usa PHP é mantido abaixo, mas provavelmente não funcionará sem o backend.
    
    /*
    const formData = new FormData();
    formData.append("id", id);
    formData.append("status", novoStatus);
    if(finalidade) formData.append("finalidade", finalidade);

    const res = await fetch('atualizarstatus.php', { method: 'POST', body: formData });
    const data = await res.json();

    if(res.ok && data.sucesso) {
        // Recarrega a página do dashboard para ver a mudança
        window.location.href = 'index.html'; 
    } else {
        alert("Erro ao atualizar status!");
    }
    */
}