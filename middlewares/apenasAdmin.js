// [REQ-002] Middleware RBAC: Apenas Admin
module.exports = function apenasAdmin(req, res, next) {
    if (req.usuario && req.usuario.role === "admin") {
        return next();
    }
    // Bloqueia obrigatoriamente com HTTP Status 403 (Forbidden)
    return res.status(403).json({ 
        erro: "Acesso negado: Esta rota é restrita a administradores." 
    });
};