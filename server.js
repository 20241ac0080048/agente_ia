require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'chat_frontend')));

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'agente',
        timestamp: new Date().toISOString()
    });
});

// Conexão com o Banco de Dados
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado ao MongoDB"))
    .catch(err => console.error("❌ Erro ao conectar ao MongoDB:", err));

// Rotas
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat_frontend', 'index.html'));
});

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => console.log(`🚀 Servidor rodando na porta ${PORTA}`));