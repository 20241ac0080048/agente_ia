const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    senha: { type: String, required: true },
    role: { type: String, default: "user" } // [REQ-001] RBAC
}, { timestamps: true });

module.exports = mongoose.model('Usuario', UsuarioSchema);