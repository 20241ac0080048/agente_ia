const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

exports.cadastrar = async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
        }

        const existe = await Usuario.findOne({ email: email.toLowerCase() });
        if (existe) {
            return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        const novoUsuario = new Usuario({ email, senha: senhaHash });
        await novoUsuario.save();

        res.status(201).json({ msg: 'Usuário cadastrado com sucesso!' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
        }

        const usuario = await Usuario.findOne({ email: email.toLowerCase() });
        if (!usuario) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        const token = jwt.sign(
            { id: usuario._id, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        res.json({ token, email: usuario.email });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao realizar login.' });
    }
};