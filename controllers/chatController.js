const { GoogleGenerativeAI } = require("@google/generative-ai");
const Mensagem = require('../models/Mensagem');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Função da ferramenta de Clima
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

// Declaração da Tool
const declaracaoClima = {
    name: "buscarClimaTempoReal",
    description: "Obtém a temperatura e clima de uma cidade. Use sempre que o usuário perguntar de tempo ou temperatura.",
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

        // Salva a mensagem do usuário no banco
        await Mensagem.create({ usuarioId, remetente: 'user', texto: pergunta });

        // Inicializa Gemini com Ferramenta
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            tools: [{ functionDeclarations: [declaracaoClima] }]
        });

        const chat = model.startChat();
        const promptYoda = `Você é o Mestre Yoda de Star Wars. Fale no estilo do Mestre Yoda. Pergunta do usuário: ${pergunta}`;
        
        let result = await chat.sendMessage(promptYoda);
        let response = result.response;

        // Loop de Function Calling
        const call = response.functionCalls()?.[0];
        let respostaFinalTexto = "";

        if (call && call.name === "buscarClimaTempoReal") {
            const dadosClima = await buscarClimaTempoReal(call.args.cidade);
            const result2 = await chat.sendMessage([{
                functionResponse: {
                    name: "buscarClimaTempoReal",
                    response: { content: dadosClima }
                }
            }]);
            respostaFinalTexto = result2.response.text();
        } else {
            respostaFinalTexto = response.text();
        }

        // Salva a resposta do bot no banco
        await Mensagem.create({ usuarioId, remetente: 'bot', texto: respostaFinalTexto });

        res.json({ resposta: respostaFinalTexto });
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