/**
 * requireRole(role) — middleware factory.
 * Must be placed AFTER validateToken so req.user is already set.
 */
const requireRole = (role) => (req, res, next) => {
    if (!req.user || req.user.role !== role) {
        return res.status(403).json({
            error: 'Forbidden',
            message: `Requires '${role}' role`
        });
    }
    next();
};

module.exports = requireRole;
