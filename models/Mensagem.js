const mongoose = require('mongoose');

const MensagemSchema = new mongoose.Schema({
    role: { type: String, required: true },
    parts: [{ text: { type: String, required: true }, _id: false }]
});

module.exports = mongoose.model('Mensagem', MensagemSchema);