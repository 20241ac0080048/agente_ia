const mongoose = require('mongoose');

const MensagemSchema = new mongoose.Schema({
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    remetente: { type: String, enum: ['user', 'bot'], required: true },
    texto: { type: String, required: true },
    criadoEm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mensagem', MensagemSchema);