require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const auth = require('./middleware/auth');

const app = express();

app.use(express.json());
app.use(cors());

// Serve os arquivos do Front-end
app.use(express.static(path.join(__dirname, 'chat_frontend')));

// --- ROTA PÚBLICA DE AUDITORIA: HEALTH CHECK (Sprint 5) ---
app.get('/api/health', (req, res) => {
    const estadoConexao = mongoose.connection.readyState; 
    // 1 = Conectado, 0 = Desconectado, 2 = Conectando, 3 = Desconectando
    res.status(200).json({
        status: 'ok',
        bancoDeDados: estadoConexao === 1 ? 'conectado' : 'desconectado',
        timestamp: new Date().toISOString()
    });
});

// Rotas Públicas (Auth)
app.use('/api/auth', authRoutes);

// Rotas Protegidas por JWT (Chat e RAG)
app.use('/api/chat', auth, chatRoutes);

// Fallback para o Frontend
// Fallback para o Frontend (compatível com Express 5)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'chat_frontend', 'index.html'));
});

// Conexão com o Banco de Dados
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("✅ Conectado ao MongoDB com sucesso!"))
        .catch(err => console.error("❌ Erro ao conectar ao MongoDB:", err.message));
} else {
    console.warn("⚠️ MONGO_URI não configurado no .env");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando com sucesso na porta ${PORT}`));