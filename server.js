require('dotenv').config();

// Forçar DNS Público para o MongoDB
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const auth = require('./middleware/auth');
const Mensagem = require('./models/Mensagem');

const app = express();
// ... segue o restante normal do arquivo
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'chat_frontend')));

// Health Check (Sprint 5)
app.get('/api/health', (req, res) => {
    const estadoConexao = mongoose.connection.readyState;
    res.status(200).json({
        status: 'ok',
        bancoDeDados: estadoConexao === 1 ? 'conectado' : 'desconectado',
        timestamp: new Date().toISOString()
    });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/chat', auth, chatRoutes);
app.use('/api/analytics', analyticsRoutes); // [REQ-006] Registrada aqui!

// Rota direta para o Dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat_frontend', 'dashboard.html'));
});

// Fallback SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'chat_frontend', 'index.html'));
});

// ==========================================
// ⚡ WEBSOCKETS (SOCKET.IO) COM TELEMETRIA
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let usuariosOnline = 0;

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Acesso negado: Token não fornecido.'));

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.usuario = payload;
        next();
    } catch (err) {
        next(new Error('Acesso negado: Token inválido.'));
    }
});

io.on('connection', (socket) => {
    usuariosOnline++;
    io.emit('usuariosOnline', usuariosOnline);

    socket.on('digitando', (isDigitando) => {
        socket.broadcast.emit('usuarioDigitando', {
            email: socket.usuario.email,
            digitando: isDigitando
        });
    });

    socket.on('novaMensagem', async (dados) => {
        const texto = dados?.texto?.trim();
        if (!texto) return;

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const mensagemUsuario = {
            id: Date.now().toString(),
            autor: socket.usuario.email,
            tipo: 'user',
            texto: texto,
            timestamp: timestamp
        };

        io.emit('mensagemRecebida', mensagemUsuario);

        // Registra mensagem humana no Mongo
        try {
            await Mensagem.create({
                usuarioId: socket.usuario.id,
                remetente: 'user',
                texto: texto,
                tokensGastos: 0
            });
        } catch (e) {
            console.error("Erro ao salvar mensagem do usuário:", e);
        }

        // Gatilho do Moderador Gemini
        if (texto.toLowerCase().includes('@gemini')) {
            io.emit('usuarioDigitando', { email: '🤖 Moderador Gemini', digitando: true });

            try {
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                const prompt = `Você é o Moderador Gemini no chat em tempo real. Usuário ${socket.usuario.email} disse: "${texto}". Responda em no máximo 2 frases curtas e objetivas em português.`;

                const result = await model.generateContent(prompt);
                const respostaIA = result.response.text();

                // [REQ-004] Captura de tokens no WebSocket
                const tokensGastos = result.response.usageMetadata?.totalTokenCount || 0;

                // [REQ-004] Salva no Mongo com telemetria
                await Mensagem.create({
                    usuarioId: socket.usuario.id,
                    remetente: 'bot',
                    texto: respostaIA,
                    tokensGastos: tokensGastos
                });

                // 🚀 DESAFIO HACKER: Emite o evento em tempo real para o Dashboard!
                io.emit('novoGastoDeToken', {
                    tokens: tokensGastos,
                    autor: socket.usuario.email,
                    timestamp: timestamp
                });

                const mensagemBot = {
                    id: (Date.now() + 1).toString(),
                    autor: '🤖 Moderador Gemini',
                    tipo: 'bot',
                    texto: respostaIA,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };

                io.emit('usuarioDigitando', { email: '🤖 Moderador Gemini', digitando: false });
                io.emit('mensagemRecebida', mensagemBot);
            } catch (err) {
                console.error("Erro no Gemini Socket:", err);
                io.emit('usuarioDigitando', { email: '🤖 Moderador Gemini', digitando: false });
            }
        }
    });

    socket.on('disconnect', () => {
        usuariosOnline = Math.max(0, usuariosOnline - 1);
        io.emit('usuariosOnline', usuariosOnline);
    });
});

if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("✅ Conectado ao MongoDB"))
        .catch(err => console.error("❌ Erro ao conectar ao MongoDB:", err.message));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));