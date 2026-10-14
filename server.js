require('dotenv').config();
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
const auth = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Configuração do Socket.io com CORS liberado
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'chat_frontend')));

// --- ROTA DE HEALTH CHECK (Sprint 5) ---
app.get('/api/health', (req, res) => {
    const estadoConexao = mongoose.connection.readyState;
    res.status(200).json({
        status: 'ok',
        bancoDeDados: estadoConexao === 1 ? 'conectado' : 'desconectado',
        timestamp: new Date().toISOString()
    });
});

// Rotas HTTP existentes
app.use('/api/auth', authRoutes);
app.use('/api/chat', auth, chatRoutes);

// Fallback para o front-end
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'chat_frontend', 'index.html'));
});

// ==========================================
// ⚡ WEBSOCKETS (SOCKET.IO) - SPRINT 7
// ==========================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
let usuariosOnline = 0;

// 🔒 SEGURANÇA NO SOCKET: Middleware de Autenticação JWT
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        return next(new Error('Acesso negado: Token não fornecido no WebSocket.'));
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.usuario = payload; // Guarda dados do usuário (id, email) no socket
        next();
    } catch (err) {
        return next(new Error('Acesso negado: Token inválido ou expirado.'));
    }
});

io.on('connection', (socket) => {
    usuariosOnline++;
    // Avisa a todos o novo total de usuários online (Desafio Hacker)
    io.emit('usuariosOnline', usuariosOnline);

    console.log(`🟢 [Socket] ${socket.usuario.email} conectado (${socket.id}) | Online: ${usuariosOnline}`);

    // DESAFIO HACKER: Indicador de Digitação
    socket.on('digitando', (isDigitando) => {
        socket.broadcast.emit('usuarioDigitando', {
            email: socket.usuario.email,
            digitando: isDigitando
        });
    });

    // ESCUTA DE MENSAGENS EM TEMPO REAL
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

        // 1. BROADCAST: Envia a mensagem do usuário para TODOS na sala
        io.emit('mensagemRecebida', mensagemUsuario);

        // 2. GATILHO DA IA: Se contiver @gemini, a IA modera/responde
        if (texto.toLowerCase().includes('@gemini')) {
            // Emite aviso de que o Gemini está digitando
            io.emit('usuarioDigitando', { email: '🤖 Moderador Gemini', digitando: true });

            try {
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                
                const promptModerador = `
Você é o "🤖 Moderador Gemini" em uma sala de bate-papo pública em tempo real.
O usuário "${socket.usuario.email}" mencionou você com a mensagem: "${texto}".

Instruções:
- Seja conciso, amigável e direto (máximo de 2 a 3 frases).
- Se houver linguagem inadequada ou ofensiva, modere com respeito e postura.
- Responda em português.
`;

                const result = await model.generateContent(promptModerador);
                const respostaIA = result.response.text();

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
                console.error("Erro na resposta do Gemini via Socket:", err);
                io.emit('usuarioDigitando', { email: '🤖 Moderador Gemini', digitando: false });
                io.emit('mensagemRecebida', {
                    id: Date.now().toString(),
                    autor: '🤖 Moderador Gemini',
                    tipo: 'bot',
                    texto: 'Tive uma oscilação na minha conexão quântica. Tente me chamar novamente!',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            }
        }
    });

    socket.on('disconnect', () => {
        usuariosOnline = Math.max(0, usuariosOnline - 1);
        io.emit('usuariosOnline', usuariosOnline);
        socket.broadcast.emit('usuarioDigitando', { email: socket.usuario.email, digitando: false });
        console.log(`🔴 [Socket] ${socket.usuario.email} desconectado | Online: ${usuariosOnline}`);
    });
});

// Conexão com MongoDB
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("✅ Conectado ao MongoDB"))
        .catch(err => console.error("❌ Erro ao conectar ao MongoDB:", err.message));
}

// ⚠️ ATENÇÃO: Usar server.listen (e NÃO app.listen) para o Socket.io funcionar!
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor Real-Time rodando na porta ${PORT}`));