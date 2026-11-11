const express = require('express');
const router = express.Router();
const Mensagem = require('../models/Mensagem');
const Usuario = require('../models/Usuario');

// Middlewares exigidos
const autenticarToken = require('../middleware/auth');
const apenasAdmin = require('../middlewares/apenasAdmin');

// [REQ-006] Rota GET /tokens com proteção em camada dupla
router.get('/tokens', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        // [REQ-005] Otimização estrita com MongoDB Aggregation Pipeline
        const resultadoAgregacao = await Mensagem.aggregate([
            {
                $group: {
                    _id: null,
                    totalTokensGastos: { $sum: "$tokensGastos" },
                    totalMensagens: { $sum: 1 }
                }
            }
        ]);

        // Agregação diária para desenhar o gráfico com dados históricos
        const historicoPorDia = await Mensagem.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$criadoEm" } },
                    tokensNoDia: { $sum: "$tokensGastos" },
                    mensagensNoDia: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const totalUsuarios = await Usuario.countDocuments();

        const totais = resultadoAgregacao[0] || { totalTokensGastos: 0, totalMensagens: 0 };

        res.json({
            totalTokens: totais.totalTokensGastos,
            totalMensagens: totais.totalMensagens,
            totalUsuarios: totalUsuarios,
            historico: historicoPorDia
        });
    } catch (erro) {
        console.error("Erro no aggregation pipeline:", erro);
        res.status(500).json({ erro: "Falha ao processar métricas do aggregation pipeline." });
    }
});

module.exports = router;