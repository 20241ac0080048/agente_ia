const { GoogleGenerativeAI } = require("@google/generative-ai");
const Mensagem = require('../models/Mensagem');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Ferramenta de clima
async function buscarClimaTempoReal(cidade) {
    const weatherKey = process.env.WEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&units=metric&lang=pt_br&appid=${weatherKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.cod !== 200) return { erro: "Cidade não encontrada" };
        return {
            temperatura: data.main.temp,
            descricao: data.weather[0].description,
            cidade: data.name
        };
    } catch (e) {
        return { erro: "Falha na conexão com a API de clima." };
    }
}

const declaracaoClima = {
    name: "buscarClimaTempoReal",
    description: "Obtém a temperatura e clima de uma cidade.",
    parameters: {
        type: "OBJECT",
        properties: {
            cidade: { type: "STRING", description: "O nome da cidade. Ex: Curitiba, Paris." }
        },
        required: ["cidade"]
    }
};

exports.conversar = async (req, res) => {
    try {
        const { pergunta } = req.body;
        const usuarioId = req.usuario.id;

        if (!pergunta) {
            return res.status(400).json({ erro: "Pergunta não informada." });
        }

        // Mensagem enviada pelo usuário (0 tokens gastos)
        await Mensagem.create({ usuarioId, remetente: 'user', texto: pergunta, tokensGastos: 0 });

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            tools: [{ functionDeclarations: [declaracaoClima] }]
        });

        const chat = model.startChat();
        const promptYoda = `Você é o Mestre Yoda de Star Wars. Fale no estilo do Mestre Yoda. Pergunta do usuário: ${pergunta}`;
        
        let result = await chat.sendMessage(promptYoda);
        let response = result.response;

        let respostaFinalTexto = "";
        let tokensTotais = 0;

        // [REQ-004] Captura de metadados da SDK
        tokensTotais += result.response.usageMetadata?.totalTokenCount || 0;

        const call = response.functionCalls()?.[0];

        if (call && call.name === "buscarClimaTempoReal") {
            const dadosClima = await buscarClimaTempoReal(call.args.cidade);
            const result2 = await chat.sendMessage([{
                functionResponse: {
                    name: "buscarClimaTempoReal",
                    response: { content: dadosClima }
                }
            }]);
            respostaFinalTexto = result2.response.text();
            // Acumula tokens da segunda volta do chat se houver function call
            tokensTotais += result2.response.usageMetadata?.totalTokenCount || 0;
        } else {
            respostaFinalTexto = response.text();
        }

        // [REQ-004] Persistência do custo em tokens no MongoDB
        await Mensagem.create({ 
            usuarioId, 
            remetente: 'bot', 
            texto: respostaFinalTexto,
            tokensGastos: tokensTotais 
        });

        res.json({ resposta: respostaFinalTexto, tokensGastos: tokensTotais });
    } catch (erro) {
        console.error("Erro no chat:", erro);
        res.status(500).json({ erro: "Erro ao processar mensagem com a IA." });
    }
};

exports.limparHistorico = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        await Mensagem.deleteMany({ usuarioId });
        res.json({ msg: "Memória limpa com sucesso!" });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao limpar histórico." });
    }
};