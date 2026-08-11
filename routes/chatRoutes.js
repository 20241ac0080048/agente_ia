const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/', chatController.conversar);
router.delete('/limpar', chatController.limparHistorico);

module.exports = router;