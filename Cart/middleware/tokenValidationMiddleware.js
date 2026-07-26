const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const logger = require("../config/logger");
require("dotenv").config();

const validateToken = asyncHandler(async (req, res, next) => {
    let token;
    let authHeader = req.headers.Authorization || req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer")) {
        token = authHeader.split(" ")[1];
        jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
            if (err) {
                logger.warn({ err: err.message }, 'JWT verification failed');
                return res.status(401).json({ error: 'Unauthorized', message: "User is not authorized" });
            }
            req.user = decoded.user;
            next();
        });
    } else {
        logger.warn('No token provided in request');
        return res.status(401).json({ error: 'Unauthorized', message: "No token provided" });
    }
});

module.exports = validateToken;
