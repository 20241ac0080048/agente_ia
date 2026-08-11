const { GoogleGenerativeAI } = require("@google/generative-ai");
const Mensagem = require("../models/Mensagem");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.conversar = async (req, res) => {
    try {
        const { pergunta } = req.body;

        // 1. Pega o histórico e transforma em texto puro para o Google não reclamar
        const historicoBanco = await Mensagem.find().limit(10).lean();
        const history = historicoBanco.map(m => ({
            role: m.role === "model" ? "model" : "user",
            parts: [{ text: String(m.parts[0].text) }]
        }));

        // 2. Usa o modelo padrão. Se gemini-1.5-flash der 404, usaremos o nome completo.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 3. Monta a pergunta com o Yoda
        const promptYoda = `Aja como o Mestre Yoda. Responda em Português: ${pergunta}`;
        
        // 4. Envia direto (Sem ferramentas de clima por enquanto, para não dar erro!)
        const result = await model.generateContent({
            contents: [...history, { role: "user", parts: [{ text: promptYoda }] }]
        });

        const textoIA = result.response.text();

        // 5. Salva no banco
        await new Mensagem({ role: "user", parts: [{ text: pergunta }] }).save();
        await new Mensagem({ role: "model", parts: [{ text: textoIA }] }).save();

        res.json({ resposta: textoIA });

    } catch (erro) {
        console.error(erro);
        res.status(500).json({ resposta: "Erro: " + erro.message });
    }
};

exports.limparHistorico = async (req, res) => {
    await Mensagem.deleteMany({});
    res.json({ msg: "Limpo!" });
};