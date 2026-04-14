require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(cors()); // Necessário para o seu Front-end conversar com o Back-end

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// A ROTA QUE O FRONT-END VAI CHAMAR
app.post('/api/chat', async (req, res) => {
    try {
        // Usa o prompt que você definiu, mas agora recebe a pergunta do Body
        const { pergunta } = req.body;
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Aja como o Mestre Yoda de Star Wars. Explique: ${pergunta}`;

        const result = await model.generateContent(prompt);
        const resposta = result.response.text();

        res.json({ resposta: resposta });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// A NUVEM ESCOLHE A PORTA
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`🚀 Servidor rodando na porta ${PORTA}`);
});