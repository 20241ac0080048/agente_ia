const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.perguntarDocumento = async (req, res) => {
    try {
        const { pergunta } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ erro: "Nenhum arquivo enviado. Por favor, anexe um PDF." });
        }
        if (!pergunta) {
            return res.status(400).json({ erro: "Por favor, digite uma pergunta sobre o documento." });
        }

        // Extrai texto do arquivo direto da memória RAM (sem salvar em disco)
        let textoExtraido = "";
        if (file.mimetype === "application/pdf") {
            const dataPdf = await pdfParse(file.buffer);
            textoExtraido = dataPdf.text;
        } else {
            textoExtraido = file.buffer.toString('utf-8');
        }

        if (!textoExtraido.trim()) {
            return res.status(400).json({ erro: "O documento enviado está vazio ou não contém texto legível." });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Prompt Anti-Alucinação estrito (Regra de Ouro do RAG)
        const promptRAG = `
Você é um Analista Corporativo especialista em extração de informações.
Responda à pergunta do usuário utilizando ESTRITAMENTE o CONTEÚDO DO DOCUMENTO fornecido abaixo.

REGRAS:
1. Nunca invente, deduza ou use conhecimentos externos.
2. Se a resposta NÃO estiver explicita no documento, responda exatamente: "Não encontrei essa informação no documento fornecido."

--- CONTEÚDO DO DOCUMENTO ---
${textoExtraido}
----------------------------

Pergunta do Usuário: ${pergunta}
`;

        const resultado = await model.generateContent(promptRAG);
        const respostaFinal = resultado.response.text();

        res.json({ resposta: respostaFinal });
    } catch (erro) {
        console.error("Erro no RAG:", erro);
        res.status(500).json({ erro: "Erro ao processar documento: " + erro.message });
    }
};