// Arquivo responsável por realizar chamadas à API no Firebase
async function atualizarStatusAPI(id, novoStatus, finalidade="") {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("status", novoStatus);
    if(finalidade) formData.append("finalidade", finalidade);

    const res = await fetch('atualizarstatus.php', { method: 'POST', body: formData });
    return res.json();
}
