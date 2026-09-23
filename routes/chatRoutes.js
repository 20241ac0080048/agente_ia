const express = require('express');
const router = express.Router();
const multer = require('multer');

const chatController = require('../controllers/chatController');
const documentController = require('../controllers/documentController');

// Multer configurado em memória (atende Sprint 6: nunca salvar em disco)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // limite de 10MB
});

// Rotas de Chat Comum
router.post('/', chatController.conversar);
router.delete('/limpar', chatController.limparHistorico);

// Rota de RAG (Conversar com Documento)
router.post('/documento', upload.single('documento'), documentController.perguntarDocumento);

module.exports = router;