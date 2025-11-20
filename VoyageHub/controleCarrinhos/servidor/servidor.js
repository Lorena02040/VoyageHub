import express from "express";
import admin from "firebase-admin";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import serviceAccount from "./firebaseConfig.json" with { type: "json" };

const DATABASE_URL = "https://piteste-188ec-default-rtdb.firebaseio.com";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: DATABASE_URL,
});

const db = admin.database();
const app = express();
app.use(cors());
app.use(express.json());
const PORT = 3000;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Set();

// --- LÓGICA DO WEBSOCKET ---
wss.on("connection", (ws) => {
  console.log("Cliente (painel) conectado ao WebSocket.");
  clients.add(ws);
  ws.on("close", () => {
    console.log("Cliente desconectado.");
    clients.delete(ws);
  });
});

function broadcastAlert(alerta) {
  const data = JSON.stringify(alerta);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

// --- 1. MONITORAMENTO DE SENSORES (BEACONS) ---
const monitorarCarrinhos = () => {
  const carrinhosRef = db.ref("carrinho");

  const handleCartChange = (snapshot) => {
    const data = snapshot.val();
    const id = snapshot.key;
    if (!data) return;
    const contador = data.contador;
    const status = data.status;

    if (contador % 2 !== 0 && status !== "alerta_enviado") {
      console.log(`🛒 Carrinho ${id} - contador ímpar. Iniciando timer...`);
      setTimeout(async () => {
        try {
          const docSnapshot = await db.ref(`carrinho/${id}`).get();
          const docData = docSnapshot.val();
          if (docData && docData.status !== "retornou") {
            const saida = docData.ultima_saida || "A";
            console.log(`⚠️ Carrinho ${id} não retornou pela saída ${saida}. Enviando alerta...`);

            // Envia para o WebSocket (Avisa o Frontend)
            broadcastAlert({
              tipo: "ALERTA_CARRINHO",
              carrinhoId: id,
              saida: saida,
            });

            // Salva no histórico
            await db.ref("alertas").push({
              carrinhoId: id,
              mensagem: `Carrinho ${id} passou pela saída ${saida} e não retornou.`,
              hora: new Date().toISOString(),
              saida: saida,
            });

            await db.ref(`carrinho/${id}`).update({ status: "alerta_enviado" });
          } else {
            console.log(`✅ Carrinho ${id} retornou dentro do tempo.`);
          }
        } catch (error) {
          console.error("Erro no timer:", error);
        }
      }, 25000);
    } else if (contador % 2 === 0) {
      console.log(`🟢 Carrinho ${id} - contador par. Retornou à rodoviária.`);
      if (status === "alerta_enviado") {
        db.ref(`carrinho/${id}`).update({ status: "retornou" });
      }
    }
  };

  carrinhosRef.on("child_added", handleCartChange);
  carrinhosRef.on("child_changed", handleCartChange);
  console.log("Monitorando Realtime Database (carrinho)...");
};

// --- 2. NOVO: MONITORAMENTO DA IA (CÂMERA) ---
const monitorarCarrinhosIA = () => {
  const iaRef = db.ref("carrinho_IA");

  // Escuta quando um NOVO registro de IA é adicionado
  iaRef.on("child_added", async (snapshot) => {
    const data = snapshot.val();
    
    // Verificação básica para evitar erros se o nó estiver vazio ou antigo
    if (!data) return; 
    
    // Opcional: Lógica para ignorar dados muito antigos (ex: mais de 1 min atrás)
    // const timeDiff = new Date() - new Date(data.timestamp);
    // if (timeDiff > 60000) return;

    console.log(`📷 NOVA DETECÇÃO IA: ${snapshot.key}`);

    // Estrutura que o seu Frontend espera para o Popup
    const alertaIA = {
      tipo: "carrinho_IA",
      carrinhoId: data.carrinhoId || "Desconhecido",
      imagem: data.imagem || "", // URL ou Base64 vindo do Python/IA
      x: data.x || 50,           // Posição X (%) do marcador
      y: data.y || 50,           // Posição Y (%) do marcador
      local: data.local || "Câmera IA"
    };

    // 1. Envia imediatamente para o WebSocket (Abre o Popup na tela)
    broadcastAlert(alertaIA);

    // 2. Salva também na tabela de "Histórico de Alertas"
    // Assim fica registrado mesmo depois de fechar o popup
    try {
        await db.ref("alertas").push({
            carrinhoId: alertaIA.carrinhoId,
            mensagem: "Detectado por IA (Local Proibido)",
            hora: new Date().toISOString(),
            saida: alertaIA.local
        });
    } catch (error) {
        console.error("Erro ao salvar histórico IA:", error);
    }
  });

  console.log("Monitorando Realtime Database (carrinho_IA)...");
};

// --- INICIALIZA OS MONITORES ---
monitorarCarrinhos();     // Sensores Físicos
monitorarCarrinhosIA();   // Câmera IA


// --- ENDPOINTS DA API ---

app.get("/alertas", async (req, res) => {
  try {
    const alertasRef = db.ref("alertas");
    const snapshot = await alertasRef.get();
    const alertas = [];

    if (snapshot.exists()) {
      snapshot.forEach(child => {
        alertas.push({ id: child.key, ...child.val() });
      });
      alertas.sort((a, b) => new Date(b.hora) - new Date(a.hora));
    }

    res.json(alertas);
  } catch (error) {
    console.error("ERRO no endpoint /alertas:", error);
    res.status(500).json({ error: "Erro ao buscar alertas" });
  }
});

app.get("/carrinhos", async (req, res) => {
  try {
    const snapshot = await db.ref("carrinho").get();
    if (snapshot.exists()) {
      const carrinhosObj = snapshot.val();
      const carrinhosArray = Object.keys(carrinhosObj).map(key => ({
        id: key,
        ...carrinhosObj[key]
      }));
      res.json(carrinhosArray);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error("Erro ao buscar carrinhos:", error);
    res.status(500).json({ error: "Erro ao buscar carrinhos" });
  }
});

app.post("/carrinho/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Novo status é obrigatório" });
    }

    const carrinhoRef = db.ref(`carrinho/${id}`);
    await carrinhoRef.update({ status: status });

    console.log(`Status do carrinho ${id} atualizado para: ${status}`);
    res.status(200).json({ success: true, message: `Status atualizado.` });

  } catch (error) {
    console.error("Erro ao atualizar status:", error);
    res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

server.listen(PORT, () => console.log(`🚀 Servidor e WebSocket rodando na porta ${PORT}`));